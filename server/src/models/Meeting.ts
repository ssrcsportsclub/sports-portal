import mongoose, { Document, Schema } from "mongoose";

export type MeetingType = "virtual" | "physical";

export interface IMeeting extends Document {
  title: string;
  topic: string;
  type: MeetingType;
  venue?: string;
  roomNo?: string;
  meetingLink?: string;
  date: Date;
  time: string; // e.g. "15:00"
  participants: string[]; // emails (internal + external)
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MeetingSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    topic: { type: String, required: true },
    type: {
      type: String,
      enum: ["virtual", "physical"],
      required: true,
    },
    venue: { type: String },
    roomNo: { type: String },
    meetingLink: { type: String },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    participants: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export default mongoose.model<IMeeting>("Meeting", MeetingSchema);
