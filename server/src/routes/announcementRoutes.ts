import express from "express";
import {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  addComment,
  updateComment,
  toggleReaction,
  updateAnnouncement,
} from "../controllers/announcementController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";
import { UserRole } from "../models/User.js";

const router = express.Router();

router.use(protect);

router.get("/", getAnnouncements);
router.post(
  "/",
  authorize(UserRole.ADMIN, UserRole.SUPERUSER),
  createAnnouncement,
);
router.post("/:id/comments", addComment);
router.put("/:id/comments/:index", updateComment);
router.post("/:id/react", toggleReaction);
router.put(
  "/:id",
  authorize(UserRole.ADMIN, UserRole.SUPERUSER),
  updateAnnouncement,
);
router.delete("/:id", authorize(UserRole.ADMIN), deleteAnnouncement);

export default router;
