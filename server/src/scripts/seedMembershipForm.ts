import mongoose from "mongoose";
import dotenv from "dotenv";
import Form from "../models/Form.js";
import User from "../models/User.js";

dotenv.config();

const seedMembershipForms = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/sports_club",
    );
    console.log("MongoDB Connected");

    const adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      console.error("No admin user found. Please create an admin user first.");
      process.exit(1);
    }

    const forms = [
      {
        formId: "sc-member-registration",
        formTitle: "SC Member Registration",
        formDescription:
          "Apply to become a Sports Club Committee Member (Moderator role).",
        requireSunwayEmail: true,
        fields: [
          {
            name: "name",
            label: "Full Name",
            type: "text",
            required: true,
            placeholder: "Enter your full name",
          },
          {
            name: "email",
            label: "College Email",
            type: "email",
            required: true,
            placeholder: "yourname@sunway.edu.np",
          },
          {
            name: "phone",
            label: "Phone Number",
            type: "tel",
            required: true,
            placeholder: "98XXXXXXXX",
          },
          {
            name: "collegeId",
            label: "College ID",
            type: "text",
            required: true,
            placeholder: "e.g. 2023-1-001",
          },
        ],
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        formId: "general-member-registration",
        formTitle: "General Member Enrollment",
        formDescription:
          "Join the Sports Club as a General Member (User role).",
        requireSunwayEmail: true,
        fields: [
          {
            name: "name",
            label: "Full Name",
            type: "text",
            required: true,
            placeholder: "Enter your full name",
          },
          {
            name: "email",
            label: "College Email",
            type: "email",
            required: true,
            placeholder: "yourname@sunway.edu.np",
          },
          {
            name: "phone",
            label: "Phone Number",
            type: "tel",
            required: true,
            placeholder: "98XXXXXXXX",
          },
          {
            name: "collegeId",
            label: "College ID",
            type: "text",
            required: true,
            placeholder: "e.g. 2023-1-001",
          },
          {
            name: "sportsInterests",
            label: "Sports Interests",
            type: "text",
            required: true,
            placeholder: "e.g. Futsal, Chess, Cricket",
          },
        ],
        isActive: true,
        createdBy: adminUser._id,
      },
    ];

    for (const formData of forms) {
      await Form.findOneAndUpdate({ formId: formData.formId }, formData, {
        upsert: true,
        new: true,
      });
      console.log(`✅ Seeded/Updated form: ${formData.formTitle}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error seeding membership forms:", error);
    process.exit(1);
  }
};

seedMembershipForms();
