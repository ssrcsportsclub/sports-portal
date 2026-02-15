import mongoose from "mongoose";
import dotenv from "dotenv";
import FormSubmission from "../models/FormSubmission.js";
import Form from "../models/Form.js";

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/sports_club";
const FORM_ID = "futsal"; // The formId from the DB
const FORM_MONGO_ID = "698615b208bd4fb372b04a03";

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const form = await Form.findOne({ formId: FORM_ID });
    if (!form) {
      console.error("Form not found!");
      process.exit(1);
    }

    const dummyTeams = [];
    for (let i = 1; i <= 14; i++) {
      const teamName = `Dummy Team ${i}`;
      const captainName = `Captain ${i}`;
      const captainEmail = `captain${i}@sunway.edu.np`;
      const captainNumber = `98000000${i.toString().padStart(2, "0")}`;

      const members = [];
      for (let j = 1; j <= 5; j++) {
        members.push({
          name: `Player ${i}-${j}`,
          email: `p${i}.${j}@sunway.edu.np`,
          phone: `98111111${i}${j}`,
        });
      }

      const submissionData = {
        name: captainName,
        email: captainEmail,
        number: captainNumber,
        team_name: teamName,
        members: members,
      };

      dummyTeams.push({
        form: form._id,
        submittedBy: captainName,
        data: submissionData,
        status: "pending",
        submittedAt: new Date(),
      });
    }

    await FormSubmission.insertMany(dummyTeams);
    console.log(`Successfully seeded 14 dummy teams for form: ${FORM_ID}`);

    process.exit(0);
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
}

seed();
