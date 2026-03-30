import { useState, useEffect, useRef } from "react";
import Modal from "../../ui/Modal";
import api from "../../../services/api";
import DrawTeamsModal from "./DrawTeamsModal";
import LoadingSpinner from "../../ui/LoadingSpinner";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { TeamsPdfTemplate } from "./DrawPdfTemplate";
import { toast } from "react-hot-toast";

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
  const [draws, setDraws] = useState<any[]>([]);

  // PDF Export State
  const [isDownloading, setIsDownloading] = useState(false);
  const [exportData, setExportData] = useState<{
    sport: string;
    teams: Team[];
  } | null>(null);
  const exportContainerRef = useRef<HTMLDivElement>(null);

  const handleDownloadTeamsPDF = async (
    sportName: string,
    sportTeams: Team[],
  ) => {
    setExportData({ sport: sportName, teams: sportTeams });
    setIsDownloading(true);

    // Wait for the DOM to update with the export data
    setTimeout(async () => {
      if (!exportContainerRef.current) {
        setIsDownloading(false);
        return;
      }

      try {
        const container = exportContainerRef.current;
        const originalStyle = container.style.cssText;
        container.style.height = "auto";
        container.style.overflow = "visible";

        container.style.position = "relative";
        const containerTop = container.getBoundingClientRect().top;
        const containerScrollWidth = container.scrollWidth;

        // Collect high-level section bounds so we can avoid splitting them across pages
        const sectionRectsDom = Array.from(
          container.querySelectorAll("[data-pdf-section]"),
        ).map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            top: rect.top - containerTop,
            bottom: rect.bottom - containerTop,
          };
        });

        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: containerScrollWidth,
          onclone: (documentClone) => {
            // html2canvas crashes resolving OKLCH and OKLAB colors, which might be added by Tailwind v4.
            // We manually find elements in the clone with OKLCH/OKLAB variables and replace them.
            const elements = documentClone.getElementsByTagName("*");
            for (let i = 0; i < elements.length; i++) {
              const el = elements[i] as HTMLElement;
              const style = window.getComputedStyle(el);
              const propsToCheck = [
                "color",
                "backgroundColor",
                "borderColor",
                "boxShadow",
                "backgroundImage",
              ];

              for (const prop of propsToCheck) {
                const val = style.getPropertyValue(
                  prop.replace(/([A-Z])/g, "-$1").toLowerCase(),
                );
                if (val && (val.includes("oklch") || val.includes("oklab"))) {
                  el.style.setProperty(
                    prop.replace(/([A-Z])/g, "-$1").toLowerCase(),
                    "transparent",
                    "important",
                  );
                }
              }
              if (
                el.style.cssText.includes("oklch") ||
                el.style.cssText.includes("oklab")
              ) {
                el.style.cssText = el.style.cssText
                  .replace(/oklch\([^)]+\)/g, "rgba(0,0,0,0.1)")
                  .replace(/oklab\([^)]+\)/g, "rgba(0,0,0,0.1)");
              }
            }
          },
        });

        container.style.cssText = originalStyle;

        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? "l" : "p",
          unit: "pt",
          format: "a4",
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const pageMargin = 24;
        const usableWidth = pdfWidth - pageMargin * 2;
        const usableHeight = pdfHeight - pageMargin * 2;

        const widthScale = usableWidth / canvas.width;
        const imgWidth = usableWidth;
        const imgHeight = canvas.height * widthScale;
        const imgData = canvas.toDataURL("image/jpeg", 1.0);

        const domToCanvasScale = canvas.width / containerScrollWidth;
        const domToPdfScale = domToCanvasScale * widthScale;
        const sectionRectsPdf = sectionRectsDom.map(({ top, bottom }) => ({
          top: top * domToPdfScale,
          bottom: bottom * domToPdfScale,
        }));

        const pageStarts: number[] = [0];
        let currentStart = 0;
        const minGap = 12;

        while (currentStart + usableHeight < imgHeight) {
          const nominalBreak = currentStart + usableHeight;
          const overflowingSection = sectionRectsPdf.find(
            ({ top, bottom }) =>
              top < nominalBreak &&
              bottom > nominalBreak &&
              bottom - top <= usableHeight,
          );

          let smartBreak = nominalBreak;
          if (overflowingSection) {
            smartBreak = overflowingSection.top;
          }

          if (smartBreak <= currentStart + minGap) {
            smartBreak = nominalBreak;
          }

          pageStarts.push(smartBreak);
          currentStart = smartBreak;
        }

        pdf.addImage(
          imgData,
          "JPEG",
          pageMargin,
          pageMargin,
          imgWidth,
          imgHeight,
        );

        if (pageStarts.length > 1) {
          pdf.setFillColor(255, 255, 255);
          pdf.rect(
            0,
            pageMargin + pageStarts[1],
            pdfWidth,
            pdfHeight - (pageMargin + pageStarts[1]),
            "F",
          );
        }

        for (let i = 1; i < pageStarts.length; i++) {
          pdf.addPage();
          pdf.addImage(
            imgData,
            "JPEG",
            pageMargin,
            pageMargin - pageStarts[i],
            imgWidth,
            imgHeight,
          );
          const nextBreakIndex = i + 1;
          if (nextBreakIndex < pageStarts.length) {
            const visibleHeight = pageStarts[nextBreakIndex] - pageStarts[i];
            pdf.setFillColor(255, 255, 255);
            pdf.rect(
              0,
              pageMargin + visibleHeight,
              pdfWidth,
              pdfHeight - (pageMargin + visibleHeight),
              "F",
            );
          }
        }

        pdf.save(`${sportName.replace(/\s+/g, "_")}_Teams.pdf`);
        toast.success("Teams exported successfully!");
      } catch (error) {
        console.error("Error generating PDF:", error);
        toast.error("Failed to generate PDF");
      } finally {
        setIsDownloading(false);
        setExportData(null);
      }
    }, 100);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsRes, eventsRes, drawsRes] = await Promise.all([
          api.get("/teams"),
          api.get("/events"),
          api.get("/draws"),
        ]);
        setTeams(teamsRes.data);
        setEvents(eventsRes.data);
        setDraws(drawsRes.data);
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
                {(() => {
                  const matchingEventForDraw = events.find(
                    (e) =>
                      e.slug === sport.toLowerCase() ||
                      e.title.toLowerCase().includes(sport.toLowerCase()),
                  );

                  // Check if a draw exists for this sport or event
                  const hasExistingDraw = draws.some(
                    (d) =>
                      d.sport === sport ||
                      (matchingEventForDraw &&
                        d.eventId === matchingEventForDraw._id),
                  );

                  if (hasExistingDraw) {
                    return (
                      <button
                        disabled
                        className="px-3 py-1 bg-zinc-300 dark:bg-zinc-700 text-zinc-500 text-[10px] font-bold uppercase tracking-wider rounded-md cursor-not-allowed shadow-none"
                      >
                        Draw Exists
                      </button>
                    );
                  }

                  return (
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
                  );
                })()}

                <button
                  onClick={() => handleDownloadTeamsPDF(sport, sportTeams)}
                  disabled={isDownloading}
                  className="px-3 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-bold uppercase tracking-wider rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all transform active:scale-95 shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-3 h-3"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z"
                      clipRule="evenodd"
                    />
                    <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
                  </svg>
                  {isDownloading && exportData?.sport === sport
                    ? "Exporting..."
                    : "Export PDF"}
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
                <button
                  onClick={() => handleDownloadTeamsPDF(sport, sportTeams)}
                  disabled={isDownloading}
                  className="px-3 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all transform active:scale-95 flex items-center gap-2 disabled:opacity-50"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-3 h-3"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z"
                      clipRule="evenodd"
                    />
                    <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
                  </svg>
                  {isDownloading && exportData?.sport === sport
                    ? "Exporting..."
                    : "Export PDF"}
                </button>
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

      {/* Hidden Export Template */}
      <div className="fixed top-0 left-0 -translate-x-full -z-50 pointer-events-none opacity-0">
        <div ref={exportContainerRef}>
          {exportData && (
            <TeamsPdfTemplate
              sport={exportData.sport}
              teams={exportData.teams}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AllTeams;
