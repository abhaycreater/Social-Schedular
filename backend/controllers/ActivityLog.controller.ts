import { Response } from "express";
import { authRequest } from "../middleware/auth.middleware.js";
import { ActivityLog } from "../models/ActivityLog.js";


// get all activaty
// GET /api/activity
export const getActivity = async (req:authRequest , res:Response):Promise<void>=>{
    try {
        const activity = await ActivityLog.find({user: req.user._id}).sort({createdAt: -1}).limit(10).populate("relatedPost","content");
        res.json(activity)
    } catch (error : any) {
        res.status(500).json({message: error?.message || "Server error"})
    }
}