import { Request, Response } from "express";
import RequestWindow, {
  REQUEST_WINDOW_TIMEZONE,
  type IRequestWindow,
} from "../models/RequestWindow.js";

type WindowSettings = Pick<
  IRequestWindow,
  "mode" | "openHour" | "closeHour" | "note"
> & {
  updatedAt?: Date;
  updatedBy?: unknown;
};

const DEFAULTS: WindowSettings = {
  mode: "scheduled",
  openHour: 9,
  closeHour: 17,
};

const currentHour = (now = new Date()) =>
  Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: REQUEST_WINDOW_TIMEZONE,
      hour: "numeric",
      hourCycle: "h23",
    }).format(now),
  );

/** Current settings, falling back to the historical 9 AM – 5 PM schedule. */
export const getEquipmentWindow = async (): Promise<WindowSettings> =>
  (await RequestWindow.findOne({ key: "equipment" })
    .populate("updatedBy", "name role")
    .lean()) ?? DEFAULTS;

export const isWindowOpen = (settings: WindowSettings, now = new Date()) => {
  if (settings.mode === "open") return true;
  if (settings.mode === "closed") return false;
  const hour = currentHour(now);
  return hour >= settings.openHour && hour < settings.closeHour;
};

const formatHour = (h: number) => {
  const suffix = h < 12 || h === 24 ? "AM" : "PM";
  return `${h % 12 === 0 ? 12 : h % 12}:00 ${suffix}`;
};

/** Message explaining why requests are currently refused (or null). */
export const closedReason = (settings: WindowSettings, now = new Date()) => {
  if (isWindowOpen(settings, now)) return null;
  if (settings.mode === "closed") {
    return settings.note?.trim() || "Equipment requests are currently closed.";
  }
  return `Equipment requests are only allowed between ${formatHour(settings.openHour)} and ${formatHour(settings.closeHour)} (Nepal Time).`;
};

const present = (settings: WindowSettings) => ({
  mode: settings.mode,
  openHour: settings.openHour,
  closeHour: settings.closeHour,
  note: settings.note ?? "",
  timezone: REQUEST_WINDOW_TIMEZONE,
  isOpen: isWindowOpen(settings),
  message: closedReason(settings),
  updatedAt: settings.updatedAt ?? null,
  updatedBy: settings.updatedBy ?? null,
});

// @desc    Get the equipment request window
// @route   GET /api/equipment/request-window
// @access  Private (all authenticated)
export const getRequestWindow = async (_req: Request, res: Response) => {
  try {
    res.json(present(await getEquipmentWindow()));
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Change the equipment request window
// @route   PUT /api/equipment/request-window
// @access  Admin, Superuser, Moderator
export const updateRequestWindow = async (req: Request, res: Response) => {
  try {
    const { mode, openHour, closeHour, note } =
      req.body as Partial<WindowSettings>;
    const current = await getEquipmentWindow();
    const next = {
      mode: mode ?? current.mode,
      openHour: openHour ?? current.openHour,
      closeHour: closeHour ?? current.closeHour,
      note: note ?? current.note ?? "",
    };
    if (next.openHour >= next.closeHour) {
      return res
        .status(400)
        .json({ message: "Opening time must be before closing time" });
    }

    const saved = await RequestWindow.findOneAndUpdate(
      { key: "equipment" },
      { ...next, updatedBy: req.user?._id },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
      .populate("updatedBy", "name role")
      .lean();

    res.json(present(saved!));
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
