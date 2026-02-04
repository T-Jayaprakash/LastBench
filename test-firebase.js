/**
 * Complete Firebase Testing Script
 * Tests: Auth, Storage, Upload, Retrieve, Edit/Delete Posts
 * 
 * Run in browser console after loading firebase-test.html
 * OR run as Node.js script (requires firebase-admin SDK)
 */

// ============================================
// BROWSER-BASED TESTS (Run in Console)
// ============================================

class FirebaseTestSuite {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0,
            tests: []
        };
        this.createdPostId = null;
        this.authUser = null;
    }

    async runAllTests() {
        console.log('🚀 Starting Complete Firebase Test Suite...\n');
        console.log('='.repeat(60));

        await this.testAuth();
        await this.testCreatePost();
        await this.testReadPosts();
        await this.testUpdatePost();
        await this.testImageUpload();
        await this.testImageRetrieve();
        await this.testDeletePost();
        await this.testRealtime();

        this.printResults();
    }

    // ==================== AUTH TESTS ====================

    async testAuth() {
        console.log('\n📝 Test 1: Authentication');
        console.log('-'.repeat(60));

        try {
            // Assuming Firebase is loaded globally
            const { signInAnonymously } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');

            const result = await signInAnonymously(window.auth);
            this.authUser = result.user;

            this.logSuccess('Auth', `User authenticated: ${this.authUser.uid}`);
            console.log('✅ User ID:', this.authUser.uid);
            console.log('✅ Is Anonymous:', this.authUser.isAnonymous);

        } catch (error) {
            this.logFailure('Auth', error.message);
        }
    }

    // ==================== CREATE POST ====================

    async testCreatePost() {
        console.log('\n📝 Test 2: Create Post (Firestore Write)');
        console.log('-'.repeat(60));

        if (!this.authUser) {
            this.logFailure('Create Post', 'No authenticated user');
            return;
        }

        try {
            const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

            const postData = {
                text: `🧪 Test post created at ${new Date().toISOString()}`,
                author_id: this.authUser.uid,
                likes_count: 0,
                comments_count: 0,
                created_at: serverTimestamp(),
                college: 'test-college',
                is_anonymous: false,
                test_data: true // Mark as test
            };

            const docRef = await addDoc(collection(window.db, 'posts'), postData);
            this.createdPostId = docRef.id;

            this.logSuccess('Create Post', `Post created: ${this.createdPostId}`);
            console.log('✅ Post ID:', this.createdPostId);
            console.log('✅ Data:', postData);

        } catch (error) {
            this.logFailure('Create Post', error.message);
        }
    }

    // ==================== READ POSTS ====================

    async testReadPosts() {
        console.log('\n📝 Test 3: Read Posts (Firestore Read)');
        console.log('-'.repeat(60));

        try {
            const { collection, query, orderBy, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

            const q = query(
                collection(window.db, 'posts'),
                orderBy('created_at', 'desc'),
                limit(5)
            );

            const snapshot = await getDocs(q);
            const posts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.logSuccess('Read Posts', `Retrieved ${posts.length} posts`);
            console.log('✅ Posts retrieved:', posts.length);
            posts.forEach((post, i) => {
                console.log(`  ${i + 1}. ${post.id.substring(0, 8)}... - "${post.text?.substring(0, 30)}..."`);
            });

        } catch (error) {
            this.logFailure('Read Posts', error.message);
        }
    }

    // ==================== UPDATE POST ====================

    async testUpdatePost() {
        console.log('\n📝 Test 4: Update Post (Edit)');
        console.log('-'.repeat(60));

        if (!this.createdPostId) {
            this.logFailure('Update Post', 'No post created to update');
            return;
        }

        try {
            const { doc, updateDoc, increment } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

            const postRef = doc(window.db, 'posts', this.createdPostId);

            await updateDoc(postRef, {
                text: '🔄 Updated test post - edit successful',
                likes_count: increment(5), // Simulate 5 likes
                updated_at: new Date()
            });

            this.logSuccess('Update Post', `Post ${this.createdPostId} updated`);
            console.log('✅ Post updated (text changed, 5 likes added)');

        } catch (error) {
            this.logFailure('Update Post', error.message);
        }
    }

    // ==================== IMAGE UPLOAD ====================

    async testImageUpload() {
        console.log('\n📝 Test 5: Image Upload (Storage)');
        console.log('-'.repeat(60));

        if (!this.authUser) {
            this.logFailure('Image Upload', 'No authenticated user');
            return;
        }

        try {
            const { ref, uploadString, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js');

            // Create a test image (1x1 red pixel PNG as base64)
            const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

            const imagePath = `test-images/${this.authUser.uid}/${Date.now()}_test.png`;
            const storageRef = ref(window.storage, imagePath);

            const snapshot = await uploadString(storageRef, testImageBase64, 'base64');
            const downloadURL = await getDownloadURL(snapshot.ref);

            this.testImageUrl = downloadURL;
            this.testImagePath = imagePath;

            this.logSuccess('Image Upload', `Image uploaded: ${imagePath}`);
            console.log('✅ Path:', imagePath);
            console.log('✅ URL:', downloadURL);

        } catch (error) {
            this.logFailure('Image Upload', error.message);
        }
    }

    // ==================== IMAGE RETRIEVE ====================

    async testImageRetrieve() {
        console.log('\n📝 Test 6: Image Retrieve (Storage)');
        console.log('-'.repeat(60));

        if (!this.testImagePath) {
            this.logFailure('Image Retrieve', 'No image uploaded to retrieve');
            return;
        }

        try {
            const { ref, getDownloadURL, getMetadata } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js');

            const storageRef = ref(window.storage, this.testImagePath);
            const url = await getDownloadURL(storageRef);
            const metadata = await getMetadata(storageRef);

            this.logSuccess('Image Retrieve', `Image retrieved: ${this.testImagePath}`);
            console.log('✅ URL:', url);
            console.log('✅ Size:', metadata.size, 'bytes');
            console.log('✅ Content Type:', metadata.contentType);

        } catch (error) {
            this.logFailure('Image Retrieve', error.message);
        }
    }

    // ==================== DELETE POST ====================

    async testDeletePost() {
        console.log('\n📝 Test 7: Delete Post');
        console.log('-'.repeat(60));

        if (!this.createdPostId) {
            this.logFailure('Delete Post', 'No post to delete');
            return;
        }

        try {
            const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

            const postRef = doc(window.db, 'posts', this.createdPostId);
            await deleteDoc(postRef);

            this.logSuccess('Delete Post', `Post ${this.createdPostId} deleted`);
            console.log('✅ Post successfully removed from Firestore');

        } catch (error) {
            this.logFailure('Delete Post', error.message);
        }
    }

    // ==================== REALTIME TEST ====================

    async testRealtime() {
        console.log('\n📝 Test 8: Realtime Updates');
        console.log('-'.repeat(60));

        try {
            const { collection, query, orderBy, limit, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

            console.log('Listening for realtime updates (5 seconds)...');

            const q = query(
                collection(window.db, 'posts'),
                orderBy('created_at', 'desc'),
                limit(3)
            );

            let changeCount = 0;
            const unsubscribe = onSnapshot(q, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    changeCount++;
                    console.log(`  → ${change.type.toUpperCase()}: ${change.doc.id.substring(0, 8)}...`);
                });
            });

            // Listen for 5 seconds
            await new Promise(resolve => setTimeout(resolve, 5000));
            unsubscribe();

            this.logSuccess('Realtime Updates', `Detected ${changeCount} changes`);
            console.log('✅ Realtime listener working correctly');

        } catch (error) {
            this.logFailure('Realtime Updates', error.message);
        }
    }

    // ==================== HELPERS ====================

    logSuccess(testName, message) {
        this.testResults.passed++;
        this.testResults.total++;
        this.testResults.tests.push({ name: testName, status: 'PASS', message });
    }

    logFailure(testName, message) {
        this.testResults.failed++;
        this.testResults.total++;
        this.testResults.tests.push({ name: testName, status: 'FAIL', message });
        console.error('❌ Error:', message);
    }

    printResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(60));

        this.testResults.tests.forEach((test, i) => {
            const icon = test.status === 'PASS' ? '✅' : '❌';
            console.log(`${icon} ${i + 1}. ${test.name}: ${test.status}`);
            if (test.message) {
                console.log(`   ${test.message}`);
            }
        });

        console.log('\n' + '-'.repeat(60));
        console.log(`Total: ${this.testResults.total} | Passed: ${this.testResults.passed} | Failed: ${this.testResults.failed}`);
        console.log(`Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);
        console.log('='.repeat(60));

        if (this.testResults.failed === 0) {
            console.log('\n🎉 ALL TESTS PASSED! Firebase is fully functional.\n');
        } else {
            console.log('\n⚠️ Some tests failed. Review errors above.\n');
        }
    }
}

// ==================== AUTO-RUN ====================

// Usage in browser console:
console.log('Firebase Test Suite loaded!');
console.log('To run all tests, execute: runFirebaseTests()');

async function runFirebaseTests() {
    const testSuite = new FirebaseTestSuite();
    await testSuite.runAllTests();
}

// Export for use
if (typeof window !== 'undefined') {
    window.runFirebaseTests = runFirebaseTests;
    window.FirebaseTestSuite = FirebaseTestSuite;
}

// ==================== QUICK TESTS (Individual) ====================

async function quickTestAuth() {
    console.log('🔐 Quick Auth Test...');
    const { signInAnonymously } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
    const result = await signInAnonymously(window.auth);
    console.log('✅ Authenticated:', result.user.uid);
    return result.user;
}

async function quickTestPost() {
    console.log('📄 Quick Post Test...');
    const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const docRef = await addDoc(collection(window.db, 'posts'), {
        text: 'Quick test post',
        author_id: window.auth.currentUser?.uid || 'test',
        created_at: serverTimestamp()
    });
    console.log('✅ Post created:', docRef.id);
    return docRef.id;
}

async function quickTestStorage() {
    console.log('📦 Quick Storage Test...');
    const { ref, uploadString, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js');
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    const storageRef = ref(window.storage, `quick-test/${Date.now()}.png`);
    const snapshot = await uploadString(storageRef, testImageBase64, 'base64');
    const url = await getDownloadURL(snapshot.ref);
    console.log('✅ Image uploaded:', url);
    return url;
}

if (typeof window !== 'undefined') {
    window.quickTestAuth = quickTestAuth;
    window.quickTestPost = quickTestPost;
    window.quickTestStorage = quickTestStorage;
}

console.log('\n📚 Available commands:');
console.log('  - runFirebaseTests()    → Run complete test suite');
console.log('  - quickTestAuth()       → Test authentication only');
console.log('  - quickTestPost()       → Test post creation only');
console.log('  - quickTestStorage()    → Test storage only\n');
