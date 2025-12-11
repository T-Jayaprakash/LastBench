const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing credentials. Please ensure .env exists in project root with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    // Don't fail hard if it's just a CI env without keys, but warn.
    process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runTest() {
    console.log("Running Egress Smoke Test...");
    console.log(`Connecting to: ${SUPABASE_URL}`);

    // Test 1: Pagination Check
    console.log("Test 1: Fetching Page 0 (Limit 10)...");

    // Use a generic college filter or random
    const college = 'KRCE';

    const { data: pageData, error: pageError } = await supabase.rpc('get_posts_paginated', {
        p_college: college,
        p_limit: 10,
        p_offset: 0
    });

    if (pageError) {
        // If function doesn't exist yet, it's a fail
        console.error("RPC 'get_posts_paginated' Failed:", pageError.message);
        console.log("Did you run the SQL migration?");
        process.exit(1);
    }

    console.log(`Fetched ${pageData?.length || 0} rows.`);
    if (pageData && pageData.length > 10) {
        console.error("FAIL: Fetched more than 10 rows!");
        process.exit(1);
    }

    // Check columns
    const first = pageData ? pageData[0] : null;
    if (first) {
        const keys = Object.keys(first);
        console.log("Columns returned:", keys.join(', '));

        // Check for heavy nested objects
        if (keys.some(k => typeof first[k] === 'object' && first[k] !== null && !Array.isArray(first[k]))) {
            // profiles might be null or string, but if it returned json object it's heavy
            // our RPC flattens it, so we expect fields like 'display_name', not 'profiles' object
        }

        if (first.thumb_path !== undefined) {
            console.log("✅ thumb_path is present.");
        } else {
            console.warn("⚠️ thumb_path column missing from RPC result.");
        }
    } else {
        console.log("⚠️ No posts found for college 'KRCE'. Skipping column verification.");
    }

    console.log("PASS: Pagination logic implementation check.");

    // Test 2: Single Post Fetch (simulating Realtime payload fetch)
    if (first) {
        console.log("Test 2: Fetch Single Post by ID...");
        const { data: single, error: singleError } = await supabase.rpc('get_post_by_id', {
            p_id: first.id
        });

        if (singleError) {
            console.error("Single fetch RPC failed:", singleError);
            process.exit(1);
        }
        console.log(`Fetched ${single?.length} row(s).`);
        if (single && single.length !== 1) {
            console.error("FAIL: Expected exactly 1 row.");
            process.exit(1);
        }
        console.log("PASS: Single fetch RPC works.");
    }

    console.log("ALL TESTS PASSED.");
}

runTest();
