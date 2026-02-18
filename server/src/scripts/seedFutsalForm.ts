import mongoose from "mongoose";
import dotenv from "dotenv";
import Form from "../models/Form.js";
import Event from "../models/Event.js";
import User from "../models/User.js";

dotenv.config();

const seedFutsalForm = async () => {
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

    const futsalFormId = "futsal-sports-month-2026";

    // Clear existing form and event if they exist
    await Form.deleteOne({ formId: futsalFormId });
    await Event.deleteOne({ slug: futsalFormId });

    const form = await Form.create({
      formId: futsalFormId,
      formTitle: "Sports Month - Futsal Tournament 2026 registration",
      formDescription:
        "1st 16 teams will be selected. So it is first come first serve basis. So please register fast.",
      requireSunwayEmail: false,
      fields: [
        { label: "Capt. name", type: "text", name: "name", required: true },
        { label: "Capt. email", type: "email", name: "email", required: true },
        { label: "Capt. phone", type: "number", name: "phone", required: true },
        { label: "Team name", type: "text", name: "team_name", required: true },
        {
          label: "Members",
          type: "members",
          name: "members",
          required: false,
          min: 5,
          max: 8,
          fields: [
            {
              label: "Player Name",
              type: "text",
              name: "name",
              required: true,
            },
            {
              label: "Email Address",
              type: "email",
              name: "email",
              required: true,
            },
            {
              label: "Phone Number",
              type: "number",
              name: "phone",
              required: true,
            },
          ],
        },
      ],
      isActive: true,
      createdBy: adminUser._id,
    });

    const defaultDate = new Date("2026-03-01T10:00:00Z"); // Set a reasonable future date

    await Event.create({
      title: form.formTitle,
      description: form.formDescription,
      date: defaultDate,
      location: "College Premises",
      slug: form.formId,
      form: form._id,
      organizer: adminUser._id,
    });

    console.log("✅ Successfully seeded Futsal form and linked event");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding Futsal form:", error);
    process.exit(1);
  }
};

seedFutsalForm();
