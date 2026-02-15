import mongoose, { Document, Schema } from "mongoose";

export interface IEvent extends Document {
  title: string;
  description: string;
  date: Date;
  endDate?: Date;
  location: string;
  slug?: string;
  form?: Schema.Types.ObjectId;
  registeredTeams: Schema.Types.ObjectId[];
  organizer?: Schema.Types.ObjectId;
  participants: Schema.Types.ObjectId[];
}

const EventSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    endDate: { type: Date },
    location: { type: String, required: true },
    slug: { type: String }, // Link to the dynamic form slug (formId)
    form: { type: Schema.Types.ObjectId, ref: "Form" },
    registeredTeams: [{ type: Schema.Types.ObjectId, ref: "Team" }],
    organizer: { type: Schema.Types.ObjectId, ref: "User" },
    participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

export default mongoose.model<IEvent>("Event", EventSchema);
