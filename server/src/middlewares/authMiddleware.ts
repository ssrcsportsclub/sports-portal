import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { IUser, UserRole } from "../models/User.js";

interface DecodedToken {
  id: string;
  iat: number;
  exp: number;
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let token;

  // Check valid token in cookies
  token = req.cookies.session;

  if (token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET as string,
      ) as DecodedToken;

      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return res
          .status(401)
          .json({ message: "Not authorized, user not found" });
      }

      if (user.isBanned) {
        return res
          .status(403)
          .json({ message: "Your account has been banned." });
      }

      req.user = user as IUser;
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

export const optionalProtect = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let token = req.cookies.session;

  if (token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET as string,
      ) as DecodedToken;

      const user = await User.findById(decoded.id).select("-password");
      if (user && !user.isBanned) {
        req.user = user as IUser;
      }
    } catch (error) {
      // Ignore token errors for optional protection
      console.error("Optional Auth Error:", error);
    }
  }
  next();
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role ${req.user?.role} is not authorized to access this route`,
      });
    }
    next();
  };
};
