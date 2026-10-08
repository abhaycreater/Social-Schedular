import cron from 'node-cron';
import { Post } from '../models/Post.js';
import { Account } from '../models/Accounts.js';
import { ActivityLog } from '../models/ActivityLog.js';
import zernio from '../config/zernio.js';

export const initScheduler = ()=>{
    cron.schedule("* * * * *", async ()=>{
        try{
            const now = new Date();
            const postToPublish = await Post.find({status: "scheduled" , scheduledFor: {$lte:now}});

            for (const post of postToPublish){
                try {
                    const accounts = await  Account.find({
                        user: post.user,
                        platform:{$in : post.platforms},
                        status: "connected",
                        zernioAccountId:{$exists : true}
                    })

                    if(accounts.length === 0){
                        console.log(`No connected Zernio accounts found for post ${post._id}`);
                       continue; 
                    }

                    const zernioPlatforms = accounts.map((acc)=>({
                        tform: acc.platform as any,
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

                    const publishedPost = (response.data as any)?.post || response.data;

                    if(!publishedPost){
                        throw new Error("Failed to get post object from Zernio response");
                    }

                    console.log(`Zernio post created: ${publishedPost._id || publishedPost.id}`);

                    post.status = "published";
                    await post.save();

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