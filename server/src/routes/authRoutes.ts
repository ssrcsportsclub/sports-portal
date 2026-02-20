import express from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
  logoutUser,
  googleLogin,
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { authLimiter } from "../middlewares/rateLimiter.js";
import { validateBody } from "../middlewares/validateRequest.js";
import { loginSchema, registerSchema } from "../schemas/index.js";

const router = express.Router();

router.post(
  "/register",
  authLimiter,
  validateBody(registerSchema),
  registerUser,
);
router.post("/login", authLimiter, validateBody(loginSchema), loginUser);
router.post("/logout", logoutUser);
router.post("/google", googleLogin);
router.get("/profile", protect, getUserProfile);

export default router;
