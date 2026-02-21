import { useState, useEffect } from "react";
import Modal from "../../ui/Modal";
import api from "../../../services/api";
import DrawTeamsModal from "./DrawTeamsModal";
import LoadingSpinner from "../../ui/LoadingSpinner";

interface TeamMember {
  _id?: string;
  name: string;
  email: string;
  phone: string;
}

interface Team {
  _id: string;
  name: string;
  sport: string;
  teamType: string;
  members: TeamMember[];
  executive?: {
    _id: string;
    name: string;
    email: string;
  };
  event?: string;
  createdAt: string;
}

const AllTeams = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false);
  const [preSelectedSport, setPreSelectedSport] = useState<string>("");
  const [preSelectedEventId, setPreSelectedEventId] = useState<string>("");
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsRes, eventsRes] = await Promise.all([
          api.get("/teams"),
          api.get("/events"),
        ]);
        setTeams(teamsRes.data);
        setEvents(eventsRes.data);
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError("Failed to load teams");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Group teams by active/past status and sport
  const teamsCategorized = teams.reduce(
    (acc, team) => {
      const sport = team.sport || "General";
      const sportLower = sport.toLowerCase();
      const matchingEvent = events.find(
        (e) =>
          e._id === team.event ||
          e.slug === sportLower ||
          e.title.toLowerCase().includes(sportLower),
      );

      // If no event is associated, don't show the team (as per user request)
      if (!matchingEvent && team.teamType === "event") return acc;

      const isPast =
        matchingEvent &&
        new Date(matchingEvent.endDate || matchingEvent.date) < new Date();

      const category = isPast ? "past" : "active";

      if (!acc[category][sport]) {
        acc[category][sport] = [];
      }
      acc[category][sport].push(team);
      return acc;
    },
    { active: {}, past: {} } as {
      active: Record<string, Team[]>;
      past: Record<string, Team[]>;
    },
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="p-10 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="p-6 space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          All Registered Teams
        </h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-zinc-500">
            {teams.length} Teams Total
          </div>
        </div>
      </div>

      {/* Active Teams */}
      {Object.keys(teamsCategorized.active).length === 0 ? (
        <div className="text-center py-20 text-zinc-500 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
          No active teams registered yet.
        </div>
      ) : (
        Object.entries(teamsCategorized.active).map(([sport, sportTeams]) => (
          <div key={sport} className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-lg">
                {sport}
              </h2>
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">
                    {sportTeams.filter((t) => t.teamType === "event").length}{" "}
                    Event Teams
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">
                    {sportTeams.length} Total
                  </span>
                </div>
                <button
                  onClick={() => {
                    const sportLower = sport.toLowerCase();
                    const matchingEvent = events.find(
                      (e) =>
                        e.slug === sportLower ||
                        e.title.toLowerCase().includes(sportLower),
                    );
                    setPreSelectedSport(sport);
                    if (matchingEvent) {
                      setPreSelectedEventId(matchingEvent._id);
                    }
                    setIsDrawModalOpen(true);
                  }}
                  className="px-3 py-1 bg-[#DD1D25] text-white text-[10px] font-bold uppercase tracking-wider rounded-md hover:bg-[#C41920] transition-all transform active:scale-95 shadow-sm"
                >
                  Draw Teams
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sportTeams.map((team) => (
                <button
                  key={team._id}
                  onClick={() => setSelectedTeam(team)}
                  className="group text-left p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md hover:border-[#DD1D25] dark:hover:border-[#DD1D25]/50 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-[#DD1D25] transition-colors">
                      {team.name}
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                      {team.teamType}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <div className="flex -space-x-2">
                      {team.members.slice(0, 3).map((m, i) => (
                        <div
                          key={i}
                          className="w-7 h-7 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold"
                        >
                          {m.name.charAt(0)}
                        </div>
                      ))}
                      {team.members.length > 3 && (
                        <div className="w-7 h-7 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                          +{team.members.length - 3}
                        </div>
                      )}
                    </div>
                    <span>{team.members.length} Members</span>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-zinc-50 dark:border-zinc-800/50">
                    <span className="text-zinc-400">
                      Captain: {team.members[0]?.name || "N/A"}
                    </span>
                    <span className="text-[#DD1D25] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      Details <span>&rarr;</span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Past Teams Section */}
      {Object.keys(teamsCategorized.past).length > 0 && (
        <div className="space-y-8 pt-10 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-zinc-500 uppercase tracking-widest">
              Past Teams
            </h2>
            <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
          </div>

          {Object.entries(teamsCategorized.past).map(([sport, sportTeams]) => (
            <div key={sport} className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-md font-bold text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 px-3 py-1 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  {sport}
                </h3>
                <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800/50" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Event Ended
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75 grayscale hover:grayscale-0 transition-all">
                {sportTeams.map((team) => (
                  <button
                    key={team._id}
                    onClick={() => setSelectedTeam(team)}
                    className="group text-left p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-50 transition-colors">
                        {team.name}
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
                        {team.teamType}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <div className="flex -space-x-2">
                        {team.members.slice(0, 3).map((m, i) => (
                          <div
                            key={i}
                            className="w-7 h-7 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold"
                          >
                            {m.name.charAt(0)}
                          </div>
                        ))}
                      </div>
                      <span>{team.members.length} Members</span>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-zinc-100 dark:border-zinc-800/30">
                      <span className="text-zinc-400">
                        Captain: {team.members[0]?.name || "N/A"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!selectedTeam}
        onClose={() => setSelectedTeam(null)}
        title="Team Information"
      >
        {selectedTeam && (
          <div className="space-y-6">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {selectedTeam.name}
                </h2>
                <span className="px-2 py-1 bg-[#DD1D25]/10 text-[#DD1D25] text-xs font-bold rounded-lg uppercase">
                  {selectedTeam.sport}
                </span>
              </div>
              <p className="text-zinc-500 text-sm">
                Registered on{" "}
                {new Date(selectedTeam.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest px-1">
                Team Members ({selectedTeam.members.length})
              </h3>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {selectedTeam.members.map((member, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-600 dark:text-zinc-400">
                      {member.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-zinc-900 dark:text-zinc-50 truncate flex items-center gap-2">
                        {member.name}
                        {idx === 0 && (
                          <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase">
                            Captain
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span>{member.email}</span>
                        <span>•</span>
                        <span>{member.phone}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                onClick={() => setSelectedTeam(null)}
                className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Close
              </button>
              <a
                href={`mailto:${selectedTeam.members[0]?.email}`}
                className="flex-2 py-2.5 bg-[#DD1D25] text-white font-bold rounded-xl text-center hover:bg-[#C41920] transition-colors"
              >
                Contact Captain
              </a>
            </div>
          </div>
        )}
      </Modal>

      <DrawTeamsModal
        isOpen={isDrawModalOpen}
        onClose={() => {
          setIsDrawModalOpen(false);
          setPreSelectedSport("");
          setPreSelectedEventId("");
        }}
        teams={teams}
        events={events}
        initialSport={preSelectedSport}
        initialEventId={preSelectedEventId}
      />
    </div>
  );
};

export default AllTeams;
