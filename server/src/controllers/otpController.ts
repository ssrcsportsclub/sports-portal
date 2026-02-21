import crypto from "crypto";
import type { Request, Response } from "express";
import OTP from "../models/OTP.js";
import Form from "../models/Form.js";
import { sendOTPEmail } from "../utils/emailHelper.js";

// Generate a 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

export const sendOTP = async (req: Request, res: Response) => {
  const { email, formId } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // Optional: Check if form exists and requires Sunway email
    if (formId) {
      const form = await Form.findOne({ formId });
      if (
        form?.requireSunwayEmail &&
        !email.toLowerCase().endsWith("@sunway.edu.np")
      ) {
        return res.status(400).json({
          message: "Only @sunway.edu.np emails are allowed for this form",
        });
      }
    }

    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Save or update OTP in DB
    await OTP.findOneAndUpdate(
      { email },
      { otp: otpCode, isVerified: false, expiresAt },
      { upsert: true, new: true },
    );

    // Send real email using helper
    await sendOTPEmail(email, otpCode);
    console.log(`[OTP] Email sent to ${email}`);

    res.status(200).json({
      message: "OTP sent successfully",
      email,
    });
  } catch (error: any) {
    console.error("Error sending OTP:", error);
    res.status(500).json({
      message: "Failed to send OTP. Please check email configuration.",
    });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  try {
    const otpRecord = await OTP.findOne({ email, otp });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    // Mark as verified
    otpRecord.isVerified = true;
    await otpRecord.save();

    res.status(200).json({ message: "Email verified successfully" });
  } catch (error: any) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ message: "Failed to verify OTP" });
  }
};
