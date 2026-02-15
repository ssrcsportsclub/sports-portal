import mongoose, { Document, Schema } from "mongoose";

export interface IDraw extends Document {
  event: mongoose.Types.ObjectId;
  format: "Group" | "Knockout";
  sport: string;
  teamSize?: number; // Only for Group format
  drawnTeams: mongoose.Types.ObjectId[]; // Teams in draw order
  matchResults?: Record<string, string>; // matchId -> teamId (winner)
  matchScores?: Record<string, string>; // matchId -> score (e.g. "2 - 1")
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const DrawSchema: Schema = new Schema(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    format: {
      type: String,
      enum: ["Group", "Knockout"],
      required: true,
    },
    sport: {
      type: String,
      required: true,
    },
    teamSize: {
      type: Number,
    },
    drawnTeams: [
      {
        type: Schema.Types.ObjectId,
        ref: "Team",
      },
    ],
    matchResults: {
      type: Map,
      of: String,
      default: {},
    },
    matchScores: {
      type: Map,
      of: String,
      default: {},
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

// Indexes
DrawSchema.index({ event: 1 });
DrawSchema.index({ createdAt: -1 });

export default mongoose.model<IDraw>("Draw", DrawSchema);
