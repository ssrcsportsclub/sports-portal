import { Request, Response } from "express";
import User, { UserRole } from "../models/User.js";
import Equipment from "../models/Equipment.js";
import Event from "../models/Event.js";
import Team from "../models/Team.js";
import Responsibility, { RequestStatus } from "../models/Responsibility.js";
import Announcement from "../models/Announcement.js";

// @desc    Get dashboard summary based on role
// @route   GET /api/dashboard/summary
// @access  Private
export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    const userId = req.user?._id;

    // Every query below is independent, so run them concurrently.
    const common = {
      announcements: Announcement.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      upcomingEvents: Event.find({ date: { $gte: new Date() } })
        .sort({ date: 1 })
        .limit(5)
        .lean(),
    };

    let byRole: Record<string, Promise<unknown>>;
    if (role === UserRole.ADMIN) {
      byRole = {
        totalUsers: User.countDocuments(),
        totalEquipment: Equipment.countDocuments(),
        totalTeams: Team.countDocuments(),
        pendingRequests: Responsibility.countDocuments({
          status: RequestStatus.PENDING,
        }),
      };
    } else if (role === UserRole.SUPERUSER) {
      byRole = {
        totalEquipment: Equipment.countDocuments(),
        managedResponsibilities: Responsibility.countDocuments({
          status: { $ne: RequestStatus.RETURNED },
        }),
      };
    } else if (role === UserRole.MODERATOR) {
      byRole = {
        membersCount: User.countDocuments({ role: UserRole.USER }),
        myTeam: Team.findOne({ executive: userId })
          .populate("members", "name")
          .lean(),
      };
    } else {
      // Regular User
      byRole = {
        myRegisteredEventsCount: Event.countDocuments({ participants: userId }),
        myTeam: Team.findOne({ members: userId })
          .populate("members", "name")
          .lean(),
        myRequestsCount: Responsibility.countDocuments({ user: userId }),
      };
    }

    const entries = Object.entries({ ...common, ...byRole });
    const values = await Promise.all(entries.map(([, query]) => query));
    const data = Object.fromEntries(
      entries.map(([key], i) => [key, values[i]]),
    );

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
