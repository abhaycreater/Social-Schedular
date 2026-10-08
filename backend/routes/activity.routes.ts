import { Router } from "express";
import protect from "../middleware/auth.middleware.js";
import { getActivity } from "../controllers/ActivityLog.controller.js";


const activityRoute = Router();

activityRoute.get('/' , protect , getActivity)

export default activityRoute;