import mongoose from "mongoose";
import dotenv from "dotenv";
import Form from "../models/Form.js";
import Event from "../models/Event.js";
import User from "../models/User.js";
import Team, { TeamType } from "../models/Team.js";
import FormSubmission, { SubmissionStatus } from "../models/FormSubmission.js";

dotenv.config();

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

const seed16Teams = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/sports_club",
    );
    console.log("MongoDB Connected");

    const adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      console.error("No admin user found.");
      process.exit(1);
    }

    const form = await Form.findOne({ formId: "futsal-sports-month-2026" });
    const event = await Event.findOne({ slug: "futsal-sports-month-2026" });

    if (!form || !event) {
      console.error(
        "Futsal form or event not found. Please run seedFutsalForm first.",
      );
      process.exit(1);
    }

    // Clear existing submissions and teams for this event to avoid duplicates
    await FormSubmission.deleteMany({ form: form._id });
    await Team.deleteMany({ event: event._id });
    event.registeredTeams = [];
    await event.save();

    console.log(
      "Cleared existing data for Futsal tournament. Seeding 16 new teams...",
    );

    for (let i = 0; i < 16; i++) {
      const teamName = teamNames[i];
      const captainName = `Captain ${i + 1}`;
      const captainEmail = `captain${i + 1}@sunway.edu.np`;

      // 1. Create Submission
      const submission = await FormSubmission.create({
        form: form._id,
        user: adminUser._id, // Assume admin submitted for testing or use a dummy user
        formData: {
          name: captainName,
          email: captainEmail,
          phone: `98000000${i.toString().padStart(2, "0")}`,
          team_name: teamName,
        },
        status: SubmissionStatus.APPROVED,
        reviewedBy: adminUser._id,
        reviewedAt: new Date(),
      });

      // 2. Extract and format members
      const memberCount = Math.floor(Math.random() * (8 - 5 + 1)) + 5;
      const members = [];
      for (let j = 0; j < memberCount; j++) {
        members.push({
          name: `Player ${i + 1}-${j + 1}`,
          email: `player${i + 1}-${j + j}@sunway.edu.np`,
          phone: `97000000${i}${j}`,
        });
      }

      // 3. Create Team
      const team = await Team.create({
        name: teamName,
        sport: "Futsal",
        teamType: TeamType.EVENT,
        event: event._id,
        formSubmission: submission._id,
        members: members,
      });

      // 4. Link to Event
      event.registeredTeams.push(team._id as any);
      console.log(`  - Seeded team ${i + 1}/16: ${teamName}`);
    }

    await event.save();
    console.log("✅ Successfully seeded 16 teams for Futsal Tournament");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding teams:", error);
    process.exit(1);
  }
};

seed16Teams();
