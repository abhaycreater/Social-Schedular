import { Request, Response } from "express";
import User from "../models/user.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'

const generateToken = (id: String)=>{
    return jwt.sign({id} , process.env.JWT_SECRET || "fallback_secret",{expiresIn:"30d"})
}

export const registerUser = async(req:Request , res:Response)=>{
    try {
        const {name , email , password} = req.body;
        const userExiest = await User.findOne({email});

        if(userExiest){
            res.status(400).json({message:"User Already exiest"});
            return;
        }

        const slat  = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password , slat);

        const user = await User.create({name , email , password:hashPassword});

        if(user){
            res.status(201).json({_id:user._id , name:user.name ,email:user.email , token:generateToken(user._id.toString())})
        }else{
            res.status(400).json({message: "Invalied user data"})
        }
    } catch (error:any) {
        res.status(500).json({message: error?.message || "Server error "})
    }
}

export const loginUser = async(req:Request , res:Response): Promise<void> =>{
    try {
        const {email , password} = req.body;
        const user = await User.findOne({email});

        if(user && (await bcrypt.compare(password , user.password))){
            res.json({_id:user._id , name:user.name ,email:user.email , token:generateToken(user._id.toString())});
            return;
        }else{
            res.status(400).json({message:"Invalied email and password"})
        }

        
    } catch (error : any) {
        res.status(500).json({message: error?.message || "Server error"})
    }
}

