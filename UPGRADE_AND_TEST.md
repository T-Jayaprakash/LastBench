# 🚀 Firebase Blaze Upgrade & Complete Testing Guide

## Project: GenFess (LastBench)
**Date:** February 4, 2026  
**Status:** Ready for Blaze Upgrade & Testing

---

## 📋 STEP-BY-STEP UPGRADE PROCESS

### ✅ Step 1: Upgrade to Blaze Plan (5 minutes)

1. **Open Firebase Console:**
   ```
   https://console.firebase.google.com/project/genfess-ac0e8
   ```

2. **Click "Upgrade" button** (top-right corner or left sidebar)

3. **Select Blaze Plan** (Pay as you go)

4. **Set Up Billing:**
   - Link existing Google Cloud Billing account OR
   - Create new billing account:
     - Account type: Individual
     - Payment method: Credit/Debit card
     - Enter billing address
     - Click "Submit and enable billing"

5. **Set Budget Alerts (HIGHLY RECOMMENDED):**
   - Go to: Usage and billing → Details & Settings
   - Click "Manage in Google Cloud Console"
   - Navigate to "Budgets & alerts"
   - Create budget:
     - Amount: $10/month (adjust as needed)
     - Alerts: 50%, 90%, 100%
     - Email: Your email
   - Save

6. **Verify Upgrade:**
   - Check that plan shows "Blaze" instead of "Spark"
   - ✅ You're now ready to deploy Cloud Functions!

---

### ✅ Step 2: Initialize Firebase Project (3 minutes)

Run these commands in your terminal:

```bash
# Navigate to project directory
cd /Users/jayaprakash/.gemini/antigravity/scratch/lastbench

# Initialize Firebase (select existing project)
firebase init

# When prompted, select:
# ✓ Functions: Configure and deploy Cloud Functions
# ✓ Firestore: Deploy rules
# ✓ Storage: Deploy rules

# Choose:
# - Use existing project: genfess-ac0e8
# - Functions language: JavaScript (already configured)
# - Use existing functions directory
# - Install dependencies: Yes
# - Use existing firestore.rules
# - Use existing storage.rules
```

---

### ✅ Step 3: Deploy Cloud Functions (2 minutes)

```bash
# Deploy everything (functions + rules)
firebase deploy

# OR deploy only functions
firebase deploy --only functions
```

**Expected Output:**
```
✔ functions[onLikeCreated] Successful create operation.
✔ functions[onCommentCreated] Successful create operation.
✔ functions[checkTrending] Successful create operation.

✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/genfess-ac0e8/overview
```

**Verify in Firebase Console:**
1. Go to: Functions tab
2. Should see 3 functions:
   - `onLikeCreated` 🟢
   - `onCommentCreated` 🟢
   - `checkTrending` 🟢

---

## 🧪 COMPLETE TESTING CHECKLIST

### Test 1: Firebase Connection Test (BROWSER)

```bash
# Start development server
npm run dev

# Open in browser:
open http://localhost:5173/firebase-test.html
```

**Run All Tests:**
1. ✅ Firebase SDK Connection
2. ✅ Anonymous Authentication
3. ✅ Create Post (Firestore Write)
4. ✅ Read Posts (Firestore Read)
5. ✅ Image Upload (Storage)

**Expected:**  
All tests should show green checkmarks ✅

---

### Test 2: Authentication Flow

#### Email/Password Auth (if implemented):
```javascript
// Test signup
const email = "test@college.edu";
const password = "testPassword123";

// In console or test file:
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './services/firebase';

// Sign up
await createUserWithEmailAndPassword(auth, email, password);
// Should return user object

// Sign in
await signInWithEmailAndPassword(auth, email, password);
// Should return user object

// Sign out
await signOut(auth);
// Should complete without error
```

#### Anonymous Auth:
✅ Already tested via firebase-test.html

---

### Test 3: Firestore Database Operations

#### Create Post:
```javascript
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './services/firebase';

const postData = {
  text: "Hello LastBench! This is a test post 🎉",
  author_id: auth.currentUser.uid,
  likes_count: 0,
  comments_count: 0,
  created_at: serverTimestamp(),
  college: "test-college",
  is_anonymous: false
};

const docRef = await addDoc(collection(db, 'posts'), postData);
console.log('Post created:', docRef.id);
```

#### Read Posts:
```javascript
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

const q = query(
  collection(db, 'posts'),
  orderBy('created_at', 'desc'),
  limit(10)
);

const snapshot = await getDocs(q);
const posts = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));

console.log('Retrieved posts:', posts);
```

#### Update Post:
```javascript
import { doc, updateDoc, increment } from 'firebase/firestore';

const postRef = doc(db, 'posts', postId);
await updateDoc(postRef, {
  likes_count: increment(1)
});

console.log('Post updated');
```

#### Delete Post:
```javascript
import { doc, deleteDoc } from 'firebase/firestore';

const postRef = doc(db, 'posts', postId);
await deleteDoc(postRef);

console.log('Post deleted');
```

---

### Test 4: Storage Operations

#### Upload Image:
```javascript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from './services/firebase';

// Get file from input
const file = document.getElementById('file-input').files[0];

// Create storage reference
const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${file.name}`);

// Upload
const snapshot = await uploadBytes(storageRef, file);
console.log('Uploaded:', snapshot.metadata.fullPath);

// Get download URL
const downloadURL = await getDownloadURL(snapshot.ref);
console.log('Image URL:', downloadURL);
```

#### Delete Image:
```javascript
import { ref, deleteObject } from 'firebase/storage';

const imageRef = ref(storage, 'posts/path/to/image.jpg');
await deleteObject(imageRef);

console.log('Image deleted');
```

---

### Test 5: Cloud Functions & Notifications

#### Test Like Notification:

**Setup:**
1. Open app on Device/Browser A
2. Login as User A
3. Create a post as User A
4. Note the post ID

5. Open app on Device/Browser B (or incognito)
6. Login as User B (different user)
7. Like User A's post

**Expected:**
- User A receives push notification: "Someone liked your post"
- Notification appears in User A's notifications collection
- Check Firebase Console → Functions → Logs
  - Should see log: "Sending like notification to [userId]"

#### Test Comment Notification:

**Setup:**
1. User B comments on User A's post

**Expected:**
- User A receives notification: "Someone commented: [comment text]"
- Check Functions logs for success

#### Test Trending Notification:

**Setup:**
1. Get 10+ different users to like the same post
   OR
2. Manually update post likes_count in Firestore Console:
   - Go to Firestore → posts → [postId]
   - Change `likes_count` from 9 to 10

**Expected:**
- Post owner receives: "🔥 Your post is trending! It just hit 10 likes."

---

### Test 6: Realtime Features

#### Realtime Post Feed:
```javascript
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';

const q = query(
  collection(db, 'posts'),
  orderBy('created_at', 'desc'),
  limit(20)
);

// Listen to changes
const unsubscribe = onSnapshot(q, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === 'added') {
      console.log('New post:', change.doc.data());
    }
    if (change.type === 'modified') {
      console.log('Modified post:', change.doc.data());
    }
    if (change.type === 'removed') {
      console.log('Removed post:', change.doc.id);
    }
  });
});

// Later: stop listening
unsubscribe();
```

#### Realtime Likes Count:
```javascript
import { doc, onSnapshot } from 'firebase/firestore';

const postRef = doc(db, 'posts', postId);
const unsubscribe = onSnapshot(postRef, (doc) => {
  const post = doc.data();
  console.log('Current likes:', post.likes_count);
  // Update UI here
});
```

---

### Test 7: Security Rules

#### Test Read Rules:
```javascript
// Should succeed: Reading own college posts
const q = query(
  collection(db, 'posts'),
  where('college', '==', currentUserCollege)
);
await getDocs(q); // ✅ Should work

// Should fail: Reading different college posts (if rules are strict)
const q2 = query(
  collection(db, 'posts'),
  where('college', '==', 'other-college')
);
await getDocs(q2); // ❌ May fail depending on rules
```

#### Test Write Rules:
```javascript
// Should succeed: Creating own post
await addDoc(collection(db, 'posts'), {
  author_id: auth.currentUser.uid,
  text: "My post",
  // ...
}); // ✅ Should work

// Should fail: Creating post with different author_id
await addDoc(collection(db, 'posts'), {
  author_id: 'someone-else-uid',
  text: "Fake post",
  // ...
}); // ❌ Should fail - Permission denied
```

---

### Test 8: Full User Flow (End-to-End)

**Complete User Journey:**

1. **Sign Up / Login**
   - ✅ User creates account or signs in
   - ✅ Receives auth token
   - ✅ Redirected to home/feed

2. **View Feed**
   - ✅ Sees posts from their college
   - ✅ Posts load in order (newest first)
   - ✅ Can scroll and load more (pagination)

3. **Create Post**
   - ✅ Opens create post modal
   - ✅ Writes text
   - ✅ (Optional) Uploads image
   - ✅ (Optional) Selects anonymous mode
   - ✅ Posts successfully
   - ✅ New post appears in feed immediately

4. **Interact with Post**
   - ✅ Can like post (counter increments)
   - ✅ Can unlike post (counter decrements)
   - ✅ Can comment on post
   - ✅ Can view all comments
   - ✅ Can share post (if implemented)

5. **Edit/Delete Post**
   - ✅ Can edit own post text
   - ✅ Can delete own post
   - ✅ Cannot edit/delete others' posts

6. **Notifications**
   - ✅ Receives like notification
   - ✅ Receives comment notification
   - ✅ Receives trending notification
   - ✅ Can view notifications list
   - ✅ Can mark as read

7. **Profile**
   - ✅ Can view own profile
   - ✅ Can edit profile (name, avatar, bio)
   - ✅ Can view own posts
   - ✅ Can view post history

8. **Sign Out**
   - ✅ Can sign out
   - ✅ Redirected to login screen
   - ✅ Session cleared

---

## 📊 MONITORING & VERIFICATION

### Check Firebase Console After Tests:

#### Authentication Tab:
- Should see test users
- Check sign-in methods enabled
- Review recent sign-ins

#### Firestore Tab:
- Collections:
  - `users` - User profiles
  - `posts` - All posts
  - `comments` - All comments
  - `interactions` - Likes/reactions
  - `users/{userId}/notifications` - User notifications
  - `users/{userId}/fcmTokens` - Push token storage

#### Storage Tab:
- Should see uploaded images in:
  - `posts/` - Post images
  - `avatars/` - Profile pictures
  - `test-uploads/` - Test images

#### Functions Tab:
- Functions should show:
  - `onLikeCreated` - invocations count
  - `onCommentCreated` - invocations count
  - `checkTrending` - invocations count
- Check logs for any errors

#### Usage & Billing Tab:
- Monitor daily usage:
  - Firestore reads/writes
  - Storage usage
  - Functions invocations
- Verify costs stay within budget

---

## 🐛 TROUBLESHOOTING

### Functions not deploying:
```bash
# Check Firebase CLI version
firebase --version  # Should be 13.0.0+

# Re-login
firebase logout
firebase login

# Try deploying again
firebase deploy --only functions
```

### Notifications not working:
- ✅ Check Functions deployed successfully
- ✅ Verify FCM tokens stored in `/users/{userId}/fcmTokens`
- ✅ Check browser notification permissions granted
- ✅ Check Functions logs in Firebase Console
- ✅ Test with actual device (not just emulator)

### Storage upload fails:
- ✅ Check storage.rules allow uploads
- ✅ Verify user is authenticated
- ✅ Check file size (< 10MB typically)
- ✅ Check file type allowed

### Firestore read/write fails:
- ✅ Check firestore.rules
- ✅ Verify user is authenticated
- ✅ Check user has permission for this college/resource
- ✅ Verify required fields present

---

## ✅ COMPLETE TESTING CHECKLIST

After completing all tests, verify:

- [ ] Firebase Blaze plan activated
- [ ] Budget alerts set up ($10/month)
- [ ] All 3 Cloud Functions deployed
- [ ] Firebase connection test passes (all green)
- [ ] Authentication works (signup/login/logout)
- [ ] Can create posts
- [ ] Can read posts
- [ ] Can update posts
- [ ] Can delete posts
- [ ] Can upload images
- [ ] Can retrieve images
- [ ] Like notifications work
- [ ] Comment notifications work
- [ ] Trending notifications work
- [ ] Realtime updates work
- [ ] Security rules prevent unauthorized access
- [ ] Full user flow works end-to-end
- [ ] No errors in Functions logs
- [ ] Usage within free tier limits

---

## 💰 COST MONITORING

### Daily Checks:
```
Firebase Console → Usage and billing
- View today's reads/writes
- Check storage usage
- Monitor function invocations
```

### Weekly Review:
```
Google Cloud Console → Billing
- Current month cost
- Compare to budget
- Identify high-usage services
```

### Expected Costs (100-500 users):
- **Month 1:** $0 - $2
- **Month 2:** $1 - $5
- **Month 3+:** $3 - $10

---

## 🚀 READY TO LAUNCH!

Once all tests pass:
1. ✅ Firebase fully functional
2. ✅ Cloud Functions working
3. ✅ Notifications delivering
4. ✅ App stable and tested
5. ✅ Monitoring in place
6. ✅ Budget alerts active

**You're ready for Play Store submission! 🎉**

For Play Store checklist, see: `PLAYSTORE_LAUNCH_CHECKLIST.md`

---

**Need help?** Check:
- Firebase Docs: https://firebase.google.com/docs
- Functions Docs: https://firebase.google.com/docs/functions
- Support: https://firebase.google.com/support

Good luck with your launch! 🚀
