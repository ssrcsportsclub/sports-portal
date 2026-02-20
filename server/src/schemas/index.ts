import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: z.enum(["user", "moderator", "superuser", "admin"]).optional(),
  phone: z.string().optional(),
  studentId: z.string().optional(),
});

export const otpRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  formId: z.string().optional(),
});

export const otpVerifySchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export const formSubmissionSchema = z
  .object({
    name: z.string().min(2, "Name is required").optional(),
    email: z.string().email("Invalid email address").optional(),
    phone: z.string().optional(),
    collegeId: z.string().optional(),
    // Add other common fields or keep it flexible for dynamic forms
  })
  .passthrough();
