import express from "express";
import {
  createDraw,
  getDrawsByEvent,
  getAllDraws,
  deleteDraw,
  updateDrawResults,
  updateMatchScore,
  advanceDraw,
} from "../controllers/drawController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";
import { UserRole } from "../models/User.js";
import { validateBody } from "../middlewares/validateRequest.js";
import { advanceDrawSchema, createDrawSchema } from "../schemas/index.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorize(UserRole.ADMIN),
  validateBody(createDrawSchema),
  createDraw,
);
router.post(
  "/:id/advance",
  protect,
  authorize(UserRole.ADMIN),
  validateBody(advanceDrawSchema),
  advanceDraw,
);
router.get("/", getAllDraws);
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
