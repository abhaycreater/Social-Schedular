import { Router } from "express";
import { generateAuthUrl, syncAccounts } from "../controllers/SocialAuth.controller.js";
import protect from "../middleware/auth.middleware.js";

const socialMediaRoute = Router();

socialMediaRoute.get('/:platform/url' ,protect, generateAuthUrl);
socialMediaRoute.get('/sync' ,protect ,  syncAccounts);

export default socialMediaRoute;