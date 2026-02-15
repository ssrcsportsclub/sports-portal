import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { useAppSelector } from "../../../store/hooks";
import MatchScoreModal from "./MatchScoreModal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../../../styles/datepicker-custom.css"; // We'll create this for custom dark mode styles

interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  endDate?: string;
  location: string;
  slug?: string;
  organizer: string;
  form?: {
    _id: string;
    isActive: boolean;
    formId: string;
  };
}

interface Team {
  _id: string;
  name: string;
  sport: string;
  members: any[];
}

interface Draw {
  _id: string;
  format: "Group" | "Knockout";
  sport: string;
  teamSize?: number;
  drawnTeams: Team[];
  matchResults?: Record<string, string>;
  matchScores?: Record<string, string>; // Added matchScores
  createdAt: string;
}

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [draws, setDraws] = useState<Draw[]>([]);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    date: "",
    endDate: "",
    location: "",
  });

  // Match Scoring Modal State
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<{
    drawId: string;
    matchId: string;
    team1: any;
    team2: any;
    currentScore: string;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [eventRes, drawsRes] = await Promise.all([
          api.get(`/events/${id}`),
          api.get(`/draws/event/${id}`),
        ]);

        const data = eventRes.data;
        setEvent(data);
        setDraws(drawsRes.data);

        setEditFormData({
          title: data.title,
          description: data.description,
          date: new Date(data.date).toISOString().slice(0, 16),
          endDate: data.endDate
            ? new Date(data.endDate).toISOString().slice(0, 16)
            : "",
          location: data.location,
        });
      } catch (err: any) {
        console.error("Error fetching event details:", err);
        setFormError("Failed to load event details");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/events/${id}`, editFormData);
      setEvent((prev) => (prev ? { ...prev, ...editFormData } : null));
      setIsEditing(false);
      alert("Event updated successfully!");
    } catch (err) {
      console.error("Error updating event:", err);
      alert("Failed to update event.");
    }
  };

  const handleOpenScoreModal = (
    drawId: string,
    matchId: string,
    team1: any,
    team2: any,
    currentScore: string,
  ) => {
    if (!isAdmin || !hasStarted) return;
    setSelectedMatch({ drawId, matchId, team1, team2, currentScore });
    setIsScoreModalOpen(true);
  };

  const isAdmin = user?.role === "admin";
  const hasStarted = event && new Date() >= new Date(event.date);

  if (loading)
    return <div className="p-6 text-center text-zinc-500">Loading...</div>;
  if (formError || !event)
    return (
      <div className="p-6 text-center text-red-500">
        {formError || "Event not found"}
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 flex items-center gap-1"
        >
          &larr; Back
        </button>
        {isAdmin && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-md text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            {isEditing ? "Cancel Edit" : "Edit Event"}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {/* Header Image / Gradient */}
        <div className="h-48 bg-zinc-100 dark:bg-zinc-800 relative">
          <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            {!isEditing ? (
              <h1 className="text-3xl font-bold text-white mb-2">
                {event.title}
              </h1>
            ) : (
              <input
                type="text"
                value={editFormData.title}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, title: e.target.value })
                }
                className="w-full px-3 py-2 bg-black/50 backdrop-blur-sm border border-white/20 text-white text-2xl font-bold rounded focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            )}

            <div className="flex items-center gap-4 text-zinc-200 text-sm mt-2">
              <span className="flex items-center gap-1">
                📍{" "}
                {!isEditing ? (
                  event.location
                ) : (
                  <input
                    type="text"
                    value={editFormData.location}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        location: e.target.value,
                      })
                    }
                    className="px-2 py-1 bg-black/50 backdrop-blur-sm border border-white/20 text-white rounded text-xs focus:outline-none focus:ring-1 focus:ring-white/50"
                  />
                )}
              </span>
              <span className="flex items-center gap-1">
                📅{" "}
                {!isEditing ? (
                  new Date(event.date).toLocaleString()
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-white/70 uppercase">
                      Start Date
                    </span>
                    <DatePicker
                      selected={
                        editFormData.date ? new Date(editFormData.date) : null
                      }
                      onChange={(date: Date | null) =>
                        setEditFormData({
                          ...editFormData,
                          date: date ? date.toISOString() : "",
                        })
                      }
                      showTimeSelect
                      dateFormat="MMMM d, yyyy h:mm aa"
                      className="w-full px-2 py-1 bg-black/50 backdrop-blur-sm border border-white/20 text-white rounded text-xs focus:outline-none focus:ring-1 focus:ring-white/50"
                      wrapperClassName="w-full"
                    />
                  </div>
                )}
              </span>
              <span className="flex items-center gap-1">
                🏁{" "}
                {!isEditing ? (
                  event.endDate ? (
                    new Date(event.endDate).toLocaleString()
                  ) : (
                    "No End Date"
                  )
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-white/70 uppercase">
                      End Date
                    </span>
                    <DatePicker
                      selected={
                        editFormData.endDate
                          ? new Date(editFormData.endDate)
                          : null
                      }
                      onChange={(date: Date | null) =>
                        setEditFormData({
                          ...editFormData,
                          endDate: date ? date.toISOString() : "",
                        })
                      }
                      showTimeSelect
                      dateFormat="MMMM d, yyyy h:mm aa"
                      className="w-full px-2 py-1 bg-black/50 backdrop-blur-sm border border-white/20 text-white rounded text-xs focus:outline-none focus:ring-1 focus:ring-white/50"
                      wrapperClassName="w-full"
                    />
                  </div>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Content: Description */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                About Event
              </h2>
              {isEditing ? (
                <textarea
                  rows={6}
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      description: e.target.value,
                    })
                  }
                  className="w-full p-3 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent text-zinc-800 dark:text-zinc-200"
                />
              ) : (
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </p>
              )}
            </div>

            {isEditing && (
              <button
                onClick={handleUpdate}
                className="px-6 py-2 bg-[#DD1D25] text-white font-medium rounded-md hover:bg-[#C41920]"
              >
                Save Changes
              </button>
            )}
          </div>

          {/* Right Sidebar: Actions */}
          <div className="space-y-6">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                Registration
              </h3>

              {event.slug && event.form?.isActive ? (
                <Link
                  to={`/form/${event.slug}`}
                  className="block w-full py-2.5 px-4 bg-[#DD1D25] text-white text-center font-semibold rounded-lg hover:bg-[#C41920] transition-transform active:scale-95"
                >
                  Register Now
                </Link>
              ) : (
                <div className="text-center p-3 bg-zinc-200 dark:bg-zinc-700 rounded text-zinc-500 text-sm">
                  Registration Closed / Not Available
                </div>
              )}

              <p className="mt-4 text-xs text-center text-zinc-500">
                Clicking register will take you to the official registration
                form.
              </p>
            </div>
          </div>
        </div>

        {/* Draw Results Section - Full Width */}
        {!isEditing && draws.length > 0 && (
          <div className="p-6 border-t border-zinc-100 dark:border-zinc-800">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-6 flex items-center gap-2">
              🏆 Tournament Brackets & Draws
            </h2>

            <div className="space-y-12">
              {draws.map((draw) => (
                <div key={draw._id} className="space-y-4">
                  <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <div>
                      <span className="text-sm font-bold text-[#DD1D25] uppercase tracking-wider">
                        {draw.sport}
                      </span>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                        {draw.format} Draw Results
                      </h3>
                    </div>
                    <div className="text-[10px] text-zinc-400 font-medium bg-white dark:bg-zinc-900 px-2 py-1 rounded border border-zinc-100 dark:border-zinc-800 uppercase tracking-widest">
                      {new Date(draw.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {draw.format === "Knockout" ? (
                    <div className="overflow-x-auto pb-10 custom-scrollbar">
                      <div className="min-w-[1000px] p-8 bg-zinc-50/50 dark:bg-zinc-800/10 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50">
                        {(() => {
                          const teams = draw.drawnTeams;
                          const n = teams.length;
                          if (n === 0)
                            return (
                              <div className="text-center py-10">
                                <p className="text-zinc-500 font-medium italic">
                                  No teams have been drawn for this event yet.
                                </p>
                              </div>
                            );

                          // Find next power of 2 to determine the starting round
                          const p = Math.pow(2, Math.ceil(Math.log2(n)));
                          const rounds = [];
                          let currSize = p;
                          while (currSize >= 1) {
                            rounds.push(currSize);
                            currSize /= 2;
                          }

                          // Helper to get winner of a match
                          const getWinner = (
                            roundSize: number,
                            matchIdx: number,
                          ) => {
                            const matchId = `r${roundSize}m${matchIdx}`;
                            const winnerId = draw.matchResults?.[matchId];
                            return (
                              teams.find((t) => t._id === winnerId) || null
                            );
                          };

                          // Helper to get team in a specific slot
                          const getTeam = (
                            roundSize: number,
                            matchIdx: number,
                            slotIdx: number,
                          ) => {
                            if (roundSize === p) {
                              // Initial round: some teams get byes if n < p
                              // Standard distribution: first (p-n) teams get byes?
                              // Simplified: Fill slots 0 to n-1. Slots >= n are BYEs.
                              const teamIdx = matchIdx * 2 + slotIdx;
                              return teams[teamIdx] || null;
                            } else {
                              // Subsequent rounds: Winner of previous round matches
                              return getWinner(
                                roundSize * 2,
                                matchIdx * 2 + slotIdx,
                              );
                            }
                          };

                          return (
                            <div className="flex gap-12 items-stretch">
                              {rounds.map((roundSize, roundIdx) => (
                                <div
                                  key={roundIdx}
                                  className="flex flex-col justify-around gap-6 py-4"
                                  style={{ minWidth: "220px" }}
                                >
                                  <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4 text-center">
                                    {roundSize === 1
                                      ? "🏆 Champion"
                                      : roundSize === 2
                                        ? "Finals"
                                        : roundSize === 4
                                          ? "Semi Finals"
                                          : roundSize === 8
                                            ? "Quarter Finals"
                                            : `Round of ${roundSize}`}
                                  </div>

                                  {Array.from({
                                    length:
                                      roundSize / (roundSize === 1 ? 1 : 2)
                                        ? Math.max(1, roundSize / 2)
                                        : 1,
                                  }).map((_, matchIdx) => {
                                    // Final winner slot
                                    if (roundSize === 1) {
                                      const champion = getWinner(2, 0); // Winner of Finals
                                      return (
                                        <div
                                          key="champion"
                                          className="relative flex flex-col items-center"
                                        >
                                          <div
                                            className={`w-full p-6 ${champion ? "bg-linear-to-br from-[#FFD700] to-[#FFA500] text-black shadow-[#FFD700]/20" : "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-400"} rounded-2xl shadow-2xl border-2 border-white/50 flex flex-col items-center gap-3 transform transition-all duration-500 ${champion ? "scale-110 shadow-xl" : "opacity-50"}`}
                                          >
                                            <span className="text-3xl">
                                              {champion ? "👑" : "🏆"}
                                            </span>
                                            <div className="flex flex-col items-center text-center">
                                              <span className="font-black text-[10px] uppercase tracking-[0.2em] mb-1">
                                                Tournament Champion
                                              </span>
                                              <span
                                                className={`font-bold text-base ${champion ? "text-black" : "italic"}`}
                                              >
                                                {champion
                                                  ? champion.name
                                                  : "Waiting for Finals..."}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    }

                                    const team1 = getTeam(
                                      roundSize,
                                      matchIdx,
                                      0,
                                    );
                                    const team2 = getTeam(
                                      roundSize,
                                      matchIdx,
                                      1,
                                    );
                                    const winner = getWinner(
                                      roundSize,
                                      matchIdx,
                                    );
                                    const matchId = `r${roundSize}m${matchIdx}`;

                                    // Handle BYE progression automatically if not set
                                    if (
                                      roundSize === p &&
                                      team1 &&
                                      !team2 &&
                                      !winner
                                    ) {
                                      // Auto-set winner for BYE matches in background or return winner contextually
                                      // For now, let's just make it clickable or automated
                                    }

                                    return (
                                      <div
                                        key={matchIdx}
                                        className={`relative flex flex-col gap-10 w-full group ${
                                          isAdmin &&
                                          team1 &&
                                          team2 &&
                                          !draw.matchResults?.[matchId]
                                            ? "cursor-pointer"
                                            : ""
                                        }`}
                                        onClick={() => {
                                          if (
                                            isAdmin &&
                                            team1 &&
                                            team2 &&
                                            !draw.matchResults?.[matchId]
                                          ) {
                                            handleOpenScoreModal(
                                              draw._id,
                                              matchId,
                                              team1,
                                              team2,
                                              draw.matchScores?.[matchId] || "",
                                            );
                                          }
                                        }}
                                        title={
                                          isAdmin &&
                                          team1 &&
                                          team2 &&
                                          !draw.matchResults?.[matchId]
                                            ? "Click to manage match"
                                            : ""
                                        }
                                      >
                                        <div className="flex flex-col gap-1.5">
                                          {[team1, team2].map((t, i) => {
                                            const matchResult =
                                              draw.matchResults?.[matchId];
                                            const isWinner =
                                              t && matchResult === t._id;

                                            return (
                                              <div
                                                key={i}
                                                className={`relative flex items-center p-3 rounded-xl border transition-all truncate text-left w-full h-[52px] ${
                                                  isWinner
                                                    ? "bg-[#DD1D25] border-[#DD1D25] text-white shadow-lg shadow-[#DD1D25]/20 z-10"
                                                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
                                                } ${
                                                  isAdmin &&
                                                  team1 &&
                                                  team2 &&
                                                  !draw.matchResults?.[matchId]
                                                    ? "group-hover:ring-2 ring-[#DD1D25]/30"
                                                    : ""
                                                }`}
                                              >
                                                <div className="flex-1 min-w-0 pr-12">
                                                  <span
                                                    className={`block truncate ${isWinner ? "font-black" : "font-medium opacity-60"}`}
                                                  >
                                                    {t ? t.name : "TBD Slot"}
                                                  </span>
                                                </div>
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-end gap-1">
                                                  {t && (
                                                    <span
                                                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded shadow-sm ${isWinner ? "bg-white/20 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"}`}
                                                    >
                                                      #{matchIdx * 2 + i + 1}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>

                                        {/* Score Display - Always visible if score exists */}
                                        {team1 &&
                                          team2 &&
                                          draw.matchScores?.[matchId] && (
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                                              <div className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm">
                                                <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 tabular-nums tracking-widest">
                                                  {draw.matchScores[matchId]}
                                                </span>
                                              </div>
                                            </div>
                                          )}
                                        {/* Connector Line to next round */}
                                        {roundSize > 2 && (
                                          <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-[60%] border-y border-r border-zinc-300 dark:border-zinc-700 rounded-r-xl"></div>
                                        )}
                                        {roundSize === 2 && (
                                          <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-px bg-zinc-300 dark:border-zinc-700"></div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-5 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#DD1D25]"></span>
                            How to update results
                          </h4>
                          <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                            {isAdmin
                              ? "As an administrator, you can click on any team within a match to mark them as the winner. The bracket will automatically advance the winning team to the next round."
                              : "The bracket is updated in real-time as match results are reported. Please check back regularly for updates on tournament progression."}
                          </p>
                        </div>
                        <div className="flex flex-col justify-center gap-3 px-2">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-[#DD1D25]"></div>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                              Advanced / Winner
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"></div>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                              Pending Match
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30"></div>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                              BYE / To be determined
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {draw.drawnTeams.map((team, idx) => (
                        <div
                          key={team._id}
                          className="p-3 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg shadow-sm flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-[#DD1D25] text-xs">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-zinc-900 dark:text-zinc-50 truncate">
                              {team.name}
                            </p>
                            <p className="text-[10px] text-zinc-500 uppercase">
                              {team.members.length} Players Team
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedMatch && (
        <MatchScoreModal
          isOpen={isScoreModalOpen}
          onClose={() => setIsScoreModalOpen(false)}
          drawId={selectedMatch.drawId}
          matchId={selectedMatch.matchId}
          team1={selectedMatch.team1}
          team2={selectedMatch.team2}
          currentScore={selectedMatch.currentScore}
          onUpdate={(newDraw) => {
            setDraws((prev) =>
              prev.map((d) => (d._id === newDraw._id ? newDraw : d)),
            );
          }}
        />
      )}
    </div>
  );
};

export default EventDetails;
