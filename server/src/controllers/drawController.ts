import { Request, Response } from "express";
import Draw from "../models/Draw.js";
import Event from "../models/Event.js";

// @desc    Create a new draw
// @route   POST /api/draws
// @access  Private (Admin)
export const createDraw = async (req: Request, res: Response) => {
  try {
    const { event, format, sport, teamSize, drawnTeams } = req.body;

    // Verify event exists
    const eventExists = await Event.findById(event);
    if (!eventExists) {
      return res.status(404).json({ message: "Event not found" });
    }

    const draw = await Draw.create({
      event,
      format,
      sport,
      teamSize,
      drawnTeams,
      createdBy: req.user?._id,
    });

    res.status(201).json(draw);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Get all draws for an event
// @route   GET /api/draws/event/:eventId
// @access  Public
export const getDrawsByEvent = async (req: Request, res: Response) => {
  try {
    const draws = await Draw.find({ event: req.params.eventId })
      .populate({
        path: "drawnTeams",
        select: "name sport members teamType",
      })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json(draws);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Delete a draw
// @route   DELETE /api/draws/:id
// @access  Private (Admin)
export const deleteDraw = async (req: Request, res: Response) => {
  try {
    const draw = await Draw.findById(req.params.id);
    if (!draw) {
      return res.status(404).json({ message: "Draw not found" });
    }

    await draw.deleteOne();
    res.json({ message: "Draw deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Update draw match results
// @route   PATCH /api/draws/:id/results
// @access  Private (Admin)
export const updateDrawResults = async (req: Request, res: Response) => {
  try {
    const { matchResults } = req.body;
    const draw = await Draw.findById(req.params.id).populate("event");
    if (!draw) {
      return res.status(404).json({ message: "Draw not found" });
    }

    // Check if event has started
    const now = new Date();
    const event = draw.event as any;
    if (event && now < new Date(event.date)) {
      return res.status(400).json({
        message: "Cannot update match results before the event starts",
      });
    }

    if (matchResults) {
      Object.entries(matchResults).forEach(([matchId, winnerId]) => {
        (draw.matchResults as any).set(matchId, winnerId);
      });
    }
    await draw.save();

    // Populate drawnTeams before returning
    await draw.populate({
      path: "drawnTeams",
      select: "name sport members teamType",
    });

    res.json(draw);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Update match score
// @route   PATCH /api/draws/:id/score
// @access  Private (Admin)
export const updateMatchScore = async (req: Request, res: Response) => {
  try {
    const { matchScores } = req.body; // Expecting { [matchId]: score }
    const draw = await Draw.findById(req.params.id).populate("event");
    if (!draw) {
      return res.status(404).json({ message: "Draw not found" });
    }

    // Check if event has started
    const now = new Date();
    const event = draw.event as any;
    if (event && now < new Date(event.date)) {
      return res.status(400).json({
        message: "Cannot update match scores before the event starts",
      });
    }

    // Merge new scores into existing map using .set() for Mongoose Map compatibility
    if (matchScores) {
      Object.entries(matchScores).forEach(([matchId, score]) => {
        (draw.matchScores as any).set(matchId, score);
      });
    }
    await draw.save();

    // Populate drawnTeams before returning
    await draw.populate({
      path: "drawnTeams",
      select: "name sport members teamType",
    });

    res.json(draw);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
