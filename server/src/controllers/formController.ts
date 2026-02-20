import { Request, Response } from "express";
import Form from "../models/Form.js";
import OTP from "../models/OTP.js";
import bcrypt from "bcryptjs";
import FormSubmission, { SubmissionStatus } from "../models/FormSubmission.js";
import Team, { TeamType } from "../models/Team.js";
import User, { UserRole } from "../models/User.js";
import Event from "../models/Event.js";
import NotificationList from "../models/NotificationList.js";
import MemberRegistration, {
  RegistrationStatus,
  AppliedRole,
} from "../models/MemberRegistration.js";
import {
  sendMembershipApplicationEmail,
  sendMembershipStatusEmail,
  sendUserCredentialsEmail,
} from "../utils/emailHelper.js";

// @desc    Get all forms (optionally include inactive for admins)
// @route   GET /api/forms
// @access  Public (Active only), Private (Admins can see all)
export const getForms = async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === "true";
    const isAdminOrMod =
      req.user &&
      (req.user.role === UserRole.ADMIN ||
        req.user.role === UserRole.MODERATOR);

    const filter: any = {};
    if (!includeInactive || !isAdminOrMod) {
      filter.isActive = true;
    }

    const forms = await Form.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });
    res.json(forms);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Get form by formId
// @route   GET /api/forms/:formId
// @access  Public
export const getFormById = async (req: Request, res: Response) => {
  try {
    const form = await Form.findOne({ formId: req.params.formId }).populate(
      "createdBy",
      "name email",
    );

    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    res.json(form);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Create new form
// @route   POST /api/forms
// @access  Private (Admin only)
export const createForm = async (req: Request, res: Response) => {
  try {
    const { formId, formTitle, formDescription, requireSunwayEmail, fields } =
      req.body;

    // Check if form with same formId exists
    const existingForm = await Form.findOne({ formId });
    if (existingForm) {
      return res
        .status(400)
        .json({ message: "Form with this ID already exists" });
    }

    const form = await Form.create({
      formId,
      formTitle,
      formDescription,
      requireSunwayEmail: requireSunwayEmail || false,
      fields,
      createdBy: req.user!._id,
    });

    // Automatically create an event for this form, unless it's a general member registration form
    const isMembershipForm =
      formId.toLowerCase().includes("member") ||
      formId.toLowerCase().includes("staff") ||
      (formTitle.toLowerCase().includes("registration") &&
        !formTitle.toLowerCase().includes("futsal") &&
        !formTitle.toLowerCase().includes("tournament") &&
        !formTitle.toLowerCase().includes("basketball") &&
        !formTitle.toLowerCase().includes("chess") &&
        !formTitle.toLowerCase().includes("pool") &&
        !formTitle.toLowerCase().includes("badminton") &&
        !formTitle.toLowerCase().includes("table tennis"));

    if (!isMembershipForm) {
      // Use a default date and location since they aren't part of form creation yet
      // In a real scenario, these might be passed in req.body or updated later
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7); // Default to 7 days from now

      await Event.create({
        title: formTitle,
        description: formDescription,
        date: defaultDate,
        location: "College Premises",
        slug: formId,
        form: form._id,
        organizer: req.user!._id,
      });
    }

    res.status(201).json(form);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Update form
// @route   PUT /api/forms/:formId
// @access  Private (Admin + Moderator)
export const updateForm = async (req: Request, res: Response) => {
  try {
    const { formTitle, formDescription, requireSunwayEmail, fields, isActive } =
      req.body;

    const form = await Form.findOne({ formId: req.params.formId });

    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    // Restriction: Moderators cannot update registration/membership forms
    const membershipFormIdsList = [
      "student-registration",
      "general-member-registration",
    ];
    if (
      req.user!.role === UserRole.MODERATOR &&
      membershipFormIdsList.includes(req.params.formId)
    ) {
      return res.status(403).json({
        message:
          "Moderators are not authorized to update the registration form",
      });
    }

    // Update fields
    if (formTitle) form.formTitle = formTitle;
    if (formDescription) form.formDescription = formDescription;
    if (typeof requireSunwayEmail === "boolean")
      form.requireSunwayEmail = requireSunwayEmail;
    if (fields) form.fields = fields;
    if (typeof isActive === "boolean") form.isActive = isActive;

    await form.save();

    res.json(form);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Delete form (soft delete by setting isActive to false)
// @route   DELETE /api/forms/:formId
// @access  Private (Admin only)
export const deleteForm = async (req: Request, res: Response) => {
  try {
    const form = await Form.findOne({ formId: req.params.formId });

    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    form.isActive = false;
    await form.save();

    res.json({ message: "Form deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Hard delete form (permanent)
// @route   DELETE /api/forms/:formId/hard
// @access  Private (Admin only)
export const hardDeleteForm = async (req: Request, res: Response) => {
  try {
    const form = await Form.findOne({ formId: req.params.formId });

    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    // Delete all submissions associated with this form
    await FormSubmission.deleteMany({ form: form._id });

    // Delete the form itself
    await form.deleteOne();

    res.json({ message: "Form and all associated data permanently removed" });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Submit form data
// @route   POST /api/forms/:formId/submit
// @access  Private (Authenticated users)
export const submitForm = async (req: Request, res: Response) => {
  try {
    const form = await Form.findOne({
      formId: req.params.formId,
      isActive: true,
    });

    if (!form) {
      return res.status(404).json({ message: "Form not found or inactive" });
    }

    // Backend Validation for OTP and Sunway Email
    if (form.requireSunwayEmail) {
      const email = req.body.email;
      if (!email || !email.toLowerCase().endsWith("@sunway.edu.np")) {
        return res.status(400).json({
          message: "A valid @sunway.edu.np email is required for this form.",
        });
      }

      // Check if email is verified in OTP collection
      const otpRecord = await OTP.findOne({
        email: email.toLowerCase(),
        isVerified: true,
      });
      if (!otpRecord) {
        return res.status(400).json({
          message:
            "Email verification required. Please verify your email with OTP first.",
        });
      }

      // Optional: Check if OTP is too old (e.g., more than 1 hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (otpRecord.updatedAt < oneHourAgo) {
        return res.status(400).json({
          message: "Email verification has expired. Please verify again.",
        });
      }
    }
    const membershipFormIds = [
      "general-member-registration",
      "student-registration",
    ];
    const isMembershipSubmission = membershipFormIds.includes(
      req.params.formId,
    );

    if (isMembershipSubmission) {
      // --- Membership Registration path: only save to MemberRegistration ---
      const { name, email, phone, collegeId, sportsInterests } = req.body;
      const appliedRole =
        req.params.formId === "general-member-registration"
          ? AppliedRole.SC_MEMBER
          : AppliedRole.GENERAL_MEMBER;

      const existingMember = await MemberRegistration.findOne({
        $or: [{ email }, { collegeId }],
        status: { $ne: RegistrationStatus.REJECTED },
      });

      if (existingMember) {
        return res.status(400).json({
          message:
            "You have already submitted a membership application with this email address or college ID.",
        });
      }

      const registration = await MemberRegistration.create({
        name,

        email,
        phone,
        collegeId,
        appliedRole,
        sportsInterests,
        status: RegistrationStatus.PENDING,
      });

      // Send confirmation email
      await sendMembershipApplicationEmail(email, name, appliedRole);

      return res.status(201).json(registration);
    }

    // --- Regular form path: save to FormSubmission ---

    // Check for duplicate submission by email for this specific form
    if (req.body.email) {
      const existingSubmission = await FormSubmission.findOne({
        form: form._id,
        "data.email": req.body.email.toLowerCase(),
      });

      if (existingSubmission) {
        return res.status(400).json({
          message:
            "You have already submitted a form for this event with this email address.",
        });
      }
    }

    // Check for duplicate members within the same submission
    if (req.body.members && Array.isArray(req.body.members)) {
      const memberEmails = req.body.members
        .map((m: any) => m.email?.toLowerCase())
        .filter((email: string) => email);

      const uniqueEmails = new Set(memberEmails);
      if (uniqueEmails.size !== memberEmails.length) {
        // Find which email is duplicated for a better error message
        const duplicates = memberEmails.filter(
          (email: string, index: number) =>
            memberEmails.indexOf(email) !== index,
        );
        return res.status(400).json({
          message: `Duplicate member email found: ${duplicates[0]}. Each team member must have a unique email.`,
        });
      }
    }

    const submission = await FormSubmission.create({
      form: form._id,
      submittedBy: req.body.name || req.body.field_1,
      data: req.body,
      status: SubmissionStatus.PENDING,
    });

    res.status(201).json(submission);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
    console.log(error);
  }
};

// @desc    Get form submissions
// @route   GET /api/forms/:formId/submissions
// @access  Private (Admin + Moderator)
export const getFormSubmissions = async (req: Request, res: Response) => {
  try {
    const form = await Form.findOne({ formId: req.params.formId });

    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    // Restriction: Moderators cannot view registration form submissions
    if (
      req.user!.role === UserRole.MODERATOR &&
      (req.params.formId === "student-registration" ||
        req.params.formId === "general-member-registration")
    ) {
      return res.status(403).json({
        message:
          "Moderators are not authorized to access registration form submissions",
      });
    }

    const { status } = req.query;
    const filter: any = { form: form._id };

    if (status) {
      filter.status = status;
    }

    const submissions = await FormSubmission.find(filter).sort({
      submittedAt: -1,
    });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Update submission status and optionally create team
// @route   PATCH /api/forms/submissions/:id/status
// @access  Private (Admin + Moderator)
export const updateSubmissionStatus = async (req: Request, res: Response) => {
  try {
    const { status, reviewNotes, createTeam } = req.body;

    const submission = await FormSubmission.findById(req.params.id).populate(
      "form",
    );

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Restriction: Moderators cannot update registration form submissions
    if (
      req.user!.role === UserRole.MODERATOR &&
      (submission.form as any).formId === "registration"
    ) {
      return res.status(403).json({
        message:
          "Moderators are not authorized to update registration form submissions",
      });
    }

    submission.status = status;
    submission.reviewNotes = reviewNotes;
    submission.reviewedBy = req.user!._id;
    submission.reviewedAt = new Date();

    await submission.save();

    // If approved and createTeam is true, create an event team
    if (status === SubmissionStatus.APPROVED && createTeam) {
      const formData = submission.data;

      console.log(
        "[Team Creation] Form data:",
        JSON.stringify(formData, null, 2),
      );

      // Extract members from form data - handle various field naming conventions
      let members = [];

      if (formData.members && Array.isArray(formData.members)) {
        // If members array exists, use it directly
        members = formData.members;
      } else {
        // Otherwise, construct a single member entry from individual fields
        const memberEntry: any = {};

        // Try to find name field (various naming conventions)
        const nameField =
          formData.name ||
          formData.team_leader ||
          formData.full_name ||
          formData.captain_name;
        if (nameField) memberEntry.name = nameField;

        // Try to find email field
        const emailField =
          formData.email || formData.team_email || formData.contact_email;
        if (emailField) memberEntry.email = emailField;

        // Try to find phone field
        const phoneField =
          formData.phone ||
          formData.contact ||
          formData.phone_number ||
          formData.mobile;
        if (phoneField) memberEntry.phone = phoneField;

        // Only add if we have at least name and email
        if (memberEntry.name && memberEntry.email) {
          members.push(memberEntry);
        }
      }

      console.log(
        "[Team Creation] Extracted members:",
        JSON.stringify(members, null, 2),
      );

      // Create team from submission data ONLY if a matching event exists
      const eventSlug = (submission.form as any).formId;
      const event = await Event.findOne({ slug: eventSlug });

      if (event) {
        const team = await Team.create({
          name:
            formData.team_name || formData.full_name || formData.name || "Team",
          sport: (submission.form as any).formTitle
            .replace(/Registration/gi, "")
            .replace(/Form/gi, "")
            .replace(/Enrollment/gi, "")
            .replace(/\s\s+/g, " ")
            .trim(),
          teamType:
            (submission.form as any).formId === "registration"
              ? TeamType.MEMBER
              : TeamType.EVENT,
          formSubmission: submission._id,
          members: members,
          event: event._id as any,
        });

        console.log("[Team Creation] Team created successfully:", team._id);

        event.registeredTeams.push(team._id as any);
        await event.save();

        console.log("[Team Creation] Team linked to event:", event.title);

        await submission.populate("reviewedBy", "name email");
        return res.json({ submission, team });
      } else {
        console.log(
          "[Team Creation] Skipping team creation: No matching event found for formId:",
          eventSlug,
        );
      }

      await submission.populate("reviewedBy", "name email");
      return res.json(submission);
    }

    await submission.populate("reviewedBy", "name email");
    res.json(submission);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
    console.log(error);
  }
};

// @desc    Get all submissions (for admin dashboard)
// @route   GET /api/forms/submissions
// @access  Private (Admin + Moderator)
export const getAllSubmissions = async (req: Request, res: Response) => {
  try {
    const { status, limit = 50 } = req.query;
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    // Restriction: If moderator, exclude membership form submissions
    if (req.user!.role === UserRole.MODERATOR) {
      const membershipForms = await Form.find({
        formId: {
          $in: [
            "registration",
            "student-registration",
            "general-member-registration",
          ],
        },
      }).select("_id");
      const membershipFormIds = membershipForms.map((f) => f._id);
      if (membershipFormIds.length > 0) {
        filter.form = { $nin: membershipFormIds };
      }
    }

    const submissions = await FormSubmission.find(filter)
      .populate("form", "formTitle formId")
      .populate("submittedBy", "name email")
      .populate("reviewedBy", "name email")
      .sort({ submittedAt: -1 })
      .limit(Number(limit));

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Get all membership registrations
// @route   GET /api/forms/membership-registrations
// @access  Private (Admin only)
export const getMemberRegistrations = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const registrations = await MemberRegistration.find(filter)
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 });

    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Update membership registration status
// @route   PATCH /api/forms/membership-registrations/:id/status
// @access  Private (Admin only)
// Helper to process a single registration status update
const processRegistrationStatusUpdate = async (
  id: string,
  status: string,
  note?: string,
  adminId?: string,
) => {
  const registration = await MemberRegistration.findById(id);
  if (!registration) throw new Error(`Registration ${id} not found`);

  // Only allow status updates if the current status is pending
  if (registration.status !== RegistrationStatus.PENDING) {
    throw new Error(
      `Registration ${id} is already ${registration.status} and cannot be updated.`,
    );
  }

  registration.status = status as any;
  if (adminId) registration.reviewedBy = adminId as any;
  registration.reviewedAt = new Date();
  if (note) registration.note = note;

  await registration.save();

  // Automated Account Creation on Approval
  if (status === RegistrationStatus.APPROVED) {
    const namePart = registration.name
      .replace(/\s+/g, "")
      .substring(0, 6)
      .toLowerCase();
    const randomPart = Math.floor(100000 + Math.random() * 900000).toString();
    const generatedPassword = `${namePart}${randomPart}`;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(generatedPassword, salt);

    let user = await User.findOne({ email: registration.email });
    if (!user) {
      user = await User.create({
        name: registration.name,
        email: registration.email,
        password: hashedPassword,
        role: registration.appliedRole as unknown as UserRole,
      });
    } else {
      user.role = registration.appliedRole as unknown as UserRole;
      user.password = hashedPassword;
      await user.save();
    }

    await sendUserCredentialsEmail(
      registration.email,
      generatedPassword,
      registration.name,
      registration.appliedRole as unknown as string,
    );

    // Automatically subscribe to announcements
    try {
      let list = await NotificationList.findOne({ name: "announcements" });
      if (!list) {
        list = await NotificationList.create({
          name: "announcements",
          emails: [],
        });
      }
      if (!list.emails.includes(registration.email)) {
        list.emails.push(registration.email);
        await list.save();
        console.log(
          `[NotificationList] Subscribed approved user: ${registration.email}`,
        );
      }
    } catch (notifError) {
      console.error("[NotificationList] Error subscribing user:", notifError);
    }
  }

  // Send status update email
  await sendMembershipStatusEmail(
    registration.email,
    registration.name,
    status as any,
    registration.appliedRole,
    note,
  );

  return registration;
};

// @desc    Update membership registration status
// @route   PATCH /api/forms/membership-registrations/:id/status
// @access  Private (Admin only)
export const updateMemberRegistrationStatus = async (
  req: Request,
  res: Response,
) => {
  try {
    const { status, note } = req.body;
    const registration = await processRegistrationStatusUpdate(
      req.params.id,
      status,
      note,
      String(req.user?._id),
    );
    res.json(registration);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Bulk update membership registration status
// @route   PATCH /api/forms/membership-registrations/bulk/status
// @access  Private (Admin only)
export const bulkUpdateMemberRegistrationStatus = async (
  req: Request,
  res: Response,
) => {
  try {
    const { ids, status, note } = req.body;

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: "Invalid IDs provided" });
    }

    const results = [];
    const errors = [];

    for (const id of ids) {
      try {
        const registration = await processRegistrationStatusUpdate(
          id,
          status,
          note,
          String(req.user?._id),
        );
        results.push(registration);
      } catch (err) {
        errors.push({ id, message: (err as Error).message });
      }
    }

    res.json({
      message: `Processed ${results.length} registrations. ${errors.length} errors.`,
      results,
      errors,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
