import express from "express";
import {
  createDraw,
  getDrawsByEvent,
  deleteDraw,
  updateDrawResults,
  updateMatchScore,
} from "../controllers/drawController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";
import { UserRole } from "../models/User.js";

const router = express.Router();

router.post("/", protect, authorize(UserRole.ADMIN), createDraw);
router.get("/event/:eventId", getDrawsByEvent);
router.delete("/:id", protect, authorize(UserRole.ADMIN), deleteDraw);
router.patch(
  "/:id/results",
  protect,
  authorize(UserRole.ADMIN),
  updateDrawResults,
);
router.patch(
  "/:id/score",
  protect,
  authorize(UserRole.ADMIN),
  updateMatchScore,
);

export default router;
