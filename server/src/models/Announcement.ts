import mongoose, { Document, Schema } from "mongoose";

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  author: Schema.Types.ObjectId;
  targetRole?: string; // Optional: restrict who sees it
  comments: {
    userId: Schema.Types.ObjectId;
    response: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
  reactions: {
    emoji: string;
    users: Schema.Types.ObjectId[];
  }[];
}

const AnnouncementSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetRole: { type: String },
    comments: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        response: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    reactions: [
      {
        emoji: { type: String, required: true },
        users: [{ type: Schema.Types.ObjectId, ref: "User" }],
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model<IAnnouncement>(
  "Announcement",
  AnnouncementSchema,
);
