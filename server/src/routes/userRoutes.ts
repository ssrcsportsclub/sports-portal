import express from "express";
import {
  getUsers,
  searchUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
} from "../controllers/userController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";
import { UserRole } from "../models/User.js";

const router = express.Router();

router.use(protect); // All routes protected

// Search users by name/email: all authenticated
router.get("/search", searchUsers);

// Get all users: Admin, Superuser, Moderator (filtered)
router.get(
  "/",
  authorize(UserRole.ADMIN, UserRole.SUPERUSER, UserRole.MODERATOR),
  getUsers,
);

// Create user: Admin only
router.post("/", authorize(UserRole.ADMIN), createUser);

// Get specific user: Admin, Superuser
router.get("/:id", authorize(UserRole.ADMIN, UserRole.SUPERUSER), getUserById);

// Update user: Admin, Moderator (limited)
router.put("/:id", authorize(UserRole.ADMIN, UserRole.MODERATOR), updateUser);

// Delete user: Admin only
router.delete("/:id", authorize(UserRole.ADMIN), deleteUser);

// Change own password: All authenticated users
router.put("/profile/password", changePassword);

export default router;
