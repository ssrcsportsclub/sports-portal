import express from "express";
import {
  getForms,
  getFormById,
  createForm,
  updateForm,
  deleteForm,
  hardDeleteForm,
  submitForm,
  getFormSubmissions,
  updateSubmissionStatus,
  getAllSubmissions,
  getMemberRegistrations,
  updateMemberRegistrationStatus,
  bulkUpdateMemberRegistrationStatus,
} from "../controllers/formController.js";
import { sendOTP, verifyOTP } from "../controllers/otpController.js";
import {
  protect,
  authorize,
  optionalProtect,
} from "../middlewares/authMiddleware.js";
import { UserRole } from "../models/User.js";
import { otpLimiter } from "../middlewares/rateLimiter.js";
import { validateBody } from "../middlewares/validateRequest.js";
import {
  formSubmissionSchema,
  otpRequestSchema,
  otpVerifySchema,
} from "../schemas/index.js";

const router = express.Router();

// Public routes
router.get("/", optionalProtect, getForms);
router.get("/:formId", getFormById);
router.post("/otp/send", otpLimiter, validateBody(otpRequestSchema), sendOTP);
router.post("/otp/verify", validateBody(otpVerifySchema), verifyOTP);

// Form management routes (Admin + Moderator)
router.post("/", protect, authorize(UserRole.ADMIN), createForm);
router.put(
  "/:formId",
  protect,
  authorize(UserRole.ADMIN, UserRole.MODERATOR),
  updateForm,
);
router.delete("/:formId", protect, authorize(UserRole.ADMIN), deleteForm);
router.delete(
  "/:formId/hard",
  protect,
  authorize(UserRole.ADMIN),
  hardDeleteForm,
);

// Form submission routes
router.post("/:formId/submit", validateBody(formSubmissionSchema), submitForm);
router.get(
  "/:formId/submissions",
  protect,
  authorize(UserRole.ADMIN, UserRole.MODERATOR),
  getFormSubmissions,
);
// ... existing code below ...

// All submissions route
router.get(
  "/submissions/all",
  protect,
  authorize(UserRole.ADMIN, UserRole.MODERATOR),
  getAllSubmissions,
);

// Submission status update
router.patch(
  "/submissions/:id/status",
  protect,
  authorize(UserRole.ADMIN),
  updateSubmissionStatus,
);

// Membership Registration routes
router.get(
  "/membership-registrations/all",
  protect,
  authorize(UserRole.ADMIN),
  getMemberRegistrations,
);

router.patch(
  "/membership-registrations/bulk/status",
  protect,
  authorize(UserRole.ADMIN),
  bulkUpdateMemberRegistrationStatus,
);

router.patch(
  "/membership-registrations/:id/status",
  protect,
  authorize(UserRole.ADMIN),
  updateMemberRegistrationStatus,
);

export default router;
