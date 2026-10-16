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

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const createDrawSchema = z.object({
  event: objectId,
  format: z.enum(["Group", "Knockout", "League"]),
  sport: z.string().min(1, "Sport is required"),
  teamSize: z.number().int().positive().optional(),
  scoring: z.enum(["football", "winOnly"]).optional(),
  drawnTeams: z.array(objectId).min(2, "A draw needs at least 2 teams"),
  groupings: z
    .array(z.object({ name: z.string().min(1), teams: z.array(objectId) }))
    .optional(),
});

export const advanceDrawSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("groups"),
    qualifiers: z.number().int().min(2),
    groupSize: z.number().int().min(2),
  }),
  z.object({
    mode: z.literal("knockout"),
    qualifiers: z.number().int().min(2).optional(),
    seeding: z.enum(["ranked", "draw"]).optional(),
    perGroup: z.number().int().min(1).optional(),
    bestPlaced: z.number().int().min(0).optional(),
  }),
]);

export const requestWindowSchema = z.object({
  mode: z.enum(["scheduled", "open", "closed"]).optional(),
  openHour: z.number().int().min(0).max(23).optional(),
  closeHour: z.number().int().min(1).max(24).optional(),
  note: z.string().max(200).optional(),
});
