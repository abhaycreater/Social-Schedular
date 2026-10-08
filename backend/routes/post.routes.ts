import { Router } from "express";
import protect from "../middleware/auth.middleware.js";
import { generatePost, getGeneration, getPosts, schedulePost } from "../controllers/Post.controller.js";
import { upload } from "../config/multer.js";


const postRouter = Router();

postRouter.get('/' , protect , getPosts);
postRouter.get('/generation' , protect ,  getGeneration);
postRouter.post('/' , protect , upload.single("media") , schedulePost);
postRouter.post('/generate', protect , generatePost)

export default postRouter;