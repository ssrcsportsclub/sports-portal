import mongoose, { Document, Schema } from "mongoose";

export const TeamType = {
  EVENT: "event", // Tournament/competition teams
  GENERAL: "general", // Club organizational structure
  MEMBER: "member", // Initial club registration
} as const;

export type TeamType = (typeof TeamType)[keyof typeof TeamType];

export interface ITeam extends Document {
  name: string;
  sport: string;
  teamType: TeamType;
  event?: mongoose.Types.ObjectId; // Reference to Event for event teams
  coach?: string;
  executive?: Schema.Types.ObjectId;
  members: Schema.Types.ObjectId[];
  formSubmission?: mongoose.Types.ObjectId; // Reference to the form submission that created this team
}

const TeamSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    sport: { type: String, required: true },
    teamType: {
      type: String,
      enum: Object.values(TeamType),
      required: true,
      default: TeamType.GENERAL,
    },
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
    },
    coach: { type: String },
    executive: { type: Schema.Types.ObjectId, ref: "User" },
    members: [
      {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
      },
    ],
    formSubmission: {
      type: Schema.Types.ObjectId,
      ref: "FormSubmission",
    },
  },
  { timestamps: true },
);

// Indexes
TeamSchema.index({ teamType: 1 });
TeamSchema.index({ event: 1 });
TeamSchema.index({ sport: 1 });

// "My team" looks teams up by member email or executive.
TeamSchema.index({ "members.email": 1 });
TeamSchema.index({ executive: 1 });

// Unique constraint: name must be unique within the same event// Unique constraint: name must be unique within the same event (for event teams)
TeamSchema.index(
  { name: 1, event: 1 },
  {
    unique: true,
    partialFilterExpression: { teamType: TeamType.EVENT },
  },
);

export default mongoose.model<ITeam>("Team", TeamSchema);
