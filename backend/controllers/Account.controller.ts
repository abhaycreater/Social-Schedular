import { Response } from "express";
import { authRequest } from "../middleware/auth.middleware.js";
import { Account } from "../models/Accounts.js";
import zernio from "../config/zernio.js";

// Get all Accounts
// GET /api/accounts

export const getAccounts = async (
    req: authRequest,
    res: Response
): Promise<void> => {
    try {
        console.log("getAccounts called");
        console.log("Authenticated user:", req.user?._id);

        if (!req.user) {
            res.status(401).json({
                message: "User not authenticated",
            });
            return;
        }

        const accounts = await Account.find({
            user: req.user._id,
        });

        console.log("Accounts found:", accounts.length);

        res.status(200).json(accounts);
    } catch (error: any) {
        console.error("getAccounts error:", error);

        res.status(500).json({
            message: error?.message || "Server Error",
        });
    }
};


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
export const disconnectAccount = async (
  req: authRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const account = await Account.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!account) {
      res.status(404).json({ message: "Account not found" });
      return;
    }

    // Disconnect the account from Zernio first.
    if (account.zernioAccountId) {
      try {
        await zernio.accounts.deleteAccount({
          path: { accountId: account.zernioAccountId },
        });
      } catch (error: any) {
        res.status(500).json({
          message:
            error?.response?.data?.message ||
            error?.message ||
            "Failed to disconnect account from Zernio",
        });
        return;
      }
    }

    // Keep the MongoDB record but update its status.
    account.status = "disconnected";
    await account.save();

    res.status(200).json({
      message: "Account disconnected successfully",
      account,
    });
  } catch (error: any) {
    console.error("disconnectAccount error:", error);

    res.status(500).json({
      message: error?.message || "Server error",
    });
  }
};
