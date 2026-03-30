import logo from "../../../assets/logo_main.png";

/* ─────────────────────────────────────────
   KNOCKOUT BRACKET TEMPLATE
───────────────────────────────────────── */
const KnockoutPdfTemplate = ({ draw }: { draw: any }) => {
  const teams = draw.drawnTeams;
  const n = teams.length;
  if (n === 0) return null;

  const p = Math.pow(2, Math.ceil(Math.log2(n)));
  const rounds: number[] = [];
  let currSize = p;
  while (currSize >= 1) {
    rounds.push(currSize);
    currSize /= 2;
  }

  const ROUND_COLORS = ["#2b8a5e", "#2c699a", "#28a0bd", "#6ccceb", "#DD1D25"];

  const getWinner = (roundSize: number, matchIdx: number) => {
    const matchId = `r${roundSize}m${matchIdx}`;
    const winnerId = draw.matchResults?.[matchId];
    return teams.find((t: any) => t._id === winnerId) || null;
  };

  const getTeam = (roundSize: number, matchIdx: number, slotIdx: number) => {
    if (roundSize === p) return teams[matchIdx * 2 + slotIdx] || null;
    return getWinner(roundSize * 2, matchIdx * 2 + slotIdx);
  };

  const minHeight = Math.max(600, rounds[0] * 70);

  return (
    <div
      className="flex w-full"
      style={{ minHeight: `${minHeight}px` }}
      data-pdf-section="knockout-bracket"
    >
      {rounds.map((roundSize, roundIdx) => {
        const boxColor =
          ROUND_COLORS[Math.min(roundIdx, ROUND_COLORS.length - 1)];
        if (roundSize === 1) {
          const champion = getWinner(2, 0);
          return (
            <div
              key={roundIdx}
              className="flex-1 flex flex-col items-center justify-center relative px-6 z-10"
            >
              <div
                className="relative w-full shadow-md text-white font-bold p-3 text-center z-10"
                style={{
                  backgroundColor: boxColor,
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                {champion ? champion.name : ""}
              </div>
              {draw.matchScores?.["r2m0"] && (
                <div className="text-center font-bold text-zinc-900 mt-2 text-sm">
                  {draw.matchScores["r2m0"]}
                </div>
              )}
              <div
                className="absolute top-1/2 left-0 w-6 border-t-2 -translate-y-px z-0"
                style={{
                  borderColor:
                    ROUND_COLORS[
                      Math.min(roundIdx - 1, ROUND_COLORS.length - 1)
                    ],
                }}
              />
            </div>
          );
        }
        return (
          <div
            key={roundIdx}
            className="flex-1 flex flex-col pt-0 pb-0 relative"
            style={{ zIndex: rounds.length - roundIdx }}
          >
            {Array.from({ length: roundSize / 2 }).map((_, matchIdx) => {
              const team1 = getTeam(roundSize, matchIdx, 0);
              const team2 = getTeam(roundSize, matchIdx, 1);
              const score0 =
                roundIdx > 0
                  ? draw.matchScores?.[`r${roundSize * 2}m${matchIdx * 2}`] ||
                    ""
                  : "";
              const score1 =
                roundIdx > 0
                  ? draw.matchScores?.[
                      `r${roundSize * 2}m${matchIdx * 2 + 1}`
                    ] || ""
                  : "";
              return (
                <div
                  key={matchIdx}
                  className="flex-1 flex flex-col justify-around relative px-6 z-10"
                >
                  <div className="relative">
                    <div
                      className="w-full text-white font-bold p-3 text-center shadow-md relative z-10"
                      style={{
                        backgroundColor: boxColor,
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                      }}
                    >
                      {team1 ? team1.name : "To be determined"}
                    </div>
                    {score0 && (
                      <div className="text-center font-bold text-zinc-800 mt-1 text-sm absolute top-full left-0 w-full">
                        {score0}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <div
                      className="w-full text-white font-bold p-3 text-center shadow-md relative z-10"
                      style={{
                        backgroundColor: boxColor,
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                      }}
                    >
                      {team2 ? team2.name : "To be determined"}
                    </div>
                    {score1 && (
                      <div className="text-center font-bold text-zinc-800 mt-1 text-sm absolute top-full left-0 w-full">
                        {score1}
                      </div>
                    )}
                  </div>
                  <div
                    className="absolute right-0 top-[25%] bottom-[25%] w-6 border-y-2 border-r-2 rounded-r-none translate-x-px z-0"
                    style={{ borderColor: boxColor }}
                  />
                  {roundIdx > 0 && (
                    <>
                      <div
                        className="absolute left-0 w-6 border-t-2 top-[25%] z-0"
                        style={{
                          borderColor:
                            ROUND_COLORS[
                              Math.min(roundIdx - 1, ROUND_COLORS.length - 1)
                            ],
                        }}
                      />
                      <div
                        className="absolute left-0 w-6 border-t-2 top-[75%] z-0"
                        style={{
                          borderColor:
                            ROUND_COLORS[
                              Math.min(roundIdx - 1, ROUND_COLORS.length - 1)
                            ],
                        }}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────
   GROUP STAGE — ESPORTS PRINT DOCUMENT
   Section 1: Group Draw Sheet (team lists)
   Section 2: Match Schedule table
   Section 3: Standings per group (W=1pt, L=0pt)
───────────────────────────────────────── */
const GroupPdfTemplate = ({ draw }: { draw: any }) => {
  const storedGroupings: { name: string; teams: any[] }[] =
    draw.groupings && draw.groupings.length > 0
      ? draw.groupings
      : (() => {
          const chunks: { name: string; teams: any[] }[] = [];
          const all = draw.drawnTeams;
          for (let i = 0; i < all.length; i += 4)
            chunks.push({
              name: String.fromCharCode(65 + chunks.length),
              teams: all.slice(i, i + 4),
            });
          return chunks;
        })();

  const groupMatchId = (gName: string, t1: any, t2: any) => {
    const ids = [t1._id, t2._id].sort();
    return `group_${gName}_${ids[0]}_${ids[1]}`;
  };

  const computeStandings = (gName: string, groupTeams: any[]) =>
    groupTeams
      .map((team) => {
        let P = 0,
          W = 0,
          L = 0,
          Pts = 0,
          SF = 0,
          SA = 0;
        groupTeams.forEach((opp) => {
          if (opp._id === team._id) return;
          const mid = groupMatchId(gName, team, opp);
          const result = draw.matchResults?.[mid];
          const score = draw.matchScores?.[mid];
          if (score && result) {
            const parts = score.split(/\s*-\s*/).map(Number);
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              const high = Math.max(parts[0], parts[1]);
              const low = Math.min(parts[0], parts[1]);
              if (result === team._id) {
                SF += high;
                SA += low;
              } else {
                SF += low;
                SA += high;
              }
            }
          }
          if (!result) return;
          P++;
          if (result === team._id) {
            W++;
            Pts++;
          } else L++;
        });
        return { team, P, W, L, Pts, Diff: SF - SA };
      })
      .sort((a, b) => (b.Pts !== a.Pts ? b.Pts - a.Pts : b.Diff - a.Diff));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "60px" }}>
      {/* ── SECTION 1: Group Assignments ── */}
      <div data-pdf-section="group-assignments">
        <div
          style={{
            fontSize: "11px",
            fontWeight: 800,
            color: "#DD1D25",
            textTransform: "uppercase",
            letterSpacing: "0.3em",
            marginBottom: "24px",
            borderLeft: "4px solid #DD1D25",
            paddingLeft: "12px",
          }}
        >
          Group Assignments
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
          {storedGroupings.map((group) => (
            <div
              key={group.name}
              style={{
                minWidth: "260px",
                flex: "1",
                border: "1px solid #18181b",
                background: "#fff",
              }}
            >
              <div style={{ background: "#18181b", padding: "14px 20px" }}>
                <span
                  style={{
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: "16px",
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                  }}
                >
                  Group {group.name}
                </span>
              </div>
              {group.teams.map((team: any, idx: number) => (
                <div
                  key={team._id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 20px",
                    borderBottom:
                      idx < group.teams.length - 1
                        ? "1px solid #f4f4f5"
                        : "none",
                  }}
                >
                  <span
                    style={{
                      width: "26px",
                      height: "26px",
                      borderRadius: "50%",
                      background: "#f4f4f5",
                      color: "#DD1D25",
                      fontWeight: 900,
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: "13px",
                      color: "#18181b",
                      textTransform: "uppercase",
                      lineHeight: "1.4",
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                    }}
                  >
                    {team.name}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 2: Match Schedule ── */}
      <div data-pdf-section="match-schedule">
        <div
          style={{
            fontSize: "11px",
            fontWeight: 800,
            color: "#DD1D25",
            textTransform: "uppercase",
            letterSpacing: "0.3em",
            marginBottom: "24px",
            borderLeft: "4px solid #DD1D25",
            paddingLeft: "12px",
          }}
        >
          Match Schedule
        </div>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            border: "1px solid #18181b",
          }}
        >
          <thead>
            <tr style={{ background: "#18181b" }}>
              <th
                style={{
                  padding: "14px",
                  color: "#fff",
                  textAlign: "left",
                  fontWeight: 800,
                  fontSize: "11px",
                  width: "90px",
                  whiteSpace: "nowrap",
                }}
              >
                MATCH
              </th>
              <th
                style={{
                  padding: "14px",
                  color: "#fff",
                  textAlign: "right",
                  fontWeight: 800,
                  fontSize: "11px",
                }}
              >
                TEAM 1
              </th>
              <th
                style={{
                  padding: "14px",
                  color: "#fff",
                  textAlign: "center",
                  fontWeight: 800,
                  fontSize: "11px",
                  width: "110px",
                  whiteSpace: "nowrap",
                }}
              >
                SCORE
              </th>
              <th
                style={{
                  padding: "14px",
                  color: "#fff",
                  textAlign: "left",
                  fontWeight: 800,
                  fontSize: "11px",
                }}
              >
                TEAM 2
              </th>
              <th
                style={{
                  padding: "14px",
                  color: "#fff",
                  textAlign: "center",
                  fontWeight: 800,
                  fontSize: "11px",
                  width: "90px",
                  whiteSpace: "nowrap",
                }}
              >
                RESULT
              </th>
            </tr>
          </thead>
          <tbody>
            {storedGroupings.map((group) => {
              const gMatches: [any, any][] = [];
              for (let i = 0; i < group.teams.length; i++)
                for (let j = i + 1; j < group.teams.length; j++)
                  gMatches.push([group.teams[i], group.teams[j]]);
              return gMatches.map(([t1, t2], mi) => {
                const mid = groupMatchId(group.name, t1, t2);
                const score = draw.matchScores?.[mid];
                const result = draw.matchResults?.[mid];
                const isT1Win = result === t1._id;
                const isT2Win = result === t2._id;
                return (
                  <tr
                    key={`${group.name}-${mi}`}
                    style={{
                      background: mi % 2 === 0 ? "#fff" : "#fafafa",
                      borderBottom: "1px solid #f0f0f0",
                    }}
                  >
                    <td
                      style={{
                        padding: "16px 14px",
                        color: "#71717a",
                        fontWeight: 800,
                        fontSize: "11px",
                        lineHeight: "1.5",
                      }}
                    >
                      GRP {group.name}
                    </td>
                    <td
                      style={{
                        padding: "16px 14px",
                        textAlign: "right",
                        fontWeight: isT1Win ? 900 : 700,
                        color: isT1Win ? "#DD1D25" : "#18181b",
                        fontSize: "13px",
                        textTransform: "uppercase",
                        lineHeight: "1.5",
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                      }}
                    >
                      {t1.name}
                    </td>
                    <td style={{ padding: "16px 14px", textAlign: "center" }}>
                      {score ? (
                        <span
                          style={{
                            fontWeight: 900,
                            background: "#18181b",
                            color: "#fff",
                            padding: "8px 16px",
                            borderRadius: "100px",
                            fontSize: "12px",
                            letterSpacing: "0.1em",
                            lineHeight: "1",
                          }}
                        >
                          {score}
                        </span>
                      ) : (
                        <span
                          style={{
                            color: "#a1a1aa",
                            fontWeight: 800,
                            fontSize: "11px",
                            border: "1px dashed #e4e4e7",
                            padding: "6px 16px",
                            borderRadius: "100px",
                            lineHeight: "1",
                          }}
                        >
                          VS
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "16px 14px",
                        textAlign: "left",
                        fontWeight: isT2Win ? 900 : 700,
                        color: isT2Win ? "#DD1D25" : "#18181b",
                        fontSize: "13px",
                        textTransform: "uppercase",
                        lineHeight: "1.5",
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                      }}
                    >
                      {t2.name}
                    </td>
                    <td style={{ padding: "16px 14px", textAlign: "center" }}>
                      {result ? (
                        <span
                          style={{
                            background: "#DD1D25",
                            color: "#fff",
                            padding: "6px 12px",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: 900,
                            letterSpacing: "0.05em",
                            lineHeight: "1",
                          }}
                        >
                          WIN
                        </span>
                      ) : (
                        <span
                          style={{
                            color: "#d4d4d8",
                            fontSize: "10px",
                            fontWeight: 800,
                            lineHeight: "1",
                          }}
                        >
                          TBD
                        </span>
                      )}
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>

      {/* ── SECTION 3: Group Standings ── */}
      <div data-pdf-section="group-standings">
        <div
          style={{
            fontSize: "11px",
            fontWeight: 800,
            color: "#DD1D25",
            textTransform: "uppercase",
            letterSpacing: "0.3em",
            marginBottom: "24px",
            borderLeft: "4px solid #DD1D25",
            paddingLeft: "12px",
          }}
        >
          Group Standings
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "32px" }}>
          {storedGroupings.map((group) => {
            const standings = computeStandings(group.name, group.teams);
            return (
              <div key={group.name} style={{ flex: "1", minWidth: "320px" }}>
                <div
                  style={{
                    background: "#18181b",
                    padding: "12px 16px",
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: "15px",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Group {group.name}
                </div>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    border: "1px solid #e4e4e7",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          color: "#71717a",
                          fontSize: "11px",
                          fontWeight: 800,
                        }}
                      >
                        TEAM
                      </th>
                      {["P", "W", "L", "DIFF", "PTS"].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "12px",
                            textAlign: "center",
                            color: "#71717a",
                            fontSize: "11px",
                            fontWeight: 800,
                            width: "40px",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row, ri) => (
                      <tr
                        key={row.team._id}
                        style={{
                          background: ri % 2 === 0 ? "#fff" : "#fafafa",
                          borderBottom:
                            ri < standings.length - 1
                              ? "1px solid #f1f5f9"
                              : "none",
                        }}
                      >
                        <td
                          style={{
                            padding: "16px 12px",
                            verticalAlign: "middle",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              lineHeight: "1.4",
                            }}
                          >
                            {ri < 2 && (
                              <span
                                style={{
                                  width: "10px",
                                  height: "10px",
                                  borderRadius: "50%",
                                  background: "#DD1D25",
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            <span
                              style={{
                                fontWeight: ri < 2 ? 900 : 700,
                                fontSize: "13px",
                                color: "#18181b",
                                textTransform: "uppercase",
                                wordBreak: "break-word",
                                overflowWrap: "break-word",
                              }}
                            >
                              {row.team.name}
                            </span>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "16px 12px",
                            textAlign: "center",
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "#52525b",
                            lineHeight: "1.4",
                          }}
                        >
                          {row.P}
                        </td>
                        <td
                          style={{
                            padding: "16px 12px",
                            textAlign: "center",
                            fontSize: "13px",
                            fontWeight: 800,
                            color: "#16a34a",
                            lineHeight: "1.4",
                          }}
                        >
                          {row.W}
                        </td>
                        <td
                          style={{
                            padding: "16px 12px",
                            textAlign: "center",
                            fontSize: "13px",
                            fontWeight: 800,
                            color: "#dc2626",
                            lineHeight: "1.4",
                          }}
                        >
                          {row.L}
                        </td>
                        <td
                          style={{
                            padding: "16px 12px",
                            textAlign: "center",
                            fontSize: "13px",
                            fontWeight: 800,
                            color:
                              row.Diff > 0
                                ? "#16a34a"
                                : row.Diff < 0
                                  ? "#dc2626"
                                  : "#a1a1aa",
                            lineHeight: "1.4",
                          }}
                        >
                          {row.Diff > 0 ? `+${row.Diff}` : row.Diff}
                        </td>
                        <td
                          style={{
                            padding: "16px 12px",
                            textAlign: "center",
                            fontSize: "14px",
                            fontWeight: 900,
                            color: "#18181b",
                            background: "#f8fafc",
                            lineHeight: "1.4",
                          }}
                        >
                          {row.Pts}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
        <div
          style={{
            marginTop: "20px",
            fontSize: "11px",
            color: "#a1a1aa",
            fontWeight: 800,
          }}
        >
          🔴 TOP 2 ADVANCE · WIN = 1 PT · LOSS = 0 PTS
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   MAIN PDF TEMPLATE
───────────────────────────────────────── */
export const DrawPdfTemplate = ({
  draws,
  eventTitle,
}: {
  draws: any[];
  eventTitle: string;
}) => {
  return (
    <div
      id="pdf-export-content"
      className="bg-white text-black font-sans pb-12"
      style={{ width: "1200px", maxWidth: "100%" }}
    >
      {/* ── HEADER (white, red bottom border) ── */}
      <div
        data-pdf-section="document-header"
        style={{
          background: "#fff",
          padding: "32px 48px",
          display: "flex",
          alignItems: "center",
          gap: "24px",
          marginBottom: "48px",
          borderBottom: "4px solid #DD1D25",
        }}
      >
        <img
          src={logo}
          alt="SSRC Sports Club"
          style={{ width: "80px", height: "80px", objectFit: "contain" }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#DD1D25",
              textTransform: "uppercase",
              letterSpacing: "0.35em",
              marginBottom: "4px",
            }}
          >
            SSRC Sports Club
          </div>
          <div
            style={{
              fontSize: "34px",
              fontWeight: 900,
              color: "#18181b",
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              wordBreak: "break-word",
              overflowWrap: "break-word",
            }}
          >
            {eventTitle}
          </div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#71717a",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              marginTop: "8px",
            }}
          >
            Tournament Draws &amp; Brackets
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "10px",
              color: "#71717a",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Issued
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "#52525b",
              fontWeight: 700,
              marginTop: "4px",
            }}
          >
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </div>

      {/* ── DRAWS ── */}
      {draws.map((draw) => (
        <div key={draw._id} style={{ marginBottom: "56px", padding: "0 48px" }}>
          {/* Section title */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "28px",
            }}
          >
            <span
              style={{
                fontSize: "22px",
                fontWeight: 900,
                textTransform: "uppercase",
                color: "#18181b",
                letterSpacing: "0.05em",
                wordBreak: "break-word",
                overflowWrap: "break-word",
              }}
            >
              {draw.sport}
            </span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 800,
                textTransform: "uppercase",
                background: draw.format === "Knockout" ? "#18181b" : "#DD1D25",
                color: "#fff",
                padding: "4px 12px",
                borderRadius: "100px",
                letterSpacing: "0.15em",
              }}
            >
              {draw.format} Stage
            </span>
            <div style={{ flex: 1, height: "2px", background: "#f4f4f5" }} />
          </div>

          {draw.format === "Knockout" ? (
            <KnockoutPdfTemplate draw={draw} />
          ) : (
            <GroupPdfTemplate draw={draw} />
          )}
        </div>
      ))}

      {/* ── FOOTER ── */}
      <div
        style={{
          borderTop: "1px solid #f4f4f5",
          margin: "0 48px",
          paddingTop: "16px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: "9px",
            color: "#a1a1aa",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
          }}
        >
          SSRC Sports Club — Official Tournament Document
        </span>
        <span style={{ fontSize: "9px", color: "#a1a1aa" }}>
          {new Date().getFullYear()} · Confidential
        </span>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   TEAMS LIST TEMPLATE
───────────────────────────────────────── */
export const TeamsPdfTemplate = ({
  sport,
  teams,
}: {
  sport: string;
  teams: any[];
}) => {
  return (
    <div
      id="pdf-teams-content"
      className="bg-white text-black font-sans pb-12"
      style={{ width: "1200px", maxWidth: "100%" }}
    >
      {/* ── HEADER ── */}
      <div
        data-pdf-section="document-header"
        style={{
          background: "#fff",
          padding: "32px 48px",
          display: "flex",
          alignItems: "center",
          gap: "24px",
          marginBottom: "48px",
          borderBottom: "4px solid #DD1D25",
        }}
      >
        <img
          src={logo}
          alt="SSRC Sports Club"
          style={{ width: "80px", height: "80px", objectFit: "contain" }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#DD1D25",
              textTransform: "uppercase",
              letterSpacing: "0.35em",
              marginBottom: "4px",
            }}
          >
            SSRC Sports Club
          </div>
          <div
            style={{
              fontSize: "34px",
              fontWeight: 900,
              color: "#18181b",
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              wordBreak: "break-word",
              overflowWrap: "break-word",
            }}
          >
            {sport}
          </div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#71717a",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              marginTop: "8px",
            }}
          >
            Official Registered Teams
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "10px",
              color: "#71717a",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Issued
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "#52525b",
              fontWeight: 700,
              marginTop: "4px",
            }}
          >
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </div>

      {/* ── TEAMS LIST ── */}
      <div style={{ padding: "0 48px" }}>
        {teams.map((team, index) => (
          <div
            key={team._id}
            data-pdf-section="team-info"
            style={{
              marginBottom: "40px",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "#18181b",
                padding: "16px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: "18px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {index + 1}. {team.name}
              </span>
              <span
                style={{
                  background: "#DD1D25",
                  color: "#fff",
                  fontSize: "10px",
                  fontWeight: 800,
                  padding: "4px 12px",
                  borderRadius: "100px",
                  textTransform: "uppercase",
                }}
              >
                {team.teamType}
              </span>
            </div>

            <div style={{ padding: "24px", background: "#ffffff" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "24px",
                }}
              >
                {team.members.map((member: any, mIdx: number) => (
                  <div
                    key={mIdx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      padding: "14px",
                      background: mIdx === 0 ? "#fff5f5" : "#f9fafb",
                      border:
                        mIdx === 0 ? "1px solid #DD1D25" : "1px solid #f3f4f6",
                      borderRadius: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: mIdx === 0 ? "#DD1D25" : "#d1d5db",
                        color: mIdx === 0 ? "#fff" : "#4b5563",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        fontSize: "12px",
                      }}
                    >
                      {mIdx === 0 ? "C" : mIdx + 1}
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: "14px",
                          color: "#18181b",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        {member.name}
                        {mIdx === 0 && (
                          <span
                            style={{
                              fontSize: "8px",
                              background: "#DD1D25",
                              color: "#fff",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              textTransform: "uppercase",
                            }}
                          >
                            Captain
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: mIdx === 0 ? "#7a1a1e" : "#52525b",
                          marginTop: "2px",
                        }}
                      >
                        {member.email} • {member.phone}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── FOOTER ── */}
      <div
        style={{
          borderTop: "1px solid #f4f4f5",
          margin: "48px 48px 0",
          paddingTop: "16px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: "9px",
            color: "#a1a1aa",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
          }}
        >
          SSRC Sports Club — Official Document
        </span>
        <span style={{ fontSize: "9px", color: "#a1a1aa" }}>
          {new Date().getFullYear()} · Confidential
        </span>
      </div>
    </div>
  );
};
