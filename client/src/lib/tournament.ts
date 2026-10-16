/**
 * Read-side tournament logic shared by the event page, the PDF export and
 * the draw modals. Mirrors server/src/utils/tournament.ts — keep in sync.
 */

export interface TeamRef {
  _id: string;
  name: string;
  sport?: string;
  members?: unknown[];
}

export type DrawFormat = "Group" | "Knockout" | "League";
export type Scoring = "football" | "winOnly";

export interface Draw {
  _id: string;
  format: DrawFormat;
  stage?: string;
  sport: string;
  teamSize?: number;
  scoring?: Scoring;
  drawnTeams: TeamRef[];
  groupings?: { name: string; teams: TeamRef[] }[];
  bracketSlots?: (TeamRef | null)[];
  parentDraw?: string;
  qualifiers?: number;
  matchResults?: Record<string, string>;
  matchScores?: Record<string, string>;
  createdAt: string;
}

export interface Table {
  name: string;
  teams: TeamRef[];
}

export interface StandingRow {
  team: TeamRef;
  P: number;
  W: number;
  D: number;
  L: number;
  GF: number;
  GA: number;
  GD: number;
  Pts: number;
}

export const POINTS: Record<Scoring, { win: number; draw: number }> = {
  football: { win: 3, draw: 1 },
  winOnly: { win: 1, draw: 0 },
};

export const scoringOf = (draw: Draw): Scoring => draw.scoring ?? "winOnly";

export const groupMatchId = (groupName: string, a: TeamRef, b: TeamRef) => {
  const [x, y] = [a._id, b._id].sort();
  return `group_${groupName}_${x}_${y}`;
};

/** "2 - 1" or "2 - 2 (4 - 3 pens)" → { home, away, pens? } */
export const parseScore = (score?: string) => {
  const match = score?.match(
    /^\s*(\d+)\s*-\s*(\d+)(?:\s*\(\s*(\d+)\s*-\s*(\d+)\s*pens?\s*\))?/i,
  );
  if (!match) return null;
  return {
    home: Number(match[1]),
    away: Number(match[2]),
    pens: match[3]
      ? ([Number(match[3]), Number(match[4])] as const)
      : undefined,
  };
};

export const formatScore = (
  home: number,
  away: number,
  pens?: readonly [number, number],
) => `${home} - ${away}${pens ? ` (${pens[0]} - ${pens[1]} pens)` : ""}`;

/** Tables of a League/Group draw; legacy draws fall back to chunks of 4. */
export const tablesOf = (draw: Draw): Table[] => {
  if (draw.groupings?.length) return draw.groupings;
  const tables: Table[] = [];
  for (let i = 0; i < draw.drawnTeams.length; i += 4) {
    tables.push({
      name: String.fromCharCode(65 + tables.length),
      teams: draw.drawnTeams.slice(i, i + 4),
    });
  }
  return tables;
};

const tabulate = (
  draw: Draw,
  groupName: string,
  teams: TeamRef[],
): Map<string, StandingRow> => {
  const points = POINTS[scoringOf(draw)];
  const rows = new Map<string, StandingRow>(
    teams.map((team) => [
      team._id,
      { team, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 },
    ]),
  );

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const mid = groupMatchId(groupName, teams[i], teams[j]);
      const result = draw.matchResults?.[mid];
      if (!result) continue;

      const ra = rows.get(teams[i]._id)!;
      const rb = rows.get(teams[j]._id)!;
      ra.P++;
      rb.P++;

      // Orientation-independent: the winner gets the higher tally.
      const parsed = parseScore(draw.matchScores?.[mid]);
      const high = parsed ? Math.max(parsed.home, parsed.away) : 0;
      const low = parsed ? Math.min(parsed.home, parsed.away) : 0;

      if (result === "DRAW") {
        for (const r of [ra, rb]) {
          r.D++;
          r.Pts += points.draw;
          r.GF += high;
          r.GA += high;
        }
      } else {
        const [winner, loser] = result === teams[i]._id ? [ra, rb] : [rb, ra];
        winner.W++;
        loser.L++;
        winner.Pts += points.win;
        winner.GF += high;
        winner.GA += low;
        loser.GF += low;
        loser.GA += high;
      }
    }
  }
  rows.forEach((r) => (r.GD = r.GF - r.GA));
  return rows;
};

const byOverall = (a: StandingRow, b: StandingRow) =>
  b.GD - a.GD || b.GF - a.GF || b.W - a.W;

/**
 * UEFA tie-breakers. League phase: Pts → GD → GF → W.
 * Group stage: Pts → head-to-head (Pts, GD, GF) → GD → GF → W.
 * Legacy win-only draws: Pts → GD.
 */
export const computeStandings = (draw: Draw, table: Table): StandingRow[] => {
  const raw = tabulate(draw, table.name, table.teams);
  const order = new Map(table.teams.map((t, i) => [t._id, i]));
  const stable = (a: StandingRow, b: StandingRow) =>
    order.get(a.team._id)! - order.get(b.team._id)!;
  const rows = table.teams.map((t) => raw.get(t._id)!);

  if (scoringOf(draw) === "winOnly") {
    return rows.sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || stable(a, b));
  }
  if (draw.format === "League") {
    return rows.sort(
      (a, b) => b.Pts - a.Pts || byOverall(a, b) || stable(a, b),
    );
  }

  const byPoints = new Map<number, StandingRow[]>();
  rows.forEach((r) => byPoints.set(r.Pts, [...(byPoints.get(r.Pts) || []), r]));
  return [...byPoints.keys()]
    .sort((a, b) => b - a)
    .flatMap((pts) => {
      const tied = byPoints.get(pts)!;
      if (tied.length === 1) return tied;
      const h2h = tabulate(
        draw,
        table.name,
        tied.map((r) => r.team),
      );
      return [...tied].sort((a, b) => {
        const ha = h2h.get(a.team._id)!;
        const hb = h2h.get(b.team._id)!;
        return (
          hb.Pts - ha.Pts ||
          hb.GD - ha.GD ||
          hb.GF - ha.GF ||
          byOverall(a, b) ||
          stable(a, b)
        );
      });
    });
};

export interface Fixture {
  id: string;
  home: TeamRef;
  away: TeamRef;
}

/**
 * Round-robin schedule (circle method): every team plays at most once per
 * matchday. Fixtures keep the stored team order as home/away so scores entered
 * before matchdays existed still read the right way round.
 */
export const matchdays = (
  table: Table,
): { fixtures: Fixture[]; rest?: TeamRef }[] => {
  const teams: (TeamRef | null)[] = [...table.teams];
  if (teams.length < 2) return [];
  if (teams.length % 2) teams.push(null);
  const index = new Map(table.teams.map((t, i) => [t._id, i]));
  const n = teams.length;
  const days: { fixtures: Fixture[]; rest?: TeamRef }[] = [];

  let rotation = teams;
  for (let round = 0; round < n - 1; round++) {
    const fixtures: Fixture[] = [];
    let rest: TeamRef | undefined;
    for (let i = 0; i < n / 2; i++) {
      const a = rotation[i];
      const b = rotation[n - 1 - i];
      if (!a || !b) {
        rest = (a || b) ?? undefined;
        continue;
      }
      const [home, away] =
        index.get(a._id)! < index.get(b._id)! ? [a, b] : [b, a];
      fixtures.push({ id: groupMatchId(table.name, home, away), home, away });
    }
    days.push({ fixtures, rest });
    rotation = [rotation[0], rotation[n - 1], ...rotation.slice(1, n - 1)];
  }
  return days;
};

export const fixtureCount = (table: Table) =>
  (table.teams.length * (table.teams.length - 1)) / 2;

export const countUnplayed = (draw: Draw) =>
  tablesOf(draw).reduce(
    (sum, table) =>
      sum +
      matchdays(table)
        .flatMap((d) => d.fixtures)
        .filter((f) => !draw.matchResults?.[f.id]).length,
    0,
  );

/* ───────────────────────────── Knockout ───────────────────────────── */

export const nextPowerOfTwo = (n: number) =>
  Math.pow(2, Math.ceil(Math.log2(Math.max(2, n))));

/** Standard seeded order, e.g. 8 → [1, 8, 4, 5, 2, 7, 3, 6]. */
export const seedOrder = (size: number): number[] => {
  let order = [1];
  while (order.length < size) {
    const sum = order.length * 2 + 1;
    order = order.flatMap((seed) => [seed, sum - seed]);
  }
  return order;
};

export const roundName = (teamsInRound: number) => {
  if (teamsInRound === 1) return "Champion";
  if (teamsInRound === 2) return "Final";
  if (teamsInRound === 4) return "Semi-finals";
  if (teamsInRound === 8) return "Quarter-finals";
  return `Round of ${teamsInRound}`;
};

export interface Bracket {
  size: number;
  /** Team counts per round, e.g. [8, 4, 2]. */
  rounds: number[];
  matchId: (round: number, match: number) => string;
  team: (round: number, match: number, slot: 0 | 1) => TeamRef | null;
  winner: (round: number, match: number) => TeamRef | null;
  /** True when the slot can never be filled (a bye), as opposed to "TBD". */
  isBye: (round: number, match: number, slot: 0 | 1) => boolean;
  champion: () => TeamRef | null;
}

export const buildBracket = (draw: Draw): Bracket | null => {
  const seeded = draw.bracketSlots?.length ? draw.bracketSlots : null;
  const source = seeded ?? draw.drawnTeams;
  if (!source.length) return null;

  const size = nextPowerOfTwo(source.length);
  const slots = Array.from({ length: size }, (_, i) => source[i] ?? null);
  const byId = new Map(
    slots.filter((t): t is TeamRef => !!t).map((t) => [t._id, t]),
  );

  const rounds: number[] = [];
  for (let s = size; s >= 2; s /= 2) rounds.push(s);

  const matchId = (round: number, match: number) => `r${round}m${match}`;

  const isBye = (round: number, match: number, slot: 0 | 1): boolean =>
    round === size
      ? !slots[match * 2 + slot]
      : isBye(round * 2, match * 2 + slot, 0) &&
        isBye(round * 2, match * 2 + slot, 1);

  const team = (round: number, match: number, slot: 0 | 1): TeamRef | null =>
    round === size
      ? slots[match * 2 + slot]
      : winner(round * 2, match * 2 + slot);

  function winner(round: number, match: number): TeamRef | null {
    const result = draw.matchResults?.[matchId(round, match)];
    if (result) return byId.get(result) ?? null;
    // Walkover only against a genuine bye — never against an undecided slot.
    const [a, b] = [team(round, match, 0), team(round, match, 1)];
    if (a && !b && isBye(round, match, 1)) return a;
    if (b && !a && isBye(round, match, 0)) return b;
    return null;
  }

  return {
    size,
    rounds,
    matchId,
    team,
    winner,
    isBye,
    champion: () => winner(2, 0),
  };
};

/* ───────────────────────────── Labels ───────────────────────────── */

export const stageLabel = (draw: Draw) => {
  if (draw.stage) return draw.stage;
  if (draw.format === "League") return "League Phase";
  if (draw.format === "Group") return "Group Stage";
  return "Knockout";
};

export const pointsLegend = (draw: Draw) =>
  scoringOf(draw) === "football" ? "Win 3 · Draw 1 · Loss 0" : "Win 1 · Loss 0";

export const tieBreakLegend = (draw: Draw) => {
  if (scoringOf(draw) === "winOnly") return "Ties: goal difference";
  return draw.format === "League"
    ? "Ties: goal difference → goals scored → wins"
    : "Ties: head-to-head → goal difference → goals scored";
};

/** Rows per table shown inside the qualification zone. */
export const qualifierCount = (draw: Draw) =>
  draw.qualifiers ?? (draw.format === "Group" ? 2 : 0);

/** Phase number of a draw within its parentDraw chain (1-based). */
export const phaseNumber = (draw: Draw, all: Draw[]) => {
  const byId = new Map(all.map((d) => [d._id, d]));
  let phase = 1;
  let current = draw;
  while (current.parentDraw && byId.has(current.parentDraw)) {
    current = byId.get(current.parentDraw)!;
    phase++;
  }
  return phase;
};

/** Ranks rows from different tables on per-match averages (fair for uneven groups). */
export const rankAcrossGroups = <T extends { row: StandingRow }>(
  entries: T[],
) => {
  const avg = (value: number, played: number) => (played ? value / played : 0);
  return [...entries].sort(
    (a, b) =>
      avg(b.row.Pts, b.row.P) - avg(a.row.Pts, a.row.P) ||
      avg(b.row.GD, b.row.P) - avg(a.row.GD, a.row.P) ||
      avg(b.row.GF, b.row.P) - avg(a.row.GF, a.row.P) ||
      b.row.W - a.row.W,
  );
};

/** Group sizes when splitting `total` teams into `count` tables. */
export const balancedSizes = (total: number, count: number) =>
  Array.from(
    { length: count },
    (_, i) => Math.floor(total / count) + (i < total % count ? 1 : 0),
  );
