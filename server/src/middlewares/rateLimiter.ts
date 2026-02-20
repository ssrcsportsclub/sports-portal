import { rateLimit } from "express-rate-limit";

// General rate limiter for all API requests
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: "draft-7", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    message:
      "Too many requests from this IP, please try again after 15 minutes",
  },
});

// Stricter limiter for authentication routes (login, register)
export const authLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  limit: 10, // Limit each IP to 10 requests per 30 minutes
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message:
      "Too many login/registration attempts, please try again after 30 minutes",
  },
});

// Stricter limiter for OTP requests
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5, // Limit each IP to 5 OTP requests per hour
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "Too many OTP requests, please try again after an hour",
  },
});
