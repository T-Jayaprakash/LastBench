/**
 * Genfess / LastBench - Cloud Functions
 * Handles notifications for Likes, Comments, and Trending posts.
 */

const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const { onSchedule } = require("firebase-functions/v2/scheduler");

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

// Set global options for all functions
setGlobalOptions({ maxInstances: 10, region: "us-central1" });

/**
 * 1. LIKE NOTIFICATION
 * Trigger: When a document is created in `interactions` collection with type 'like'.
 * Logic: Notify the post owner.
 */
exports.onLikeCreated = onDocumentCreated("interactions/{interactionId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const interaction = snapshot.data();
  if (interaction.type !== "like") return;

  const { post_id, user_id, comment_id } = interaction;

  // We only care about Post Likes for now (comments handled separately if needed)
  if (comment_id) return;

  try {
    // Fetch the post to get the author
    const postRef = db.collection("posts").doc(post_id);
    const postSnap = await postRef.get();

    if (!postSnap.exists) {
      logger.warn(`Post ${post_id} not found for like notification.`);
      return;
    }

    const post = postSnap.data();
    const authorId = post.author_id;

    // Skip self-likes
    if (authorId === user_id) return;

    // Fetch Liker's profile (for display name/avatar)
    // Using 'profiles' table as per schema
    const profileRef = db.collection("profiles").where("user_id", "==", user_id).limit(1);
    const profileSnap = await profileRef.get();
    let likerName = "Someone";
    if (!profileSnap.empty) {
      const profile = profileSnap.docs[0].data();
      likerName = profile.display_name || "Someone";
    }

    // Create Notification Document
    const notificationData = {
      type: "like",
      actorUserId: user_id,
      postId: post_id,
      message: `${likerName} liked your post`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isRead: false,
    };

    // Add to Firestore (users/{userId}/notifications)
    await db.collection("users").doc(authorId).collection("notifications").add(notificationData);

    // Send Push Notification
    await sendPushNotification(authorId, {
      title: "New Like",
      body: notificationData.message,
      data: {
        type: "like",
        postId: post_id,
        actorUserId: user_id,
      },
    });
  } catch (error) {
    logger.error("Error sending like notification:", error);
  }
});

/**
 * 2. COMMENT NOTIFICATION
 * Trigger: When a document is created in `comments` collection.
 * Logic: Notify the post owner.
 */
exports.onCommentCreated = onDocumentCreated("comments/{commentId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const comment = snapshot.data();
  const { post_id, author_id: commenter_id, text } = comment;

  try {
    const postRef = db.collection("posts").doc(post_id);
    const postSnap = await postRef.get();

    if (!postSnap.exists) return;

    const post = postSnap.data();
    const postOwnerId = post.author_id;

    // Skip self-comments
    if (postOwnerId === commenter_id) return;

    // Fetch Commenter's profile
    const profileRef = db.collection("profiles").where("user_id", "==", commenter_id).limit(1);
    const profileSnap = await profileRef.get();
    let commenterName = "Someone";
    if (!profileSnap.empty) {
      const profile = profileSnap.docs[0].data();
      commenterName = profile.display_name || "Someone";
    }

    const notificationData = {
      type: "comment",
      actorUserId: commenter_id,
      postId: post_id,
      message: `${commenterName} commented: ${text.substring(0, 50)}${text.length > 50 ? "..." : ""}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isRead: false,
    };

    await db.collection("users").doc(postOwnerId).collection("notifications").add(notificationData);

    await sendPushNotification(postOwnerId, {
      title: "New Comment",
      body: notificationData.message,
      data: {
        type: "comment",
        postId: post_id,
        actorUserId: commenter_id,
      },
    });
  } catch (error) {
    logger.error("Error sending comment notification:", error);
  }
});

/**
 * 3. TRENDING NOTIFICATION
 * Trigger: When post likes count updates.
 * Logic: If likes > 10, 50, 100, etc., notify owner.
 */
const TRENDING_THRESHOLDS = [10, 50, 100, 500, 1000];

exports.checkTrending = onDocumentUpdated("posts/{postId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  // Check if likes increased
  if (after.likes_count <= before.likes_count) return;

  const currentLikes = after.likes_count;
  const authorId = after.author_id;

  // Check thresholds
  const crossedThreshold = TRENDING_THRESHOLDS.find((t) => before.likes_count < t && currentLikes >= t);

  if (crossedThreshold) {
    try {
      const notificationData = {
        type: "trending",
        actorUserId: "system",
        postId: event.params.postId,
        message: `🔥 Your post is trending! It just hit ${crossedThreshold} likes.`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isRead: false,
      };

      await db.collection("users").doc(authorId).collection("notifications").add(notificationData);

      await sendPushNotification(authorId, {
        title: "Trending Post! 🔥",
        body: notificationData.message,
        data: {
          type: "trending",
          postId: event.params.postId,
        },
      });
    } catch (error) {
      logger.error("Error sending trending notification:", error);
    }
  }
});


/**
 * HELPER: Send Push Notification via FCM
 */
async function sendPushNotification(userId, payload) {
  try {
    // Fetch user's FCM tokens from Firestore
    // Path: users/{userId}/fcmTokens/{token}
    const tokensRef = db.collection("users").doc(userId).collection("fcmTokens");
    const tokensSnap = await tokensRef.get();

    if (tokensSnap.empty) {
      logger.info(`No FCM tokens found for user ${userId}`);
      return;
    }

    const tokens = tokensSnap.docs.map((doc) => doc.id);

    // Payload for Web Push and Mobile
    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        ...payload.data,
        click_action: "/", // Web click action fallback
      },
      tokens: tokens,
    };

    const response = await messaging.sendEachForMulticast(message);

    // Cleanup invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          if (error.code === "messaging/invalid-registration-token" ||
            error.code === "messaging/registration-token-not-registered") {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        const batch = db.batch();
        invalidTokens.forEach((t) => {
          const ref = tokensRef.doc(t);
          batch.delete(ref);
        });
        await batch.commit();
        logger.info(`Removed ${invalidTokens.length} invalid tokens for user ${userId}`);
      }
    }
  } catch (error) {
    logger.error(`Error sending push to user ${userId}:`, error);
  }
}

/**
 * 4. WELCOME NOTIFICATION
 * Trigger: When a new FCM token is registered (users/{userId}/fcmTokens/{tokenId}).
 * Logic: Check if it's a new user (or just send welcome if first token).
 */
exports.onNewTokenRegistered = onDocumentCreated("users/{userId}/fcmTokens/{tokenId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const { userId } = event.params;

  try {
    // Check if we already welcomed this user
    // We'll store a simple flag document
    const welcomeRef = db.collection("users").doc(userId).collection("system").doc("welcome_sent");
    const welcomeSnap = await welcomeRef.get();

    if (welcomeSnap.exists) {
      return; // Already welcomed
    }

    // Mark as welcomed immediately to prevent race conditions
    await welcomeRef.set({ sentAt: admin.firestore.FieldValue.serverTimestamp() });

    const message = "Hii , I am Jayaprakash founder of Genfess , welcoming you to our anonoymous community, go talk freely";

    // Create Notification
    const notificationData = {
      type: "system",
      actorUserId: "system",
      message: message,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isRead: false,
    };

    await db.collection("users").doc(userId).collection("notifications").add(notificationData);

    // Send Push
    await sendPushNotification(userId, {
      title: "Welcome to Genfess! 🎉",
      body: message,
      data: {
        type: "system",
      },
    });

    logger.info(`Welcome notification sent to ${userId}`);
  } catch (error) {
    logger.error("Error sending welcome notification:", error);
  }
});

/**
 * 5. PEAK TIME ENGAGEMENT
 * Trigger: Scheduled every day at 7:00 PM (Asia/Kolkata time approx).
 * Logic: Send a generic "Check out what's happening" message to all users.
 */
exports.scheduledPeakNotification = onSchedule({
  schedule: "0 19 * * *", // 7 PM daily
  timeZone: "Asia/Kolkata",
  retryConfig: { retryCount: 1 }, // Basic retry
}, async (event) => {
  try {
    // Fetch all tokens from all users using Collection Group Query
    const tokensSnap = await db.collectionGroup("fcmTokens").get();

    if (tokensSnap.empty) {
      logger.info("No users to notify.");
      return;
    }

    const tokens = tokensSnap.docs.map((doc) => doc.id); // The doc ID is the token itself in our schema
    const validTokens = [...new Set(tokens)]; // Remove duplicates just in case

    // Messages rotation
    const messages = [
      "🔥 Campus is buzzing! See the latest confessions.",
      "👀 Someone just posted about your department...",
      "🤫 The tea is hot today. Check Genfess now!",
      "🌙 Late night thoughts? Share them anonymously.",
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    const payload = {
      notification: {
        title: "Genfess Update 🔔",
        body: randomMessage,
      },
      data: {
        click_action: "/",
      },
      tokens: validTokens,
    };

    // Send in batches of 500 (FCM limit)
    const BATCH_SIZE = 500;
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < validTokens.length; i += BATCH_SIZE) {
      const batchTokens = validTokens.slice(i, i + BATCH_SIZE);
      const batchPayload = { ...payload, tokens: batchTokens };

      const response = await messaging.sendEachForMulticast(batchPayload);
      successCount += response.successCount;
      failureCount += response.failureCount;
    }

    logger.info(`Peak notification sent. Success: ${successCount}, Failed: ${failureCount}`);
  } catch (error) {
    logger.error("Error in scheduledPeakNotification:", error);
  }
});

/**
 * 6. PROFILE UPDATE PROPAGATION
 * Trigger: When a user profile is updated.
 * Logic: Update author details in all their posts and comments.
 */
exports.onUserProfileUpdate = onDocumentUpdated("profiles/{userId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  // Check if relevant fields changed
  if (
    before.display_name === after.display_name &&
    before.avatar_color === after.avatar_color &&
    before.avatar_url === after.avatar_url &&
    before.department === after.department
  ) {
    return;
  }

  const userId = event.params.userId;
  const updates = {
    display_name: after.display_name,
    avatar_color: after.avatar_color,
    avatar_url: after.avatar_url || null,
  };

  logger.info(`Propagating profile update for user ${userId}`);

  try {
    const batchSize = 400; // Batch limit is 500
    const postsRef = db.collection("posts");
    const commentsRef = db.collection("comments");

    // 1. Update Posts
    const postsQuery = postsRef.where("author_id", "==", userId);
    const postsSnap = await postsQuery.get();

    if (!postsSnap.empty) {
      const batches = [];
      let currentBatch = db.batch();
      let count = 0;

      postsSnap.docs.forEach((doc) => {
        currentBatch.update(doc.ref, updates);
        count++;
        if (count >= batchSize) {
          batches.push(currentBatch.commit());
          currentBatch = db.batch();
          count = 0;
        }
      });
      if (count > 0) batches.push(currentBatch.commit());

      await Promise.all(batches);
      logger.info(`Updated ${postsSnap.size} posts for user ${userId}`);
    }

    // 2. Update Comments
    const commentsQuery = commentsRef.where("author_id", "==", userId);
    const commentsSnap = await commentsQuery.get();

    if (!commentsSnap.empty) {
      const batches = [];
      let currentBatch = db.batch();
      let count = 0;

      commentsSnap.docs.forEach((doc) => {
        currentBatch.update(doc.ref, updates);
        count++;
        if (count >= batchSize) {
          batches.push(currentBatch.commit());
          currentBatch = db.batch();
          count = 0;
        }
      });
      if (count > 0) batches.push(currentBatch.commit());

      await Promise.all(batches);
      logger.info(`Updated ${commentsSnap.size} comments for user ${userId}`);
    }

  } catch (error) {
    logger.error("Error propagating profile update:", error);
  }
});
