# Thumbnail Generator Service

This Node.js service generates optimized WebP thumbnails for uploaded post images to reduce app egress and improve load times.

## Deployment

1. **Environment Variables**:
   Set the following variables in your deployment environment (AWS Lambda, Google Cloud Run, etc.):
   - `SUPABASE_URL`: Your project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (keep secret!)

2. **Trigger**:
   - Set up a **Supabase Database Webhook** on the `posts` table (INSERT).
   - Point the webhook to the deployed function URL.
   - Payload: The function expects the standard Supabase DB webhook payload (`{ type: 'INSERT', record: { ... } }`).

## Local Development

```bash
npm install
node index.js
```

## Logic
1. Downloads the original image from `record.image_url`.
2. Resizes to 200px width using `sharp`.
3. Converts to WebP (quality 70).
4. Uploads to `posts` bucket under `thumbs/`.
5. Updates the `posts` record with `thumb_path`.
