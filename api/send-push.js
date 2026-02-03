import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
};

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount),
    });
}

const db = getFirestore();
const messaging = getMessaging();
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { type, actorUserId, postId, data } = req.body;

    if (!type || !actorUserId || !postId) {
        return res.status(400).json({ error: 'Missing parameters' });
    }

    try {
        // 1. Fetch Post to find Owner from Supabase
        const { data: post, error: postError } = await supabase
            .from('posts')
            .select('author_id')
            .eq('id', postId)
            .single();

        if (postError || !post) {
            console.error('Post lookup failed:', postError);
            return res.status(404).json({ error: 'Post not found or database error' });
        }

        const authorId = post.author_id;

        if (authorId === actorUserId) return res.status(200).json({ skipped: true, reason: 'self_action' });

        // 2. Fetch Actor Profile from Supabase
        const { data: actorProfile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', actorUserId)
            .single();

        const actorName = actorProfile?.display_name || "Someone";

        // 3. Construct Message
        let title = "New Notification";
        let body = "You have a new interaction";

        if (type === 'like') {
            title = "New Like";
            body = `${actorName} liked your post`;
        } else if (type === 'comment') {
            title = "New Comment";
            body = `${actorName} commented: ${data.text || ''}`;
        }

        // 4. Save to Firestore (Notification History)
        const notificationData = {
            type,
            actorUserId,
            postId,
            message: body,
            createdAt: new Date(), // Vercel might not support serverTimestamp fully in basic JSON mode, Date is safer
            isRead: false
        };

        await db.collection('users').doc(authorId).collection('notifications').add(notificationData);

        // 5. Send Push
        const tokensSnap = await db.collection('users').doc(authorId).collection('fcmTokens').get();
        if (tokensSnap.empty) {
            return res.status(200).json({ success: true, pushed: false, reason: 'no_tokens' });
        }

        const tokens = tokensSnap.docs.map(t => t.id);

        const message = {
            notification: { title, body },
            data: {
                type,
                postId,
                actorUserId,
                click_action: '/'
            },
            tokens
        };

        const response = await messaging.sendEachForMulticast(message);

        return res.status(200).json({ success: true, pushed: true, results: response });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
