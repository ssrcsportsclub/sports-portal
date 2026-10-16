import { memo, useMemo, useState } from "react";
import {
  computeStandings,
  fixtureCount,
  matchdays,
  pointsLegend,
  qualifierCount,
  scoringOf,
  tablesOf,
  tieBreakLegend,
  type Draw,
  type Fixture,
  type StandingRow,
  type Table,
} from "../../../lib/tournament";

export type OpenMatch = (fixture: Fixture, allowDraw: boolean) => void;

interface TableStageProps {
  draw: Draw;
  canManage: boolean;
  onOpenMatch: OpenMatch;
}

const StandingsTable = ({
  rows,
  qualifiers,
  showDraws,
}: {
  rows: StandingRow[];
  qualifiers: number;
  showDraws: boolean;
}) => {
  const cols: { key: keyof StandingRow; label: string; wide?: boolean }[] = [
    { key: "P", label: "P" },
    { key: "W", label: "W" },
    ...(showDraws ? [{ key: "D" as const, label: "D" }] : []),
    { key: "L", label: "L" },
    { key: "GF", label: "GF", wide: true },
    { key: "GA", label: "GA", wide: true },
    { key: "GD", label: "GD" },
  ];

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="text-zinc-400">
            <th className="pb-2 pl-1 w-6 text-left font-bold">#</th>
            <th className="pb-2 pr-2 text-left font-bold">Team</th>
            {cols.map((c) => (
              <th
                key={c.key}
                className={`pb-2 px-1.5 text-center font-bold ${c.wide ? "hidden sm:table-cell" : ""}`}
              >
                {c.label}
              </th>
            ))}
            <th className="pb-2 px-1.5 text-center font-black text-zinc-500">
              Pts
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((row, i) => {
            const qualified = i < qualifiers;
            // Dashed line under the last qualifying row (the "cut").
            const cut =
              qualifiers > 0 && i === qualifiers - 1 && i < rows.length - 1
                ? "border-b-2 border-dashed border-[#DD1D25]/40"
                : "";
            return (
              <tr
                key={row.team._id}
                className={
                  qualified
                    ? "text-zinc-900 dark:text-zinc-50 font-semibold"
                    : "text-zinc-500 dark:text-zinc-400"
                }
              >
                <td className={`py-2 pl-1 ${cut}`}>
                  <span
                    className={`inline-flex w-5 h-5 items-center justify-center rounded text-[10px] font-black ${qualified ? "bg-[#DD1D25] text-white" : "text-zinc-400"}`}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className={`py-2 pr-2 max-w-[9rem] sm:max-w-none ${cut}`}>
                  <span className="block truncate" title={row.team.name}>
                    {row.team.name}
                  </span>
                </td>
                {cols.map((c) => {
                  const value = row[c.key] as number;
                  const tone =
                    c.key === "GD"
                      ? value > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : value < 0
                          ? "text-red-500"
                          : ""
                      : "";
                  return (
                    <td
                      key={c.key}
                      className={`py-2 px-1.5 text-center ${tone} ${cut} ${c.wide ? "hidden sm:table-cell" : ""}`}
                    >
                      {c.key === "GD" && value > 0 ? `+${value}` : value}
                    </td>
                  );
                })}
                <td
                  className={`py-2 px-1.5 text-center font-black text-zinc-900 dark:text-zinc-50 ${cut}`}
                >
                  {row.Pts}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const FixtureRow = ({
  fixture,
  draw,
  canManage,
  onOpen,
}: {
  fixture: Fixture;
  draw: Draw;
  canManage: boolean;
  onOpen: () => void;
}) => {
  const score = draw.matchScores?.[fixture.id];
  const result = draw.matchResults?.[fixture.id];
  const homeWon = result === fixture.home._id;
  const awayWon = result === fixture.away._id;
  const tone = (won: boolean) =>
    won
      ? "text-[#DD1D25]"
      : result
        ? "text-zinc-600 dark:text-zinc-300"
        : "text-zinc-500 dark:text-zinc-400";

  const content = (
    <>
      <span
        className={`flex-1 min-w-0 truncate text-right font-bold ${tone(homeWon)}`}
      >
        {fixture.home.name}
      </span>
      <span className="shrink-0 min-w-12 text-center">
        {score ? (
          <span
            className={`inline-block font-black px-2 py-0.5 rounded text-[10px] tabular-nums ${result ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900" : "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300"}`}
            title={result ? "Full time" : "Live score"}
          >
            {score}
          </span>
        ) : (
          <span className="text-zinc-400 font-bold">vs</span>
        )}
      </span>
      <span className={`flex-1 min-w-0 truncate font-bold ${tone(awayWon)}`}>
        {fixture.away.name}
      </span>
    </>
  );

  const base = `w-full flex items-center gap-2 p-2.5 rounded-xl border text-xs transition-colors ${result ? "border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900" : "border-dashed border-zinc-200 dark:border-zinc-700"}`;

  return canManage ? (
    <button
      type="button"
      onClick={onOpen}
      className={`${base} hover:border-[#DD1D25]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DD1D25]/40`}
      aria-label={`Manage ${fixture.home.name} vs ${fixture.away.name}`}
    >
      {content}
    </button>
  ) : (
    <div className={base}>{content}</div>
  );
};

const Matchdays = ({
  table,
  draw,
  canManage,
  onOpenMatch,
  paged,
}: {
  table: Table;
  draw: Draw;
  canManage: boolean;
  onOpenMatch: OpenMatch;
  paged: boolean;
}) => {
  const days = useMemo(() => matchdays(table), [table]);
  // Open on the first matchday that still has fixtures to play.
  const firstOpen = Math.max(
    0,
    days.findIndex((d) => d.fixtures.some((f) => !draw.matchResults?.[f.id])),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const active = selected ?? firstOpen;
  const visible = paged ? [days[active]].filter(Boolean) : days;

  return (
    <div className="space-y-3">
      {paged && (
        <div
          className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar"
          role="tablist"
          aria-label="Matchdays"
        >
          {days.map((day, i) => {
            const done = day.fixtures.every((f) => draw.matchResults?.[f.id]);
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => setSelected(i)}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${i === active ? "bg-[#DD1D25] text-white" : done ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300" : "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500"}`}
              >
                MD{i + 1}
                {done && i !== active ? " ✓" : ""}
              </button>
            );
          })}
        </div>
      )}
      {visible.map((day) => {
        const dayIndex = days.indexOf(day);
        return (
          <div key={dayIndex} className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              <span>Matchday {dayIndex + 1}</span>
              {day.rest && (
                <span className="normal-case tracking-normal font-semibold">
                  Rest: {day.rest.name}
                </span>
              )}
            </div>
            {day.fixtures.map((fixture) => (
              <FixtureRow
                key={fixture.id}
                fixture={fixture}
                draw={draw}
                canManage={canManage}
                onOpen={() => onOpenMatch(fixture, true)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
};

const Progress = ({ played, total }: { played: number; total: number }) => (
  <div className="flex items-center gap-2 min-w-[8rem]">
    <div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
      <div
        className="h-full bg-[#DD1D25] transition-all"
        style={{ width: `${total ? (played / total) * 100 : 0}%` }}
      />
    </div>
    <span className="text-[10px] font-bold text-zinc-400 tabular-nums whitespace-nowrap">
      {played}/{total} played
    </span>
  </div>
);

const TableStage = ({ draw, canManage, onOpenMatch }: TableStageProps) => {
  const isLeague = draw.format === "League";
  const tables = useMemo(() => tablesOf(draw), [draw]);
  const standings = useMemo(
    () => tables.map((t) => computeStandings(draw, t)),
    [draw, tables],
  );
  const qualifiers = qualifierCount(draw);
  const showDraws = scoringOf(draw) === "football";
  const playedIn = (t: Table) =>
    fixtureCount(t) -
    matchdays(t)
      .flatMap((d) => d.fixtures)
      .filter((f) => !draw.matchResults?.[f.id]).length;

  return (
    <div className="space-y-6">
      {tables.map((table, ti) => (
        <section
          key={table.name}
          className="bg-zinc-50 dark:bg-zinc-800/10 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden"
        >
          <header className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
            <h3 className="text-base sm:text-lg font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DD1D25]" />
              {isLeague ? "League Table" : `Group ${table.name}`}
            </h3>
            <Progress played={playedIn(table)} total={fixtureCount(table)} />
          </header>

          <div
            className={`grid grid-cols-1 ${isLeague ? "" : "lg:grid-cols-2 lg:divide-x"} divide-y lg:divide-y-0 divide-zinc-100 dark:divide-zinc-800`}
          >
            <div className="p-4 sm:p-5">
              <StandingsTable
                rows={standings[ti]}
                qualifiers={qualifiers}
                showDraws={showDraws}
              />
              <p className="text-[10px] text-zinc-400 mt-3 leading-relaxed">
                {qualifiers > 0 && (
                  <>
                    <span className="inline-block w-2 h-2 rounded-sm bg-[#DD1D25] mr-1 align-middle" />
                    Top {qualifiers} {draw.qualifiers ? "qualified" : "advance"}{" "}
                    ·{" "}
                  </>
                )}
                {pointsLegend(draw)} · {tieBreakLegend(draw)}
              </p>
            </div>

            <div
              className={`p-4 sm:p-5 ${isLeague ? "border-t border-zinc-100 dark:border-zinc-800" : ""}`}
            >
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3">
                Fixtures ({fixtureCount(table)})
              </h4>
              <Matchdays
                table={table}
                draw={draw}
                canManage={canManage}
                onOpenMatch={onOpenMatch}
                paged={isLeague}
              />
            </div>
          </div>
        </section>
      ))}
    </div>
  );
};

export default memo(TableStage);
