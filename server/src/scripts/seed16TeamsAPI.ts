import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const API_BASE = "http://localhost:5000/api";
const FORM_ID = "futsal-sports-month-2026";

const teamNames = [
  "Thunderbolts",
  "Red Dragons",
  "Urban Kickers",
  "Goal Diggers",
  "FC Sunway",
  "Midnight Strikers",
  "Elite Warriors",
  "Neon Ninjas",
  "Cyber Stars",
  "Mountain Lions",
  "Rapid Fire",
  "Shadow Walkers",
  "Blue Blasters",
  "Titan Force",
  "Velocity FC",
  "Phoenix Rising",
];

const seedViaAPI = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/sports_club",
    );

    const admin = await User.findOne({ role: "admin" });
    if (!admin) {
      console.error("No admin found");
      process.exit(1);
    }

    const token = jwt.sign(
      { id: admin._id },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" },
    );
    const cookieHeader = `session=${token}`;

    console.log(`Seeding 16 teams to ${API_BASE}/forms/${FORM_ID}/submit...`);

    for (let i = 0; i < 16; i++) {
      const teamName = teamNames[i];
      const payload = {
        name: `Captain ${teamName}`,
        email: `capt_${i}@test.com`,
        phone: "9800000000",
        team_name: teamName,
        members: [
          { name: "Player 1", email: `p1_${i}@test.com`, phone: "123" },
          { name: "Player 2", email: `p2_${i}@test.com`, phone: "123" },
          { name: "Player 3", email: `p3_${i}@test.com`, phone: "123" },
          { name: "Player 4", email: `p4_${i}@test.com`, phone: "123" },
          { name: "Player 5", email: `p5_${i}@test.com`, phone: "123" },
        ],
      };

      // 1. Submit
      const subRes = await fetch(`${API_BASE}/forms/${FORM_ID}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const submission = await subRes.json();
      if (!subRes.ok) {
        console.error(`Failed to submit team ${i + 1}:`, submission.message);
        continue;
      }

      console.log(
        `  [${i + 1}/16] Submitted: ${teamName} (ID: ${submission._id})`,
      );

      // 2. Approve
      const appRes = await fetch(
        `${API_BASE}/forms/submissions/${submission._id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookieHeader,
          },
          body: JSON.stringify({ status: "approved" }),
        },
      );

      if (!appRes.ok) {
        const err = await appRes.json();
        console.error(`    Failed to approve ${teamName}:`, err.message);
      } else {
        console.log(`    Approved: ${teamName}`);
      }
    }

    console.log("✅ Seeding complete.");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
};

seedViaAPI();
