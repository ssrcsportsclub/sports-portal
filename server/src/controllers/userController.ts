import type { Request, Response } from "express";
import User, { UserRole } from "../models/User.js";
import bcrypt from "bcryptjs";
import { sendUserCredentialsEmail } from "../utils/emailHelper.js";

/** Treat search input literally: no regex syntax, no catastrophic patterns. */
const escapeRegex = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// @desc    Get users with optional role filter, search, and pagination
// @route   GET /api/users?role=&q=&page=&limit=
// @access  Private/Admin/Staff/Moderator
export const getUsers = async (req: Request, res: Response) => {
  try {
    const { role, q, page = "1", limit = "12" } = req.query;
    const filter: Record<string, unknown> = role ? { role } : {};

    // Moderators can only view members (users)
    if (req.user?.role === UserRole.MODERATOR) {
      Object.assign(filter, { role: UserRole.USER });
    }

    // Search by name or email (minimum 2 chars)
    if (q && typeof q === "string" && q.trim().length >= 2) {
      const regex = new RegExp(escapeRegex(q.trim()), "i");
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit as string, 10) || 12),
    );
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      User.countDocuments(filter),
    ]);

    res.json({
      users,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      limit: limitNum,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Search users by name or email
// @route   GET /api/users/search?q=query
// @access  Private (all authenticated)
export const searchUsers = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== "string" || q.trim().length < 2) {
      return res.json([]);
    }

    const regex = new RegExp(escapeRegex(q.trim()), "i");
    const users = await User.find({
      $or: [{ name: regex }, { email: regex }],
    })
      .select("name email role")
      .limit(10);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Create a new user manually
// @route   POST /api/users
// @access  Private/Admin
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, phone, studentId } = req.body;

    console.log(req.body);

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
      role: role || UserRole.USER,
      phone,
      studentId,
    });

    if (user) {
      // Send credentials to user's email
      await sendUserCredentialsEmail(
        email,
        password,
        name,
        role || UserRole.USER,
      );

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        studentId: user.studentId,
        createdAt: user.createdAt,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin (Moderators can update managed members?)
export const updateUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      // RBAC Logic for update
      // Moderator can update 'user' role? Content says "Update members info".
      // We will allow Moderators to update 'user' role users.
      if (
        req.user?.role === UserRole.MODERATOR &&
        user.role !== UserRole.USER &&
        req.user?._id.toString() !== user._id.toString()
      ) {
        return res
          .status(403)
          .json({ message: "Moderators can only update members." });
      }

      // 7-day cooldown for self-update
      if (req.user?._id.toString() === user._id.toString()) {
        const lastUpdate = user.lastProfileUpdate;
        if (lastUpdate) {
          const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
          const now = new Date().getTime();
          const nextAvailable = lastUpdate.getTime() + sevenDaysInMs;
          if (now < nextAvailable) {
            const daysLeft = Math.ceil(
              (nextAvailable - now) / (1000 * 60 * 60 * 24),
            );
            return res.status(403).json({
              message: `You can only update your profile once a week. Try again in ${daysLeft} days.`,
            });
          }
        }
        user.lastProfileUpdate = new Date();
      }

      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;
      user.studentId =
        req.body.studentId !== undefined ? req.body.studentId : user.studentId;
      // Only Admin can change roles or ban
      if (req.user?.role === UserRole.ADMIN) {
        user.role = req.body.role || user.role;

        // Ban protection logic
        if (req.body.isBanned !== undefined) {
          // Prevent banning Admin or Superuser
          if (
            user.role === UserRole.ADMIN ||
            user.role === UserRole.SUPERUSER
          ) {
            return res.status(403).json({
              message: `The role "${user.role}" is protected and cannot be banned.`,
            });
          }
          user.isBanned = req.body.isBanned;
        }
      }

      // Moderator may update other info?
      // Assuming straightforward profile update for now.

      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        studentId: updatedUser.studentId,
        lastProfileUpdate: updatedUser.lastProfileUpdate,
        lastPasswordUpdate: updatedUser.lastPasswordUpdate,
        isBanned: updatedUser.isBanned,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      await user.deleteOne();
      res.json({ message: "User removed" });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Change own password
// @route   PUT /api/users/profile/password
// @access  Private
export const changePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user?._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password as string,
    );
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect current password" });
    }

    // 7-day cooldown
    const lastUpdate = user.lastPasswordUpdate;
    if (lastUpdate) {
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      const now = new Date().getTime();
      const nextAvailable = lastUpdate.getTime() + sevenDaysInMs;
      if (now < nextAvailable) {
        const daysLeft = Math.ceil(
          (nextAvailable - now) / (1000 * 60 * 60 * 24),
        );
        return res.status(403).json({
          message: `You can only change your password once a week. Try again in ${daysLeft} days.`,
        });
      }
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.lastPasswordUpdate = new Date();
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
