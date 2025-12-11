const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');

// Initialize Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase credentials');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Thumbnail Generator Handler
 * 
 * Can be deployed as AWS Lambda, Google Cloud Function, or generic Node.js webhook.
 * Input Payload: { "record": { "id": "...", "image_url": "..." } } (Database Webhook)
 * Or direct: { "bucket": "images", "path": "full/img.jpg", "recordId": "..." }
 */
exports.handler = async (req, res) => {
    try {
        const payload = req.body || req; // Adapt based on platform
        const record = payload.record;

        if (!record || !record.image_url) {
            console.log('No image_url in record, skipping');
            return { statusCode: 200, body: 'Skipped' };
        }

        const imageUrl = record.image_url; // e.g., "https://xyz.supabase.co/storage/v1/object/public/posts/img.jpg"
        // We need the relative path in the bucket
        // Assuming structure: .../public/[bucket]/[path]
        // Or simply assuming raw path if stored that way.

        // Logic: Download -> Resize -> Upload Thumb -> Update Record
        console.log(`Processing image for post ${record.id}: ${imageUrl}`);

        // 1. Download Image
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 2. Generate Thumbnail (200px width, WebP)
        const thumbBuffer = await sharp(buffer)
            .resize({ width: 200, withoutEnlargement: true })
            .webp({ quality: 70 })
            .toBuffer();

        // 3. Upload Thumbnail
        const thumbPath = `thumbs/${record.id}_thumb.webp`;
        const { error: uploadError } = await supabase.storage
            .from('posts') // Assuming bucket name
            .upload(thumbPath, thumbBuffer, {
                contentType: 'image/webp',
                cacheControl: 'public, max-age=31536000, immutable',
                upsert: true
            });

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        // 4. Update Post Record with thumb_path
        // Use the public URL or relative path depending on app logic.
        // Assuming public access:
        const { data: publicData } = supabase.storage.from('posts').getPublicUrl(thumbPath);
        const finalThumbUrl = publicData.publicUrl;

        await supabase
            .from('posts')
            .update({ thumb_path: finalThumbUrl })
            .eq('id', record.id);

        console.log(`Success! Thumbnail generated: ${finalThumbUrl}`);
        return { statusCode: 200, body: 'Success' };

    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: error.message };
    }
};
