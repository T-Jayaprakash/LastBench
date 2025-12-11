import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM polyfill for __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Manually load .env variables since dotenv might not be installed
try {
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split(/\r?\n/).forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                // Join back in case value has =
                const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
                if (key && !process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
    }
} catch (e) {
    console.warn("⚠️ Could not load local .env file. Relying on system environment variables.");
}

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Missing credentials.");
    console.error("Please ensure a .env file exists in the project root with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runTest() {
    console.log("🚀 Running Egress Smoke Test...");
    console.log(`Connecting to: ${SUPABASE_URL}`);

    // Test 1: Pagination Check
    console.log("\n🧪 Test 1: Fetching Page 0 (Limit 10)...");

    // Use a generic college filter or random
    const college = 'KRCE';

    const { data: pageData, error: pageError } = await supabase.rpc('get_posts_paginated', {
        p_college: college,
        p_limit: 10,
        p_offset: 0
    });

    if (pageError) {
        console.error("❌ RPC 'get_posts_paginated' Failed:", pageError.message);
        console.log("👉 Did you run the SQL migration inside 'sql/antigravity_indexes_and_rpcs.sql' in Supabase?");
        process.exit(1);
    }

    console.log(`Fetched ${pageData?.length || 0} rows.`);
    if (pageData && pageData.length > 10) {
        console.error("❌ FAIL: Fetched more than 10 rows!");
        process.exit(1);
    }

    // Check columns
    const first = pageData ? pageData[0] : null;
    if (first) {
        const keys = Object.keys(first);
        console.log("Columns returned:", keys.join(', '));

        if (keys.includes('profiles')) {
            console.error("❌ FAIL: Result includes nested 'profiles' object (High Egress risk).");
            process.exit(1);
        }

        if (first.thumb_path !== undefined) {
            console.log("✅ thumb_path is present.");
        } else {
            console.log("⚠️ thumb_path column missing from RPC result (Expected if DB not fully migrated).");
        }

        if (first.is_liked !== undefined) {
            console.log("✅ is_liked status verified.");
        }
    } else {
        console.log("⚠️ No posts found for college 'KRCE'. Skipping column verification.");
    }

    console.log("✅ PASS: Pagination logic implementation check.");

    // Test 2: Single Post Fetch (simulating Realtime payload fetch)
    if (first) {
        console.log("\n🧪 Test 2: Fetch Single Post by ID...");
        const { data: single, error: singleError } = await supabase.rpc('get_post_by_id', {
            p_id: first.id
        });

        if (singleError) {
            console.error("❌ Single fetch RPC failed:", singleError);
            process.exit(1);
        }
        console.log(`Fetched ${single?.length} row(s).`);
        if (single && single.length !== 1) {
            console.error("❌ FAIL: Expected exactly 1 row.");
            process.exit(1);
        }
        console.log("✅ PASS: Single fetch RPC works.");
    }

    console.log("\n🎉 ALL TESTS PASSED.");
}

runTest();
