import mongoose, { Document, Schema } from "mongoose";

export enum UserRole {
  USER = "user", // Member
  MODERATOR = "moderator", // General Member
  SUPERUSER = "superuser", // College Staff
  ADMIN = "admin", // Club Executive
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; // Optional if using OAuth later, but mainly for local auth
  role: UserRole;
  team?: string; // ID of the team if they belong to one
  isBanned: boolean;
  createdAt: Date;
  phone?: string;
  studentId?: string;
  lastProfileUpdate?: Date;
  lastPasswordUpdate?: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    team: { type: Schema.Types.ObjectId, ref: "Team" },
    isBanned: { type: Boolean, default: false },
    phone: { type: String },
    studentId: { type: String },
    lastProfileUpdate: { type: Date },
    lastPasswordUpdate: { type: Date },
    pushNotificationsEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Members page: filter by role, newest first.
UserSchema.index({ role: 1, createdAt: -1 });

export default mongoose.model<IUser>("User", UserSchema);
