import mongoose, { Document, Schema } from "mongoose";

/**
 * Controls when members may request equipment. A single document
 * (key "equipment") holds the club-wide setting.
 *
 *  - scheduled: open daily between openHour and closeHour (Nepal time)
 *  - open:      accepting requests at any time
 *  - closed:    not accepting requests
 */
export const REQUEST_WINDOW_MODES = ["scheduled", "open", "closed"] as const;
export type RequestWindowMode = (typeof REQUEST_WINDOW_MODES)[number];

export const REQUEST_WINDOW_TIMEZONE = "Asia/Kathmandu";

export interface IRequestWindow extends Document {
  key: string;
  mode: RequestWindowMode;
  openHour: number; // 0–23, inclusive
  closeHour: number; // 1–24, exclusive
  note?: string; // Optional message shown to members when closed
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const RequestWindowSchema: Schema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "equipment" },
    mode: { type: String, enum: REQUEST_WINDOW_MODES, default: "scheduled" },
    openHour: { type: Number, min: 0, max: 23, default: 9 },
    closeHour: { type: Number, min: 1, max: 24, default: 17 },
    note: { type: String, maxlength: 200 },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.model<IRequestWindow>(
  "RequestWindow",
  RequestWindowSchema,
);
