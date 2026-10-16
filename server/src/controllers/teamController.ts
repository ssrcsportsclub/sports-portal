import { Request, Response } from "express";
import Team from "../models/Team.js";
import User, { UserRole } from "../models/User.js";

// @desc    Get all teams
// @route   GET /api/teams
// @access  Admin/Superuser/Moderator
export const getTeams = async (req: Request, res: Response) => {
  try {
    const teams = await Team.find({
      event: { $exists: true, $ne: null },
    })
      .populate("executive", "name email")
      .lean();
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Get my team
// @route   GET /api/teams/my
// @access  Private
export const getMyTeam = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });

    // Find teams where user is a member (by email) or executive (by ID)
    const teams = await Team.find({
      $or: [{ "members.email": req.user.email }, { executive: req.user._id }],
    })
      .populate("executive", "name email")
      // Only what the page shows and filters on, not the whole event.
      .populate("event", "title date endDate location")
      .lean();

    // Filter out teams if the event doesn't exist or has ended
    const filteredTeams = teams.filter((team) => {
      const event = team.event as any;
      if (!event) return false;

      const eventEndDate = event.endDate || event.date;
      return new Date(eventEndDate) >= new Date();
    });

    res.json(filteredTeams);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Create team
// @route   POST /api/teams
// @access  Admin
export const createTeam = async (req: Request, res: Response) => {
  try {
    const { name, sport, coach, executive, members } = req.body;
    const team = await Team.create({
      name,
      sport,
      coach,
      executive,
      members: members || [],
    });
    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Update team
// @route   PUT /api/teams/:id
// @access  Admin
export const updateTeam = async (req: Request, res: Response) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found" });

    Object.assign(team, req.body);
    const updated = await team.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Delete team
// @route   DELETE /api/teams/:id
// @access  Admin
export const deleteTeam = async (req: Request, res: Response) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found" });

    await team.deleteOne();
    res.json({ message: "Team removed" });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
