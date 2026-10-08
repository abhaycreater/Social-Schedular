import { Response } from "express";
import { authRequest } from "../middleware/auth.middleware.js";
import { Account } from "../models/Accounts.js";
import zernio from "../config/zernio.js";

// Get all Accounts
// GET /api/accounts
export const getAccounts = async(req:authRequest , res: Response):Promise<void> =>{
    try {
        const accounts  = await Account.find({user: req.user._id});
        res.status(200).json({message : "Accounts Fetched uccessfully" , accounts})
    } catch (error : any) {
        res.status(500).json({message: error?.message || "Server Error" })
    }
}

// Add account
// POST /api/accounts
export const addAccounts = async (req:authRequest , res:Response): Promise<void> =>{
    try {
        const {platform , handle , avatarUrl} = req.body;

        const account = await Account.create({user: req.user._id , platform , handle , avatarUrl });
        res.status(201).json({message:"Account add successfully " , account})
    } catch (error : any) {
        res.status(500).json({message: error?.message || "Server Error"})
    }
}

// delete account
// DELETE /api/account/:id
export const disconnectAccount = async(req: authRequest , res:Response) : Promise<void> =>{
    try {
        const account = await Account.findOne({_id: req.user.id , user:req.user._id});
        if(!account){
            res.status(404).json({message: "Account not found"});
            return;
        }
        if(account.zernioAccountId){
            try {
                await zernio.accounts.deleteAccount({path: {accountId : account.zernioAccountId}})
            } catch (error: any) {
                res.status(500).json({message: error?.response?.data?.message || error?.message});
                return;
            }
        }
        await account.deleteOne()
        res.json({message: "Account disconnected successfully"})
    } catch (error : any) {
        res.status(500).json({message: error?.message || "Server error"})
    }
}
