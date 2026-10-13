import cron from 'node-cron';
import { Post } from '../models/Post.js';
import { Account } from '../models/Accounts.js';
import { ActivityLog } from '../models/ActivityLog.js';
import zernio from '../config/zernio.js';
import { platform } from 'os';

export const initScheduler = ()=>{
    cron.schedule("* * * * *", async ()=>{
        try{
            const now = new Date();
            const postToPublish = await Post.find({status: "scheduled" , scheduledFor: {$lte:now}});

            console.log(
                `[Scheduler] Found ${postToPublish.length} posts due at ${now.toISOString()}`
            );

            for (const post of postToPublish){
                try {
                    const accounts = await  Account.find({
                        user: post.user,
                        platform:{$in : post.platforms},
                        status: "connected",
                        zernioAccountId:{$exists : true}
                    })

                    if (accounts.length === 0) {
                        console.error("No connected Zernio accounts found", {
                            postId: String(post._id),
                            requestedPlatforms: post.platforms
                        });

                        post.status = "failed";
                        await post.save();
                        continue;
                    }

                    console.error("No connected Zernio accounts found", {
                        postId: String(post._id),
                        requestedPlatforms: post.platforms,
                    });

                    const zernioPlatforms = accounts.map((acc)=>({
                        platform: acc.platform as any,
                        accountId : acc.zernioAccountId!
                    }))

                    const payload = {
                        content : post.content,
                        publishNow : true,
                        ...(post.mediaUrl ? {mediaItems : [{type: post.mediaType || "image" , url:post.mediaUrl}]} : {}),
                        platforms: zernioPlatforms
                    }
                    console.log(`publishing post ${post._id} to zernio with media : ${post.mediaUrl || "non"}`)

                    const response = await zernio.posts.createPost({
                        body:payload
                    })

                    console.log(
                        "FULL ZERNIO PUBLISH RESPONSE:",
                        JSON.stringify(response.data, null, 2)
                    );

                   
                       const publishedPost = (response.data as any)?.post ?? response.data;

                        if (!publishedPost?._id) {
                            throw new Error("Zernio did not return a post ID.");
                        }

                        const platformResults = publishedPost.platforms ?? [];

                        const allPublished =
                            publishedPost.status === "published" &&
                            platformResults.length > 0 &&
                            platformResults.every(
                                (p: any) => p.status === "published"
                            );

                        const hasFailed =
                            publishedPost.status === "failed" ||
                            publishedPost.status === "partial" ||
                            platformResults.some((p: any) => p.status === "failed");

                        post.zernioPostId = publishedPost._id;

                        if (allPublished) {
                            post.status = "published";
                        } else if (hasFailed) {
                            post.status = "failed";
                        } else {
                            post.status = "publishing";
                        }

                        await post.save();

                        if (post.status === "published") {
                            await ActivityLog.create({
                                user: post.user,
                                actionType: "POST_PUBLISHED",
                                description: `Published post to ${accounts
                                    .map((a) => a.platform)
                                    .join(", ")}`,
                                relatedPost: post._id
                            });
                        }


                    await ActivityLog.create({
                        user: post.user,
                        actionType: "POST_PUBLISHED",
                        description:`Published post to ${accounts.map((a) => a.platform).join(", ")}`,
                        relatedPost: post._id
                    })
                } catch (err: any) {
                    console.error(`Failed to publish post ${post._id} : `, err?.response?.data || err?.message);
                    post.status = "failed";
                    await post.save();
                }
            }

            if(postToPublish.length > 0 ){
                console.log(`Evaluated ${postToPublish.length} posts at ${now.toISOString()}`);
            }
        }catch(error){
            console.error("Error in scheduler: ", error);
        }
    })
    console.log('Scheduler services initialized')
}