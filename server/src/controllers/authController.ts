import { Request, Response } from "express";
import User, { IUser } from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: "30d",
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "user", // Default to user if not specified (should be restricted in prod)
    });

    if (user) {
      const token = generateToken(
        (user._id as mongoose.Types.ObjectId).toString(),
      );

      // For cross-domain cookies (different Vercel deployments)
      res.cookie("session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    console.log(`[Login] Attempt for email: ${email}`);
    const user = await User.findOne({ email });

    if (!user) {
      console.log(`[Login] User not found for email: ${email}`);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password as string);
    console.log(`[Login] Password match for ${email}: ${isMatch}`);

    if (user && isMatch) {
      if (user.isBanned) {
        return res
          .status(403)
          .json({ message: "Your account has been banned." });
      }

      const token = generateToken(
        (user._id as mongoose.Types.ObjectId).toString(),
      );

      // For cross-domain cookies (different Vercel deployments)
      res.cookie("session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const logoutUser = (req: Request, res: Response) => {
  res.cookie("session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    expires: new Date(0),
  });
  res.status(200).json({ message: "Logged out" });
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req: Request, res: Response) => {
  if (req.user) {
    res.json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    });
  } else {
    res.status(404).json({ message: "User not found" });
  }
};
