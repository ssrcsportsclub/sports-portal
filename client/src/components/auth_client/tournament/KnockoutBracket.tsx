import { memo, useMemo } from "react";
import {
  buildBracket,
  roundName,
  type Draw,
  type Fixture,
} from "../../../lib/tournament";
import type { OpenMatch } from "./TableStage";

interface KnockoutBracketProps {
  draw: Draw;
  canManage: boolean;
  onOpenMatch: OpenMatch;
}

const ROUND_WIDTH = 220;
const ROUND_GAP = 48;

const KnockoutBracket = ({
  draw,
  canManage,
  onOpenMatch,
}: KnockoutBracketProps) => {
  const bracket = useMemo(() => buildBracket(draw), [draw]);

  if (!bracket) {
    return (
      <p className="text-center py-10 text-zinc-500 font-medium italic">
        No teams have been drawn for this knockout yet.
      </p>
    );
  }

  const champion = bracket.champion();
  const columns = bracket.rounds.length + 1;

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto pb-4 custom-scrollbar">
        <div
          className="flex items-stretch p-4 sm:p-6 bg-zinc-50/50 dark:bg-zinc-800/10 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50"
          style={{
            gap: ROUND_GAP,
            minWidth: columns * ROUND_WIDTH + (columns - 1) * ROUND_GAP + 48,
          }}
        >
          {bracket.rounds.map((round) => (
            <div
              key={round}
              className="flex flex-col"
              style={{ width: ROUND_WIDTH }}
            >
              <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4 text-center">
                {roundName(round)}
              </div>
              <div className="flex-1 flex flex-col justify-around gap-6">
                {Array.from({ length: round / 2 }, (_, m) => {
                  const home = bracket.team(round, m, 0);
                  const away = bracket.team(round, m, 1);
                  const matchId = bracket.matchId(round, m);
                  const winner = bracket.winner(round, m);
                  const decided = !!draw.matchResults?.[matchId];
                  const score = draw.matchScores?.[matchId];
                  const playable = canManage && !!home && !!away && !decided;

                  const slotLabel = (slot: 0 | 1) =>
                    bracket.isBye(round, m, slot) ? "Bye" : "TBD";

                  const body = (
                    <>
                      <div className="flex flex-col gap-1.5">
                        {([home, away] as const).map((team, slot) => {
                          const isWinner = !!team && winner?._id === team._id;
                          return (
                            <div
                              key={slot}
                              className={`flex items-center h-12 px-3 rounded-xl border text-left text-sm transition-all ${
                                isWinner
                                  ? "bg-[#DD1D25] border-[#DD1D25] text-white shadow-lg shadow-[#DD1D25]/20"
                                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
                              } ${playable ? "group-hover:ring-2 ring-[#DD1D25]/30" : ""}`}
                            >
                              <span
                                className={`block truncate ${isWinner ? "font-black" : team ? "font-medium" : "italic opacity-50"}`}
                                title={team?.name}
                              >
                                {team ? team.name : slotLabel(slot as 0 | 1)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {score && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                          <span
                            className={`block px-2.5 py-1 rounded-lg border shadow-sm text-[11px] font-black tabular-nums whitespace-nowrap ${decided ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100" : "bg-amber-100 dark:bg-amber-900/50 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200"}`}
                          >
                            {score}
                          </span>
                        </div>
                      )}
                      {/* Connector to the next round */}
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 border-zinc-300 dark:border-zinc-700 ${
                          round > 2
                            ? "h-[60%] border-y border-r rounded-r-xl"
                            : "h-px border-t"
                        }`}
                        style={{ right: -ROUND_GAP / 2, width: ROUND_GAP / 2 }}
                      />
                    </>
                  );

                  return playable ? (
                    <button
                      key={m}
                      type="button"
                      onClick={() =>
                        onOpenMatch(
                          { id: matchId, home: home!, away: away! } as Fixture,
                          false,
                        )
                      }
                      className="relative group w-full text-left rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DD1D25]/50"
                      aria-label={`Manage ${home!.name} vs ${away!.name}`}
                    >
                      {body}
                    </button>
                  ) : (
                    <div key={m} className="relative w-full">
                      {body}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Champion */}
          <div className="flex flex-col" style={{ width: ROUND_WIDTH }}>
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4 text-center">
              🏆 Champion
            </div>
            <div className="flex-1 flex items-center">
              <div
                className={`w-full p-5 rounded-2xl border-2 flex flex-col items-center gap-2 text-center transition-all duration-500 ${
                  champion
                    ? "bg-linear-to-br from-[#FFD700] to-[#FFA500] text-black border-white/50 shadow-xl shadow-[#FFD700]/20"
                    : "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-400 border-transparent opacity-70"
                }`}
              >
                <span className="text-3xl">{champion ? "👑" : "🏆"}</span>
                <span className="font-black text-[10px] uppercase tracking-[0.2em]">
                  Tournament Champion
                </span>
                <span
                  className={`font-bold text-base break-words ${champion ? "" : "italic"}`}
                >
                  {champion ? champion.name : "Awaiting the final"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 sm:p-5 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-100 dark:border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DD1D25]" />
            How results work
          </h4>
          <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
            {canManage
              ? "Select a match once both teams are known to enter the score. Level ties are settled by a penalty shoot-out, and the winner advances automatically."
              : "The bracket updates as results are reported. Teams with a bye advance automatically."}
          </p>
        </div>
        <div className="flex flex-wrap content-center gap-x-6 gap-y-3 px-2">
          {[
            ["bg-[#DD1D25]", "Advanced / winner"],
            ["bg-amber-200 dark:bg-amber-800", "Live score"],
            [
              "border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900",
              "Pending",
            ],
          ].map(([swatch, label]) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded ${swatch}`} />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default memo(KnockoutBracket);
