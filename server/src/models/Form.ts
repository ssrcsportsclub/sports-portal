import mongoose, { Document, Schema } from "mongoose";

// Field definition interface
export interface IFormField {
  label?: string;
  type: string; // text, email, number, file, date, select, textarea, members
  name: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  options?: string[]; // For select type
  pattern?: string; // Regex pattern for validation
  fields?: IFormField[]; // For nested "members" type
}

// Form document interface
export interface IForm extends Document {
  formId: string; // Unique slug identifier
  formTitle: string;
  formDescription: string;
  requireSunwayEmail: boolean;
  fields: IFormField[];
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Field schema (supports nested fields)
const FormFieldSchema = new Schema<IFormField>(
  {
    label: { type: String },
    type: {
      type: String,
      required: true,
      enum: [
        "text",
        "email",
        "number",
        "file",
        "date",
        "select",
        "textarea",
        "members",
      ],
    },
    name: { type: String, required: true },
    placeholder: { type: String },
    required: { type: Boolean, default: false },
    min: { type: Number },
    max: { type: Number },
    options: [{ type: String }],
    pattern: { type: String },
    fields: [{ type: Schema.Types.Mixed }], // Recursive for nested fields
  },
  { _id: false },
);

// Form schema
const FormSchema = new Schema<IForm>(
  {
    formId: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    formTitle: {
      type: String,
      required: true,
      trim: true,
    },
    formDescription: {
      type: String,
      required: true,
    },
    requireSunwayEmail: {
      type: Boolean,
      default: false,
    },
    fields: {
      type: [FormFieldSchema],
      required: true,
      validate: {
        validator: function (fields: IFormField[]) {
          return fields.length > 0;
        },
        message: "Form must have at least one field",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
FormSchema.index({ isActive: 1 });
FormSchema.index({ createdBy: 1 });

const Form = mongoose.model<IForm>("Form", FormSchema);

export default Form;
