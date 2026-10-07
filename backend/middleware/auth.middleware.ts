import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken"
import User from "../models/user.js";

export interface authRequest extends Request{
    user? : any;
}

const protect = async (req:authRequest , res:Response , next:NextFunction)=>{
    let token;
    if(req.headers.authorization || req.headers.authorization?.startsWith("Bearer")){
        try {
            token = req.headers.authorization.split(" ")[1];
            const decode: any = jwt.verify(token , process.env.JWT_SERCET!);
            req.user = await User.findById(decode.id).select("-password")
            next();
        } catch (error : any) {
            res.status(401).json({message: error?.message || "Not authorized, token failed"})
        }
    }else{
        res.status(401).json({message: "Not authorized, no token"})
    }
}

export default protect;