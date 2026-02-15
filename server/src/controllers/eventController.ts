import { Request, Response } from "express";
import Event from "../models/Event.js";
import Team from "../models/Team.js";
import { UserRole } from "../models/User.js";

// @desc    Get all events
// @route   GET /api/events
// @access  Public or Private (Requirements imply all roles can view all events eventually)
export const getEvents = async (req: Request, res: Response) => {
  try {
    const events = await Event.find({}).sort({ date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Get single event by ID
// @route   GET /api/events/:id
// @access  Public
export const getEventById = async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate({
        path: "registeredTeams",
        select: "name sport members teamType",
      })
      .populate("organizer", "name email")
      .populate("form", "isActive formId");
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Create event
// @route   POST /api/events
// @access  Admin
export const createEvent = async (req: Request, res: Response) => {
  try {
    const { title, description, date, location } = req.body;
    const event = await Event.create({
      title,
      description,
      date,
      location,
      organizer: req.user?._id,
    });
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Admin
export const updateEvent = async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    Object.assign(event, req.body);
    const updated = await event.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Admin
export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    await event.deleteOne();
    res.json({ message: "Event removed" });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Register for event
// @route   POST /api/events/:id/register
// @access  Private
export const registerForEvent = async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (!req.user) return res.status(401).json({ message: "Not authorized" });

    if (
      event.participants
        .map((p) => p.toString())
        .includes(req.user._id.toString())
    ) {
      return res.status(400).json({ message: "Already registered" });
    }

    event.participants.push(req.user._id as any);
    await event.save();
    res.json({ message: "Registered successfully" });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Get my registered events
// @route   GET /api/events/my
// @access  Private
export const getMyEvents = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });

    // Find teams where user is a member (by email) or executive (by ID)
    const teams = await Team.find({
      $or: [{ "members.email": req.user.email }, { executive: req.user._id }],
    }).select("event");

    // Extract event IDs from teams
    const teamEventIds = teams
      .map((team) => team.event)
      .filter((id) => id != null);

    // Find events where user is a participant OR belongs to a registered team
    const events = await Event.find({
      $or: [{ participants: req.user._id }, { _id: { $in: teamEventIds } }],
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
