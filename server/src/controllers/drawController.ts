import { Request, Response } from "express";
import Draw, { IDraw } from "../models/Draw.js";
import Event from "../models/Event.js";
import {
  StandingRow,
  balancedSizes,
  buildBracketSlots,
  computeStandings,
  countUnplayed,
  drawGroupsFromPots,
  drawSeededBracket,
  groupLetter,
  nextPowerOfTwo,
  rankAcrossGroups,
} from "../utils/tournament.js";

const TEAM_FIELDS = "name sport members teamType";

const DRAW_POPULATE = [
  { path: "drawnTeams", select: TEAM_FIELDS },
  { path: "groupings.teams", select: TEAM_FIELDS },
  // Byes are stored as null and must survive population.
  {
    path: "bracketSlots",
    select: TEAM_FIELDS,
    options: { retainNullValues: true },
  },
];

const idOf = (value: any): string => (value?._id ?? value)?.toString?.() ?? "";

/** Mongoose Maps → plain objects so the tournament engine can read them. */
const resultMaps = (draw: IDraw) => {
  const toObject = (m: any): Record<string, string> =>
    m instanceof Map ? Object.fromEntries(m) : { ...(m || {}) };
  return {
    results: toObject(draw.matchResults),
    scores: toObject(draw.matchScores),
  };
};

/** Tables of a league/group draw. Legacy group draws without stored
 * groupings were displayed as consecutive chunks of 4 — mirror that. */
const tablesOf = (draw: IDraw) => {
  if (draw.groupings?.length) {
    return draw.groupings.map((g) => ({
      name: g.name,
      teams: g.teams.map(idOf),
    }));
  }
  const teams = draw.drawnTeams.map(idOf);
  return Array.from({ length: Math.ceil(teams.length / 4) }, (_, i) => ({
    name: groupLetter(i),
    teams: teams.slice(i * 4, i * 4 + 4),
  }));
};

const ensureEventStarted = (event: any) =>
  !event || new Date() >= new Date(event.date);

/**
 * Same-group pairings are avoided in the opening knockout round when this
 * sport/event already had a group draw (legacy behaviour).
 */
const buildGroupMapFromDraw = (groupDraw: any) => {
  const groupMap = new Map<string, string>();
  (groupDraw?.groupings || []).forEach((group: any) =>
    (group.teams || []).forEach((team: any) =>
      groupMap.set(idOf(team), group.name),
    ),
  );
  return groupMap;
};

// @desc    Create a new draw
// @route   POST /api/draws
// @access  Private (Admin)
export const createDraw = async (req: Request, res: Response) => {
  try {
    const { event, format, sport, teamSize, drawnTeams, groupings, scoring } =
      req.body;

    const eventExists = await Event.exists({ _id: event });
    if (!eventExists) {
      return res.status(404).json({ message: "Event not found" });
    }

    const teamIds: string[] = (drawnTeams || []).map(idOf);
    if (new Set(teamIds).size !== teamIds.length) {
      return res.status(400).json({ message: "A team cannot be drawn twice" });
    }
    if (teamIds.length < 2) {
      return res.status(400).json({ message: "A draw needs at least 2 teams" });
    }

    const doc: Partial<IDraw> & Record<string, unknown> = {
      event,
      format,
      sport,
      teamSize,
      drawnTeams: teamIds as any,
      createdBy: req.user?._id as any,
    };

    if (format === "Knockout") {
      // The client already randomised the order the audience watched being
      // drawn; keep it unless we must break up same-group pairings.
      const latestGroupDraw = await Draw.findOne({
        event,
        format: "Group",
        sport,
      })
        .sort({ createdAt: -1 })
        .select("groupings")
        .lean();
      const groupMap = buildGroupMapFromDraw(latestGroupDraw);
      doc.stage = "Knockout";
      doc.bracketSlots = (
        groupMap.size
          ? drawSeededBracket([teamIds], groupMap)
          : buildBracketSlots(teamIds)
      ) as any;
    } else if (format === "League") {
      doc.stage = "League Phase";
      doc.scoring = "football";
      doc.groupings = [{ name: "League", teams: teamIds as any }];
    } else {
      doc.stage = "Group Stage";
      doc.scoring = scoring === "winOnly" ? "winOnly" : "football";
      doc.groupings = groupings || [];
    }

    const draw = await Draw.create(doc);
    await draw.populate(DRAW_POPULATE);
    res.status(201).json(draw);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Get all draws (globally)
// @route   GET /api/draws            full draws with teams populated
// @route   GET /api/draws?view=summary  id/sport/event/stage only
// @access  Public
export const getAllDraws = async (req: Request, res: Response) => {
  try {
    if (req.query.view === "summary") {
      // No team population: the All Teams page only needs to know which
      // sport/event pairs already have a draw.
      const summaries = await Draw.find()
        .select("event sport format stage parentDraw createdAt")
        .populate("event", "title date")
        .sort({ createdAt: -1 })
        .lean();
      return res.json(summaries);
    }

    const draws = await Draw.find()
      .populate(DRAW_POPULATE)
      .populate("event", "title slug date")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    res.json(draws);
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
      .populate(DRAW_POPULATE)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

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

type MatchField = "matchResults" | "matchScores";

/**
 * Applies `field` updates from the body, plus any `alsoApply` fields that were
 * sent along (so finalising a match saves score + result in one write).
 */
const updateMatchMap =
  (field: MatchField, label: string, alsoApply: MatchField[] = []) =>
  async (req: Request, res: Response) => {
    try {
      const draw = await Draw.findById(req.params.id).populate("event", "date");
      if (!draw) {
        return res.status(404).json({ message: "Draw not found" });
      }

      if (!ensureEventStarted(draw.event)) {
        return res.status(400).json({
          message: `Cannot update ${label} before the event starts`,
        });
      }

      for (const key of [field, ...alsoApply]) {
        const updates = req.body[key];
        if (updates && typeof updates === "object") {
          Object.entries(updates).forEach(([matchId, value]) => {
            (draw[key] as any).set(matchId, String(value));
          });
        }
      }
      await draw.save();
      await draw.populate(DRAW_POPULATE);

      res.json(draw);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  };

// @desc    Update draw match results
// @route   PATCH /api/draws/:id/results
// @access  Private (Admin)
export const updateDrawResults = updateMatchMap(
  "matchResults",
  "match results",
  ["matchScores"],
);

// @desc    Update match score
// @route   PATCH /api/draws/:id/score
// @access  Private (Admin)
export const updateMatchScore = updateMatchMap("matchScores", "match scores");

/* ───────────────────────── Phase advancement ───────────────────────── */

type AdvanceBody =
  | { mode: "groups"; qualifiers: number; groupSize: number }
  | {
      mode: "knockout";
      qualifiers?: number; // League source: top N
      seeding?: "ranked" | "draw"; // League source
      perGroup?: number; // Group source: top K of every group
      bestPlaced?: number; // Group source: extra best (K+1)th-placed teams
    };

class AdvanceError extends Error {}

const knockoutStageName = (teams: number) => {
  const size = nextPowerOfTwo(teams);
  if (size === 2) return "Final";
  if (size === 4) return "Semi-finals";
  if (size === 8) return "Quarter-finals";
  return `Round of ${size}`;
};

/** League → Group stage drawn from pots, or League → seeded knockout. */
const advanceFromLeague = (
  ranked: string[],
  body: AdvanceBody,
): Partial<IDraw> => {
  const qualifiers = Number(body.qualifiers);
  if (
    !Number.isInteger(qualifiers) ||
    qualifiers < 2 ||
    qualifiers > ranked.length
  ) {
    throw new AdvanceError(
      `Qualifiers must be between 2 and ${ranked.length} teams`,
    );
  }
  const top = ranked.slice(0, qualifiers);

  if (body.mode === "groups") {
    const groupSize = Number(body.groupSize);
    if (
      !Number.isInteger(groupSize) ||
      groupSize < 2 ||
      groupSize > qualifiers
    ) {
      throw new AdvanceError(
        "Teams per group must be between 2 and qualifiers",
      );
    }
    const groupCount = Math.ceil(qualifiers / groupSize);
    if (groupCount < 2) {
      throw new AdvanceError("A group stage needs at least 2 groups");
    }
    if (Math.min(...balancedSizes(qualifiers, groupCount)) < 2) {
      throw new AdvanceError("Every group needs at least 2 teams");
    }
    return {
      format: "Group",
      stage: "Group Stage",
      scoring: "football",
      drawnTeams: top as any,
      groupings: drawGroupsFromPots(top, groupCount) as any,
      qualifiers: 2,
    };
  }

  // Ranked: strict 1 v N. Draw: seeded half vs unseeded half, drawn at random
  // (Champions League round-of-16 style). Byes always go to the top seeds.
  const byes = nextPowerOfTwo(qualifiers) - qualifiers;
  const tiers =
    body.seeding === "draw"
      ? [
          ...top.slice(0, byes).map((t) => [t]),
          top.slice(byes, byes + Math.floor((qualifiers - byes) / 2)),
          top.slice(byes + Math.floor((qualifiers - byes) / 2)),
        ].filter((tier) => tier.length)
      : top.map((t) => [t]);

  return {
    format: "Knockout",
    stage: knockoutStageName(qualifiers),
    drawnTeams: top as any,
    bracketSlots: drawSeededBracket(tiers) as any,
  };
};

/** Groups → knockout: winners seeded vs runners-up, no same-group openers. */
const advanceFromGroups = (
  tables: { name: string; standings: StandingRow[] }[],
  body: AdvanceBody,
): Partial<IDraw> => {
  if (body.mode !== "knockout") {
    throw new AdvanceError("A group stage can only advance to a knockout");
  }
  const perGroup = Number(body.perGroup ?? 2);
  const bestPlaced = Number(body.bestPlaced ?? 0);
  const smallest = Math.min(...tables.map((t) => t.standings.length));

  if (!Number.isInteger(perGroup) || perGroup < 1 || perGroup > smallest) {
    throw new AdvanceError(`Teams per group must be between 1 and ${smallest}`);
  }
  if (!Number.isInteger(bestPlaced) || bestPlaced < 0) {
    throw new AdvanceError("Best-placed teams must be zero or more");
  }

  const groupOf = new Map<string, string>();
  tables.forEach((t) =>
    t.standings.forEach((row) => groupOf.set(row.teamId, t.name)),
  );

  // One tier per finishing position, each ranked across groups.
  const tierEntries = Array.from({ length: perGroup }, (_, pos) =>
    rankAcrossGroups(
      tables.map((t) => ({
        teamId: t.standings[pos].teamId,
        row: t.standings[pos],
      })),
    ),
  );

  if (bestPlaced > 0) {
    const pool = rankAcrossGroups(
      tables
        .filter((t) => t.standings[perGroup])
        .map((t) => ({
          teamId: t.standings[perGroup].teamId,
          row: t.standings[perGroup],
        })),
    );
    if (bestPlaced > pool.length) {
      throw new AdvanceError(
        `Only ${pool.length} group(s) have a team in position ${perGroup + 1}`,
      );
    }
    tierEntries.push(pool.slice(0, bestPlaced));
  }

  const qualified = tierEntries.flat().map((e) => e.teamId);
  if (qualified.length < 2) {
    throw new AdvanceError("At least 2 teams must qualify");
  }

  // Byes go to the best group winners; everyone else is drawn within tier.
  const byes = nextPowerOfTwo(qualified.length) - qualified.length;
  const tiers = tierEntries.map((tier) => tier.map((e) => e.teamId));
  const fixed = tiers[0].slice(0, byes).map((t) => [t]);
  tiers[0] = tiers[0].slice(byes);

  return {
    format: "Knockout",
    stage: knockoutStageName(qualified.length),
    drawnTeams: qualified as any,
    bracketSlots: drawSeededBracket(
      [...fixed, ...tiers].filter((tier) => tier.length),
      groupOf,
    ) as any,
  };
};

// @desc    Advance a completed league/group phase to the next phase
// @route   POST /api/draws/:id/advance
// @access  Private (Admin)
export const advanceDraw = async (req: Request, res: Response) => {
  try {
    const body = req.body as AdvanceBody;
    if (body?.mode !== "groups" && body?.mode !== "knockout") {
      return res
        .status(400)
        .json({ message: "Mode must be groups or knockout" });
    }

    const source = await Draw.findById(req.params.id);
    if (!source) {
      return res.status(404).json({ message: "Draw not found" });
    }
    if (source.format === "Knockout") {
      return res
        .status(400)
        .json({ message: "A knockout draw is already the final phase" });
    }
    if (await Draw.exists({ parentDraw: source._id })) {
      return res
        .status(409)
        .json({ message: "The next phase has already been drawn" });
    }

    const { results, scores } = resultMaps(source);
    const tables = tablesOf(source);
    if (!tables.length) {
      return res.status(400).json({ message: "This draw has no tables" });
    }
    const unplayed = tables.reduce(
      (sum, t) => sum + countUnplayed(t.name, t.teams, results),
      0,
    );
    if (unplayed > 0) {
      return res.status(400).json({
        message: `${unplayed} fixture(s) still need a final result before advancing`,
      });
    }

    const scoring = source.scoring ?? "winOnly";
    const kind = source.format === "League" ? "league" : "group";
    const standings = tables.map((t) => ({
      name: t.name,
      standings: computeStandings(
        t.name,
        t.teams,
        results,
        scores,
        scoring,
        kind,
      ),
    }));

    let next: Partial<IDraw>;
    try {
      next =
        source.format === "League"
          ? advanceFromLeague(
              standings[0].standings.map((r) => r.teamId),
              body,
            )
          : advanceFromGroups(standings, body);
    } catch (error) {
      if (error instanceof AdvanceError) {
        return res.status(400).json({ message: error.message });
      }
      throw error;
    }

    const draw = await Draw.create({
      ...next,
      event: source.event,
      sport: source.sport,
      teamSize: source.teamSize,
      parentDraw: source._id,
      createdBy: req.user?._id,
    });

    // Record the qualification zone on the source table for display.
    source.qualifiers =
      source.format === "League"
        ? (next.drawnTeams?.length ?? 0)
        : Number((body as any).perGroup ?? 2);
    await source.save();

    await draw.populate(DRAW_POPULATE);
    res.status(201).json(draw);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
