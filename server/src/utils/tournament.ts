/**
 * Tournament engine: standings, tie-breakers, seeding and bracket layout.
 *
 * The client mirrors the read-side of this logic in
 * client/src/lib/tournament.ts — keep the two in sync.
 *
 * Tie-breakers follow UEFA conventions:
 *  - League phase (single table, UCL 2024+): Pts → GD → GF → W
 *  - Group stage: Pts → head-to-head (Pts, GD, GF) → GD → GF → W
 *  - Legacy "winOnly" draws (pre-league): Pts → GD
 * Remaining ties fall back to draw order, which is random.
 */

export type Scoring = "football" | "winOnly";
export type TableKind = "league" | "group";

export interface StandingRow {
  teamId: string;
  P: number;
  W: number;
  D: number;
  L: number;
  GF: number;
  GA: number;
  GD: number;
  Pts: number;
}

type ResultMap = Record<string, string | undefined>;

export const POINTS: Record<Scoring, { win: number; draw: number }> = {
  football: { win: 3, draw: 1 },
  winOnly: { win: 1, draw: 0 },
};

export const groupMatchId = (groupName: string, a: string, b: string) => {
  const [x, y] = [a, b].sort();
  return `group_${groupName}_${x}_${y}`;
};

/** Parses "2 - 1" (ignoring any "(4 - 3 pens)" suffix) into [2, 1]. */
export const parseScore = (score?: string): [number, number] | null => {
  if (!score) return null;
  const match = score.match(/^\s*(\d+)\s*-\s*(\d+)/);
  return match ? [Number(match[1]), Number(match[2])] : null;
};

const emptyRow = (teamId: string): StandingRow => ({
  teamId,
  P: 0,
  W: 0,
  D: 0,
  L: 0,
  GF: 0,
  GA: 0,
  GD: 0,
  Pts: 0,
});

/**
 * Raw table for `teamIds`, counting only matches among those teams.
 * Goals are attributed via the stored winner, so the result does not depend
 * on which side was "home" when the score was entered.
 */
const tabulate = (
  groupName: string,
  teamIds: string[],
  results: ResultMap,
  scores: ResultMap,
  scoring: Scoring,
) => {
  const points = POINTS[scoring];
  const rows = new Map(teamIds.map((id) => [id, emptyRow(id)]));

  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      const a = teamIds[i];
      const b = teamIds[j];
      const mid = groupMatchId(groupName, a, b);
      const result = results[mid];
      if (!result) continue;

      const ra = rows.get(a)!;
      const rb = rows.get(b)!;
      ra.P++;
      rb.P++;

      const parsed = parseScore(scores[mid]);
      const high = parsed ? Math.max(...parsed) : 0;
      const low = parsed ? Math.min(...parsed) : 0;

      if (result === "DRAW") {
        ra.D++;
        rb.D++;
        ra.Pts += points.draw;
        rb.Pts += points.draw;
        ra.GF += high;
        ra.GA += high;
        rb.GF += high;
        rb.GA += high;
      } else {
        const [winner, loser] = result === a ? [ra, rb] : [rb, ra];
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

export const computeStandings = (
  groupName: string,
  teamIds: string[],
  results: ResultMap = {},
  scores: ResultMap = {},
  scoring: Scoring = "winOnly",
  kind: TableKind = "group",
): StandingRow[] => {
  const table = tabulate(groupName, teamIds, results, scores, scoring);
  const drawOrder = new Map(teamIds.map((id, i) => [id, i]));
  const rows = teamIds.map((id) => table.get(id)!);
  const stable = (a: StandingRow, b: StandingRow) =>
    drawOrder.get(a.teamId)! - drawOrder.get(b.teamId)!;

  if (scoring === "winOnly") {
    return rows.sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || stable(a, b));
  }

  if (kind === "league") {
    return rows.sort(
      (a, b) => b.Pts - a.Pts || byOverall(a, b) || stable(a, b),
    );
  }

  // Group stage: resolve each points-tie with a head-to-head mini table.
  const byPoints = new Map<number, StandingRow[]>();
  rows.forEach((r) => byPoints.set(r.Pts, [...(byPoints.get(r.Pts) || []), r]));

  return [...byPoints.keys()]
    .sort((a, b) => b - a)
    .flatMap((pts) => {
      const tied = byPoints.get(pts)!;
      if (tied.length === 1) return tied;
      const h2h = tabulate(
        groupName,
        tied.map((r) => r.teamId),
        results,
        scores,
        scoring,
      );
      return [...tied].sort((a, b) => {
        const ha = h2h.get(a.teamId)!;
        const hb = h2h.get(b.teamId)!;
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

/** Number of fixtures in a round-robin of `n` teams still lacking a result. */
export const countUnplayed = (
  groupName: string,
  teamIds: string[],
  results: ResultMap,
) => {
  let unplayed = 0;
  for (let i = 0; i < teamIds.length; i++)
    for (let j = i + 1; j < teamIds.length; j++)
      if (!results[groupMatchId(groupName, teamIds[i], teamIds[j])]) unplayed++;
  return unplayed;
};

export const shuffle = <T>(items: T[]) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const nextPowerOfTwo = (n: number) =>
  Math.pow(2, Math.ceil(Math.log2(Math.max(2, n))));

/**
 * Standard seeded bracket order, e.g. size 8 → [1, 8, 4, 5, 2, 7, 3, 6].
 * Seeds 1 and 2 can only meet in the final; 1–4 only from the semis on.
 */
export const seedOrder = (size: number): number[] => {
  let order = [1];
  while (order.length < size) {
    const sum = order.length * 2 + 1;
    order = order.flatMap((seed) => [seed, sum - seed]);
  }
  return order;
};

/**
 * Places a seed list (index 0 = top seed) into bracket slots. Byes (null) land
 * opposite the top seeds, so no bye ever meets another bye.
 */
export const buildBracketSlots = (seeds: string[]): (string | null)[] =>
  seedOrder(nextPowerOfTwo(seeds.length)).map((s) => seeds[s - 1] ?? null);

/** Sizes for splitting `total` teams into `count` groups (differ by at most one). */
export const balancedSizes = (total: number, count: number) =>
  Array.from(
    { length: count },
    (_, i) => Math.floor(total / count) + (i < total % count ? 1 : 0),
  );

export const groupLetter = (index: number) => String.fromCharCode(65 + index);

/**
 * UEFA-style pot draw: teams are ranked, cut into pots of `groupCount`, and
 * each group receives exactly one team from each pot (randomly drawn).
 */
export const drawGroupsFromPots = (ranked: string[], groupCount: number) => {
  const groups: string[][] = Array.from({ length: groupCount }, () => []);
  for (let start = 0; start < ranked.length; start += groupCount) {
    const pot = shuffle(ranked.slice(start, start + groupCount));
    // A short final pot fills a random subset of groups.
    const targets = shuffle(groups.map((_, i) => i)).slice(0, pot.length);
    pot.forEach((teamId, i) => groups[targets[i]].push(teamId));
  }
  return groups.map((teams, i) => ({ name: groupLetter(i), teams }));
};

/**
 * Builds bracket slots from seed tiers, re-drawing within each tier until no
 * first-round tie pairs two teams from the same group (when avoidable).
 */
export const drawSeededBracket = (
  tiers: string[][],
  groupOf: Map<string, string> = new Map(),
  attempts = 500,
) => {
  let best: (string | null)[] = [];
  let bestClashes = Infinity;

  for (let i = 0; i < attempts && bestClashes > 0; i++) {
    const slots = buildBracketSlots(tiers.flatMap((tier) => shuffle(tier)));
    let clashes = 0;
    for (let m = 0; m < slots.length; m += 2) {
      const [a, b] = [slots[m], slots[m + 1]];
      if (a && b && groupOf.get(a) && groupOf.get(a) === groupOf.get(b))
        clashes++;
    }
    if (clashes < bestClashes) {
      best = slots;
      bestClashes = clashes;
    }
  }
  return best;
};

/**
 * Ranks rows taken from different groups (e.g. "best third-placed teams").
 * Uses per-match averages so groups of unequal size compare fairly.
 */
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
