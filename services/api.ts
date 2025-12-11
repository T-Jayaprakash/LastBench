import { Post, Comment, PostTag } from '../types/index';
import { supabase } from './supabaseClient';
import { getCurrentUser } from './userService';

const PROFILE_FIELDS = 'id, anon_id, display_name, avatar_color, college, department, has_onboarded';
const FEED_CACHE_KEY = 'lastbench_feed_cache';

export const mapDbPostToPost = (dbPost: any): Post => {
    // Handle both joined (profiles object) and flat (RPC) profile data
    const profile = Array.isArray(dbPost.profiles) ? dbPost.profiles[0] : dbPost.profiles;

    // Flat fields from RPC
    const rpcDisplayName = dbPost.display_name;
    const rpcAvatarUrl = dbPost.avatar_url;
    const rpcAvatarColor = dbPost.avatar_color;
    const rpcAnonId = dbPost.author_id ? 'Anon' : 'Unknown'; // RPC might not select anon_id if not needed, or use ID

    let images: string[] = dbPost.images || [];
    let mainImageUrl = dbPost.image_url;

    if (images.length === 0 && mainImageUrl && typeof mainImageUrl === 'string') {
        if (mainImageUrl.trim().startsWith('[')) {
            try {
                const parsed = JSON.parse(mainImageUrl);
                if (Array.isArray(parsed)) {
                    images = parsed;
                    mainImageUrl = parsed[0];
                }
            } catch (e) {
                images = [mainImageUrl];
            }
        } else {
            images = [mainImageUrl];
        }
    }

    return {
        id: dbPost.id,
        authorAnonId: profile?.anon_id || rpcAnonId,
        displayName: profile?.display_name || rpcDisplayName || 'Anonymous',
        authorAvatarColor: profile?.avatar_color || rpcAvatarColor || '#ccc',
        authorAvatarUrl: profile?.avatar_url || rpcAvatarUrl,
        text: dbPost.text,
        imageUrl: mainImageUrl,
        thumbPath: dbPost.thumb_path, // New field
        images: images,
        department: dbPost.department, // Might be null in RPC
        college: dbPost.college,
        tags: dbPost.tags || [],
        likesCount: dbPost.likes_count || 0,
        commentsCount: dbPost.comments_count || 0,
        createdAt: new Date(dbPost.created_at),
        trendingScore: (dbPost.likes_count || 0) + ((dbPost.comments_count || 0) * 2),
        isLiked: dbPost.isLiked || false,
    };
};

export const getPostById = async (postId: string): Promise<Post | null> => {
    try {
        const { data, error } = await supabase
            .from('posts')
            .select(`
                *,
                profiles:author_id (${PROFILE_FIELDS})
            `)
            .eq('id', postId)
            .single();

        if (error || !data) return null;
        return mapDbPostToPost(data);
    } catch (e) {
        console.error("Error fetching post by ID:", e);
        return null;
    }
};

const mapDbCommentToComment = (dbComment: any): Comment => {
    const profile = Array.isArray(dbComment.profiles) ? dbComment.profiles[0] : dbComment.profiles;

    // Default to false, will be populated by getComments logic if applicable
    const isLiked = false;

    return {
        id: dbComment.id,
        postId: dbComment.post_id,
        parentId: dbComment.parent_id || null,
        authorAnonId: profile?.anon_id || 'Unknown',
        displayName: profile?.display_name || 'Anonymous', // Added
        authorAvatarColor: profile?.avatar_color || '#ccc',
        authorAvatarUrl: profile?.avatar_url,
        text: dbComment.text,
        likesCount: dbComment.likes_count || 0,
        isLiked: isLiked,
        createdAt: new Date(dbComment.created_at),
    };
};

// Retrieve cached posts instantly
export const getCachedPosts = (): Post[] => {
    try {
        const cached = localStorage.getItem(FEED_CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            // Re-hydrate Date objects
            const posts = parsed.map((p: any) => ({
                ...p,
                createdAt: new Date(p.createdAt)
            }));
            console.log(`Loaded ${posts.length} posts from cache`);
            return posts;
        } else {
            console.log('No cached posts found');
        }
    } catch (e) {
        console.error("Cache parse error", e);
        // Clear corrupted cache
        try {
            localStorage.removeItem(FEED_CACHE_KEY);
        } catch { }
    }
    return [];
};

export const getPosts = async (page = 0, limit = 20): Promise<Post[]> => {
    try {
        const user = await getCurrentUser();

        if (!user || !user.college) {
            return [];
        }

        const userCollege = user.college.trim();
        const from = page * limit;
        const to = from + limit - 1;

        // PERFORMANCE OPTIMIZATION: Sequential fetch
        // 1. Fetch Posts first
        const { data: postsData, error: postsError } = await supabase
            .from('posts')
            .select(`
                id, author_id, text, image_url, images, department, tags, likes_count, comments_count, created_at, college,
                profiles!left (${PROFILE_FIELDS})
            `)
            .eq('college', userCollege)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (postsError) {
            console.error('getPosts Error:', JSON.stringify(postsError, null, 2));
            return [];
        }

        const mappedPosts = (postsData || []).map(mapDbPostToPost);

        // 2. Fetch Likes ONLY for the retrieved posts (reduces load from 2000 rows to 15 rows)
        if (user && mappedPosts.length > 0) {
            const postIds = mappedPosts.map(p => p.id);
            const { data: likesData } = await supabase
                .from('interactions')
                .select('post_id')
                .eq('user_id', user.userId)
                .eq('type', 'like')
                .in('post_id', postIds);

            if (likesData) {
                const likedPostIds = new Set(likesData.map((like: any) => like.post_id));
                mappedPosts.forEach(post => {
                    post.isLiked = likedPostIds.has(post.id);
                });
            }
        }

        // Cache ONLY the first page for faster initial load
        if (page === 0 && mappedPosts.length > 0) {
            try {
                localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(mappedPosts.slice(0, 20)));
                console.log(`✅ Cached ${Math.min(mappedPosts.length, 20)} posts`);
            } catch (e) {
                console.warn("Failed to cache posts:", e);
            }
        }

        return mappedPosts;
    } catch (err) {
        console.error("Unexpected error in getPosts:", err);
        return [];
    }
};

export const createPost = async (newPostData: { text: string; images?: string[]; tags: PostTag[] }): Promise<Post | null> => {
    try {
        const user = await getCurrentUser();
        if (!user) {
            console.error('❌ createPost: User not authenticated');
            alert('You must be logged in to create a post');
            throw new Error('User not authenticated');
        }

        console.log('📝 Creating post:', { userId: user.userId, college: user.college, tags: newPostData.tags });

        // Simple payload - only include fields we're certain exist
        const payload: any = {
            author_id: user.userId,
            text: newPostData.text,
            tags: newPostData.tags || [],
            department: user.department || 'Other',
            college: user.college || 'Unknown',
            likes_count: 0,
            comments_count: 0
        };

        // Add images if provided
        if (newPostData.images && newPostData.images.length > 0) {
            payload.images = newPostData.images;
            payload.image_url = newPostData.images[0];
        }

        console.log('📤 Inserting post with payload:', JSON.stringify(payload, null, 2));

        // Try insert WITHOUT profile join first (faster, more reliable)
        const { data: insertData, error: insertError } = await supabase
            .from('posts')
            .insert(payload)
            .select('*')
            .single();

        if (insertError) {
            console.error('❌ createPost insert error:', insertError);
            console.error('Error code:', insertError.code);
            console.error('Error message:', insertError.message);
            console.error('Error details:', JSON.stringify(insertError, null, 2));

            // Show user-friendly error
            if (insertError.message?.includes('permission') || insertError.message?.includes('policy')) {
                alert('Permission denied: Please check database settings');
            } else if (insertError.message?.includes('column')) {
                alert(`Database column error: ${insertError.message}`);
            } else {
                alert(`Failed to create post: ${insertError.message}`);
            }
            return null;
        }

        if (!insertData) {
            console.error('❌ No data returned after insert');
            alert('Post created but no data returned');
            return null;
        }

        console.log('✅ Post inserted, ID:', insertData.id);

        // Now fetch the profile separately
        const { data: profileData } = await supabase
            .from('profiles')
            .select(PROFILE_FIELDS)
            .eq('user_id', user.userId)
            .single();

        // Merge post with profile data
        const completePost = {
            ...insertData,
            profiles: profileData || {
                anon_id: user.anonId,
                display_name: user.displayName,
                avatar_color: user.avatarColor,
                avatar_url: user.avatarUrl,
                college: user.college,
                department: user.department
            }
        };

        console.log('✅ Post created successfully with ID:', completePost.id);
        return mapDbPostToPost(completePost);

    } catch (err: any) {
        console.error('❌ createPost unexpected error:', err);
        console.error('Error stack:', err.stack);
        alert(`Unexpected error creating post: ${err.message}`);
        return null;
    }
};

export const deletePost = async (postId: string): Promise<boolean> => {
    const user = await getCurrentUser();
    if (!user) {
        console.error("deletePost: No user authenticated");
        alert('You must be logged in to delete posts');
        return false;
    }

    try {
        console.log(`🗑️ Deleting post ${postId} by user ${user.userId}`);

        // Database now handles cascading deletes for interactions, comments, and reports!
        // We just need to delete the post itself.

        const { error, count } = await supabase
            .from('posts')
            .delete({ count: 'exact' })
            .eq('id', postId)
            .eq('author_id', user.userId);

        if (error) {
            console.error("Error deleting post DB:", JSON.stringify(error, null, 2));
            alert(`Failed to delete post: ${error.message}`);
            return false;
        }

        if (count === 0) {
            console.warn("Delete op returned 0 rows affected. Permission denied or post not found.");
            alert('Could not delete post. You must be the author.');
            return false;
        }

        console.log('✅ Post deleted successfully');
        return true;
    } catch (e: any) {
        console.error("Unexpected error during delete sequence:", e);
        alert(`Unexpected error deleting post: ${e.message}`);
        return false;
    }
};

const toggleInteraction = async (postId: string, type: 'like'): Promise<number> => {
    try {
        const user = await getCurrentUser();
        if (!user) {
            console.error('❌ toggleInteraction: No user found');
            throw new Error('User not authenticated');
        }

        console.log(`🔄 toggleInteraction: ${type} for post ${postId} by user ${user.userId}`);

        // Check existing interaction
        const { data: existingInteraction, error: fetchError } = await supabase
            .from('interactions')
            .select('*')
            .eq('user_id', user.userId)
            .eq('post_id', postId)
            .eq('type', type)
            .maybeSingle();

        if (fetchError) {
            console.error('❌ toggleInteraction fetch error:', fetchError);
            throw fetchError;
        }

        let newCount = 0;

        if (existingInteraction) {
            // UNLIKE - Delete interaction
            console.log('👎 Removing like...');
            const { error: deleteError } = await supabase
                .from('interactions')
                .delete()
                .eq('id', existingInteraction.id);

            if (deleteError) {
                console.error('❌ Delete interaction error:', deleteError);
                throw deleteError;
            }

            // Decrement count
            const { data: post, error: fetchPostError } = await supabase
                .from('posts')
                .select(`${type}s_count`)
                .eq('id', postId)
                .single();

            if (fetchPostError) {
                console.error('❌ Fetch post error:', fetchPostError);
                throw fetchPostError;
            }

            const currentCount = post ? post[`${type}s_count`] : 0;
            newCount = Math.max(0, currentCount - 1);

            const { error: updateError } = await supabase
                .from('posts')
                .update({ [`${type}s_count`]: newCount })
                .eq('id', postId);

            if (updateError) {
                console.error('❌ Update post count error:', updateError);
                throw updateError;
            }

            console.log(`✅ Unlike successful. New count: ${newCount}`);
        } else {
            // LIKE - Insert interaction
            console.log('👍 Adding like...');
            const { error: insertError } = await supabase
                .from('interactions')
                .insert({
                    user_id: user.userId,
                    post_id: postId,
                    type: type
                });

            if (insertError) {
                console.error('❌ Insert interaction error:', insertError);
                console.error('Error details:', JSON.stringify(insertError, null, 2));
                throw insertError;
            }

            // Increment count
            const { data: post, error: fetchPostError } = await supabase
                .from('posts')
                .select(`${type}s_count`)
                .eq('id', postId)
                .single();

            if (fetchPostError) {
                console.error('❌ Fetch post error:', fetchPostError);
                throw fetchPostError;
            }

            const currentCount = post ? post[`${type}s_count`] : 0;
            newCount = currentCount + 1;

            const { error: updateError } = await supabase
                .from('posts')
                .update({ [`${type}s_count`]: newCount })
                .eq('id', postId);

            if (updateError) {
                console.error('❌ Update post count error:', updateError);
                console.error('Error details:', JSON.stringify(updateError, null, 2));
                throw updateError;
            }

            console.log(`✅ Like successful. New count: ${newCount}`);
        }

        return newCount;
    } catch (err) {
        console.error('❌ toggleInteraction unexpected error:', err);
        throw err; // Re-throw instead of returning 0
    }
};

export const toggleLike = async (postId: string): Promise<number> => {
    return toggleInteraction(postId, 'like');
};

export const getUserPosts = async (anonId: string): Promise<Post[]> => {
    const user = await getCurrentUser();

    const { data, error } = await supabase
        .from('posts')
        .select(`
            *,
            profiles:author_id!inner (${PROFILE_FIELDS})
        `)
        .eq('profiles.anon_id', anonId)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        return [];
    }

    const mappedPosts = (data || []).map(mapDbPostToPost);

    if (user && mappedPosts.length > 0) {
        const postIds = mappedPosts.map(p => p.id);
        const { data: userLikes, error: likesError } = await supabase
            .from('interactions')
            .select('post_id')
            .eq('user_id', user.userId)
            .eq('type', 'like')
            .in('post_id', postIds);

        if (!likesError && userLikes) {
            const likedPostIds = new Set(userLikes.map((like: any) => like.post_id));
            mappedPosts.forEach(post => {
                post.isLiked = likedPostIds.has(post.id);
            });
        }
    }

    return mappedPosts;
};

export const updatePost = async (postId: string, text: string): Promise<boolean> => {
    const user = await getCurrentUser();
    if (!user) {
        console.error('❌ updatePost: No user authenticated');
        alert('You must be logged in to edit posts');
        return false;
    }

    try {
        console.log(`✏️ Updating post ${postId} by user ${user.userId}`);
        console.log(`New text: "${text}"`);

        const { data, error } = await supabase
            .from('posts')
            .update({ text: text, is_edited: true })
            .eq('id', postId)
            .eq('author_id', user.userId)
            .select('id');

        if (error) {
            console.error("❌ Error updating post:", error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('Error details:', JSON.stringify(error, null, 2));

            // Show user-friendly error
            if (error.message?.includes('permission') || error.message?.includes('policy')) {
                alert('Permission denied: You can only edit your own posts');
            } else {
                alert(`Failed to update post: ${error.message}`);
            }
            return false;
        }

        if (!data || data.length === 0) {
            console.warn('⚠️ No rows updated. Post not found or you are not the author.');
            alert('Could not update post. You must be the author.');
            return false;
        }

        console.log('✅ Post updated successfully');
        return true;
    } catch (e: any) {
        console.error("❌ Exception updating post:", e);
        console.error('Error stack:', e.stack);
        alert(`Unexpected error: ${e.message}`);
        return false;
    }
};

export const getLikedPosts = async (anonId: string): Promise<Post[]> => {
    // 1. Find Profile ID from Anon ID
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('anon_id', anonId)
        .single();

    if (profileError || !profile) {
        return [];
    }

    // 2. Find interactions
    const { data, error } = await supabase
        .from('interactions')
        .select(`
            post_id,
            posts:post_id (
                *,
                profiles:author_id (${PROFILE_FIELDS})
            )
        `)
        .eq('user_id', profile.id)
        .eq('type', 'like')
        .order('created_at', { ascending: false })
        .limit(50); // Limit to 50 liked posts for performance

    if (error) {
        return [];
    }

    return (data || [])
        .map((item: any) => item.posts)
        .filter((p: any) => p !== null)
        .map(dbPost => {
            const post = mapDbPostToPost(dbPost);
            post.isLiked = true; // Since we fetched from liked interactions, it IS liked
            return post;
        });
};

export const getComments = async (postId: string): Promise<Comment[]> => {
    const user = await getCurrentUser();
    const userId = user ? user.userId : null;

    // 1. Fetch Comments
    // We do NOT join interactions here because schema matching often fails on polymorphic tables or missing FKs
    const { data: commentsData, error } = await supabase
        .from('comments')
        .select(`
            *,
            profiles:author_id (${PROFILE_FIELDS})
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching comments:', JSON.stringify(error, null, 2));
        return [];
    }

    if (!commentsData || commentsData.length === 0) return [];

    const comments = commentsData.map(mapDbCommentToComment);

    // 2. Fetch User Likes for these comments (Manual Join logic)
    if (userId) {
        const commentIds = comments.map(c => c.id);
        const { data: likes } = await supabase
            .from('interactions')
            .select('comment_id')
            .eq('user_id', userId)
            .eq('type', 'like')
            .in('comment_id', commentIds);

        if (likes) {
            const likedCommentIds = new Set(likes.map((l: any) => l.comment_id));
            comments.forEach(c => {
                c.isLiked = likedCommentIds.has(c.id);
            });
        }
    }

    return comments;
};

export const addComment = async (postId: string, text: string, parentId?: string): Promise<Comment> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const payload: any = {
        post_id: postId,
        author_id: user.userId,
        text: text
    };

    if (parentId) {
        payload.parent_id = parentId;
    }

    try {
        const { data, error } = await supabase
            .from('comments')
            .insert(payload)
            .select(`
                *,
                profiles:author_id (${PROFILE_FIELDS})
            `)
            .single();

        if (error) {
            // Fallback if parent_id not in schema yet
            if (error.code === '42703' || error.message?.includes('parent_id')) {
                delete payload.parent_id;
                const { data: retryData, error: retryError } = await supabase
                    .from('comments')
                    .insert(payload)
                    .select(`*, profiles:author_id (${PROFILE_FIELDS})`)
                    .single();
                if (retryError) throw retryError;

                // Update count
                const { data: post } = await supabase.from('posts').select('comments_count').eq('id', postId).single();
                const currentCount = post ? post.comments_count : 0;
                await supabase.from('posts').update({ comments_count: currentCount + 1 }).eq('id', postId);

                return mapDbCommentToComment(retryData);
            }
            throw error;
        }

        // Update comment count on post
        const { data: post } = await supabase.from('posts').select('comments_count').eq('id', postId).single();
        const currentCount = post ? post.comments_count : 0;
        await supabase.from('posts').update({ comments_count: currentCount + 1 }).eq('id', postId);

        return mapDbCommentToComment(data);
    } catch (err) {
        console.error("addComment failed:", err);
        throw err;
    }
};

export const toggleCommentLike = async (commentId: string): Promise<number | undefined> => {
    const user = await getCurrentUser();
    if (!user) return undefined;

    try {
        // Check existing
        const { data: existing } = await supabase
            .from('interactions')
            .select('id')
            .eq('user_id', user.userId)
            .eq('comment_id', commentId)
            .eq('type', 'like')
            .maybeSingle();

        if (existing) {
            await supabase.from('interactions').delete().eq('id', existing.id);
        } else {
            try {
                await supabase.from('interactions').insert({
                    user_id: user.userId,
                    comment_id: commentId,
                    type: 'like'
                });
            } catch (e) {
                return undefined;
            }
        }

        // Update count
        const { count } = await supabase
            .from('interactions')
            .select('*', { count: 'exact', head: true })
            .eq('comment_id', commentId)
            .eq('type', 'like');

        if (count !== null) {
            await supabase.from('comments').update({ likes_count: count }).eq('id', commentId);
            return count;
        }
    } catch (e) {
        // fail silently
    }
    return undefined;
};

export const submitReport = async (postId: string, reason: string): Promise<boolean | 'DELETED'> => {
    const user = await getCurrentUser();
    if (!user) return false;

    try {
        // 1. Insert Report
        // The database trigger 'on_report_added' will automatically check count
        // and delete the post if count >= 10.
        const { error } = await supabase.from('reports').insert({
            post_id: postId,
            reason: reason,
            reporter_id: user.userId // Ensure reporter_id is set
        });

        if (error) {
            console.error("Error submitting report:", JSON.stringify(error, null, 2));
            return false;
        }

        // 2. Check if post still exists (to see if it was auto-deleted)
        const { data, error: fetchError } = await supabase
            .from('posts')
            .select('id')
            .eq('id', postId)
            .single();

        // If post is gone (data is null or error is 'PGRST116' - row not found)
        if (!data || (fetchError && fetchError.code === 'PGRST116')) {
            console.log('🚨 Post was auto-deleted due to reports!');
            return 'DELETED';
        }

        return true;
    } catch (e) {
        console.error("Report exception:", e);
        return false;
    }
};