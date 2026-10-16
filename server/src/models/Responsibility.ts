import mongoose, { Document, Schema } from "mongoose";

export enum RequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  RETURNED = "returned",
  OVERDUE = "overdue",
  WAITING = "waiting",
  TRANSFERRED = "transferred",
}

export interface IResponsibility extends Document {
  user: Schema.Types.ObjectId;
  equipment: Schema.Types.ObjectId;
  quantity: number;
  requestDate: Date;
  issueDate?: Date;
  returnDate?: Date;
  dueDate?: Date;
  status: RequestStatus;
  notes?: string;
  transferChain?: {
    fromUser: Schema.Types.ObjectId;
    toUser: Schema.Types.ObjectId;
    date: Date;
  }[];
  approvedBy?: Schema.Types.ObjectId;
}

const ResponsibilitySchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    equipment: {
      type: Schema.Types.ObjectId,
      ref: "Equipment",
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    requestDate: { type: Date, default: Date.now },
    issueDate: { type: Date }, // When admin approves/gives it
    returnDate: { type: Date }, // Actual return
    dueDate: { type: Date },
    status: {
      type: String,
      enum: Object.values(RequestStatus),
      default: RequestStatus.PENDING,
    },
    notes: { type: String },
    transferChain: [
      {
        fromUser: { type: Schema.Types.ObjectId, ref: "User" },
        toUser: { type: Schema.Types.ObjectId, ref: "User" },
        date: { type: Date, default: Date.now },
      },
    ],
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Indexes for the hot queries: "my requests", anti-hoarding checks,
// FIFO waitlists per item and status filters.
ResponsibilitySchema.index({ user: 1, equipment: 1, status: 1 });
ResponsibilitySchema.index({ equipment: 1, status: 1, requestDate: 1 });
ResponsibilitySchema.index({ status: 1 });

export default mongoose.model<IResponsibility>(
  "Responsibility",
  ResponsibilitySchema,
);
