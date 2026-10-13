import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export interface authRequest extends Request {
  user?: any;
}

const protect = async (
  req: authRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    console.log("1. Authorization header exists:", !!authHeader);
console.log("2. JWT_SECRET configured:", !!process.env.JWT_SECRET);

    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({
        message: "Authorization token is missing",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      res.status(500).json({
        message: "JWT secret is not configured",
      });
      return;
    }

    const decoded = jwt.verify(token, secret) as jwt.JwtPayload;

    console.log("3. JWT verified successfully");
    console.log("4. Token user ID:", decoded.id);

    if (!decoded.id) {
      res.status(401).json({
        message: "Token does not contain a user ID",
      });
      return;
    }

    const user = await User.findById(decoded.id).select("-password");

    console.log("5. User found in database:", !!user);

    if (!user) {
      res.status(401).json({
        message: "User associated with this token was not found",
      });
      return;
    }

    req.user = user;
    next();
  } catch (error:any) {
    console.error("JWT verification failed:", error.message);
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: "Token expired. Please log in again." });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        message: "Invalid token. Check the JWT signing secret.",
      });
      return;
    }

    res.status(500).json({ message: "Authentication failed" });
  }
};

export default protect;