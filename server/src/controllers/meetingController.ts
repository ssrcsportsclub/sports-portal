import type { Request, Response } from "express";
import Meeting from "../models/Meeting.js";
import { sendMeetingInvitationEmail } from "../utils/emailHelper.js";

type RecipientInput = string | { email: string; name?: string };

const normalizeRecipients = (
  list?: RecipientInput | RecipientInput[],
): { email: string; name?: string }[] => {
  if (!list) return [];
  const arr = Array.isArray(list) ? list : [list];
  const normalized = arr
    .map((item) =>
      typeof item === "string"
        ? { email: item, name: undefined }
        : { email: item.email, name: item.name },
    )
    .filter((item) => item.email);

  const seen = new Set<string>();
  return normalized.filter((item) => {
    const key = item.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const createMeeting = async (req: Request, res: Response) => {
  try {
    const {
      title,
      topic,
      type,
      venue,
      roomNo,
      meetingLink,
      date,
      time,
      participants, // optional array of emails or { email, name }
      recipientName, // optional greeting provided by frontend
      to,
      cc,
      bcc,
    } = req.body;

    if (!title || !topic || !type || !date || !time) {
      return res
        .status(400)
        .json({ message: "Title, topic, type, date and time are required" });
    }

    if (type === "physical" && !venue) {
      return res
        .status(400)
        .json({ message: "Venue is required for physical meetings" });
    }

    if (type === "virtual" && !meetingLink) {
      return res
        .status(400)
        .json({ message: "Meeting link is required for virtual meetings" });
    }

    const toArr = Array.isArray(to) ? to : to ? [to] : [];
    const ccArr = Array.isArray(cc) ? cc : cc ? [cc] : [];
    const bccArr = Array.isArray(bcc) ? bcc : bcc ? [bcc] : [];
    const participantArr = Array.isArray(participants)
      ? participants
      : participants
        ? [participants]
        : [];

    const allRecipientObjects = normalizeRecipients([
      ...participantArr,
      ...toArr,
      ...ccArr,
      ...bccArr,
    ]);

    if (allRecipientObjects.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one recipient (to/cc/bcc) is required" });
    }

    const participantEmails = allRecipientObjects.map((p) => p.email);

    const meeting = await Meeting.create({
      title,
      topic,
      type,
      venue,
      roomNo,
      meetingLink,
      date,
      time,
      participants: participantEmails,
      createdBy: req.user!._id,
    });

    // Determine location string
    const location =
      type === "virtual"
        ? meetingLink
        : `${venue}${roomNo ? `, Room ${roomNo}` : ""}`;

    try {
      await sendMeetingInvitationEmail({
        recipientName: recipientName || undefined,
        to,
        cc,
        bcc,
        title,
        topic,
        date,
        time,
        location: location || "",
        meetingLink: type === "virtual" ? meetingLink : undefined,
        type,
        venue,
        roomNo,
        allParticipants: allRecipientObjects,
      });
    } catch (emailErr) {
      console.error("[Meeting] Failed to send meeting invitation:", emailErr);
    }

    res.status(201).json(meeting);
  } catch (error: any) {
    console.error("Error creating meeting:", error);
    res.status(500).json({ message: "Failed to create meeting" });
  }
};

export const getMeetings = async (req: Request, res: Response) => {
  try {
    const userEmail = req.user?.email;
    const userRole = req.user?.role;

    let meetings;

    // Admins see all meetings
    if (userRole === "admin") {
      meetings = await Meeting.find()
        .populate("createdBy", "name email")
        .sort({ date: -1 })
        .lean();
    } else {
      // Other users only see meetings they are participants of
      meetings = await Meeting.find({ participants: userEmail })
        .populate("createdBy", "name email")
        .sort({ date: -1 })
        .lean();
    }

    res.json(meetings);
  } catch (error: any) {
    console.error("Error fetching meetings:", error);
    res.status(500).json({ message: "Failed to fetch meetings" });
  }
};

export const getMeetingById = async (req: Request, res: Response) => {
  try {
    const meeting = await Meeting.findById(req.params.id).populate(
      "createdBy",
      "name email",
    );

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    res.json(meeting);
  } catch (error: any) {
    console.error("Error fetching meeting:", error);
    res.status(500).json({ message: "Failed to fetch meeting" });
  }
};

export const deleteMeeting = async (req: Request, res: Response) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    await meeting.deleteOne();
    res.json({ message: "Meeting deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting meeting:", error);
    res.status(500).json({ message: "Failed to delete meeting" });
  }
};
