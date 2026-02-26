import express from "express";
import {
  createMeeting,
  getMeetings,
  getMeetingById,
  deleteMeeting,
} from "../controllers/meetingController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";
import { UserRole } from "../models/User.js";

const router = express.Router();

router.use(protect);

// All authenticated users can view meetings they participate in
router.get("/", getMeetings);
router.get("/:id", getMeetingById);

// Only admins can create and delete meetings
router.post("/", authorize(UserRole.ADMIN), createMeeting);
router.delete("/:id", authorize(UserRole.ADMIN), deleteMeeting);

export default router;
