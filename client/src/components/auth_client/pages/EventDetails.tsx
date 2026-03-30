import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { useAppSelector } from "../../../store/hooks";
import MatchScoreModal from "./MatchScoreModal";
import DatePicker from "react-datepicker";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { DrawPdfTemplate } from "./DrawPdfTemplate";
import "react-datepicker/dist/react-datepicker.css";
import "../../../styles/datepicker-custom.css"; // We'll create this for custom dark mode styles
import { toast } from "react-hot-toast";

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
  groupings?: { name: string; teams: Team[] }[]; // Group Stage groupings
  matchResults?: Record<string, string>;
  matchScores?: Record<string, string>;
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

  // PDF Download State & Ref
  const drawContainerRef = React.useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

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

  const [isGeneratingPlayoffs, setIsGeneratingPlayoffs] = useState(false);

  const handleGeneratePlayoffs = async (draw: any) => {
    if (!isAdmin) return;
    if (
      !window.confirm(
        "Are you sure you want to generate playoffs for this group stage? This will create a new knockout draw with the top 2 teams from each group.",
      )
    )
      return;

    setIsGeneratingPlayoffs(true);
    try {
      const topTeams: string[] = [];
      const groupings = draw.groupings || [];

      const groupMatchId = (gName: string, t1: any, t2: any) => {
        const ids = [t1._id, t2._id].sort();
        return `group_${gName}_${ids[0]}_${ids[1]}`;
      };

      groupings.forEach((group: any) => {
        const groupTeams = group.teams;
        const standings = groupTeams
          .map((team: any) => {
            let W = 0,
              Pts = 0,
              SF = 0,
              SA = 0;
            groupTeams.forEach((opp: any) => {
              if (opp._id === team._id) return;
              const mid = groupMatchId(group.name, team, opp);
              const result = draw.matchResults?.[mid];
              const score = draw.matchScores?.[mid];
              if (score && result) {
                const parts = score.split(/\s*-\s*/).map(Number);
                if (
                  parts.length === 2 &&
                  !isNaN(parts[0]) &&
                  !isNaN(parts[1])
                ) {
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
              if (result === team._id) {
                W++;
                Pts++;
              }
            });
            return { team, Pts, W, Diff: SF - SA };
          })
          .sort((a: any, b: any) =>
            b.Pts !== a.Pts ? b.Pts - a.Pts : b.Diff - a.Diff,
          );

        if (standings.length > 0) topTeams.push(standings[0].team._id);
        if (standings.length > 1) topTeams.push(standings[1].team._id);
      });

      if (topTeams.length < 2) {
        toast.error("Not enough teams to form playoffs.");
        return;
      }

      await api.post(`/draws`, {
        event: event!._id,
        format: "Knockout",
        title: "Playoffs",
        sport: draw.sport,
        teamSize: draw.teamSize,
        drawnTeams: topTeams,
      });

      toast.success("Playoffs generated successfully!");
      // Reload event to fetch new draws
      const response = await api.get(`/events/${id}`);
      setEvent(response.data.event);
      setDraws(response.data.draws);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to generate playoffs",
      );
    } finally {
      setIsGeneratingPlayoffs(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!drawContainerRef.current) return;
    setIsDownloading(true);

    try {
      const container = drawContainerRef.current;

      // Temporarily remove max-height/overflow for full capture if needed
      const originalStyle = container.style.cssText;
      container.style.height = "auto";
      container.style.overflow = "visible";

      const containerTop = container.getBoundingClientRect().top;
      const containerScrollWidth = container.scrollWidth;
      // Collect row bottom positions (in DOM/CSS pixels, relative to container top)
      // before html2canvas captures the content, so we can compute smart page breaks.
      const rows = container.querySelectorAll("tr");
      const rowBottomsDom = Array.from(rows).map(
        (row) => row.getBoundingClientRect().bottom - containerTop,
      );
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

      // html2canvas config
      const canvas = await html2canvas(container, {
        scale: 2, // Higher scale for better resolution
        useCORS: true,
        logging: false,
        backgroundColor: document.documentElement.classList.contains("dark")
          ? "#18181b" // zinc-900 for dark mode background
          : "#ffffff",
        windowWidth: containerScrollWidth, // Ensure we capture full width for scrolling brackets
        onclone: (documentClone) => {
          // html2canvas crashes resolving OKLCH and OKLAB colors, which might be added by Tailwind v4.
          // We manually find elements in the clone with OKLCH/OKLAB variables and replace them.
          const elements = documentClone.getElementsByTagName("*");
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            const style = window.getComputedStyle(el);
            // Replace commonly problematic properties if they contain oklch or oklab
            const propsToCheck = [
              "color",
              "backgroundColor",
              "borderColor",
              "boxShadow",
              "backgroundImage",
            ];

            // Note: Since this is on the clone, getComputedStyle might not accurately reflect the original
            // if it relies on complex stylesheets. A safer fallback is modifying the inline style or
            // ensuring Tailwind isn't injecting oklch during the capture process.
            // But we can forcefully override the style object directly if it has an oklch string

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

      container.style.cssText = originalStyle; // Restore styles

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

      // Scale to fit width primarily
      const widthScale = usableWidth / canvas.width;
      const imgWidth = usableWidth;
      const imgHeight = canvas.height * widthScale;

      const imgData = canvas.toDataURL("image/jpeg", 1.0);

      // Convert DOM row bottom positions to PDF point coordinates so we can
      // snap page breaks to row boundaries instead of cutting mid-row.
      // DOM CSS px → canvas px: multiply by (canvas.width / containerScrollWidth)
      // Canvas px → PDF pt:     multiply by widthScale
      const domToCanvasScale = canvas.width / containerScrollWidth;
      const domToPdfScale = domToCanvasScale * widthScale;
      const rowBottomsPdf = rowBottomsDom.map((y) => y * domToPdfScale);
      const sectionRectsPdf = sectionRectsDom.map(({ top, bottom }) => ({
        top: top * domToPdfScale,
        bottom: bottom * domToPdfScale,
      }));

      // Build a list of page-start positions using smart (row-aware) breaks.
      const pageStarts: number[] = [0];
      let currentStart = 0;
      const minGap = 12;
      while (currentStart + usableHeight < imgHeight) {
        const nominalBreak = currentStart + usableHeight;

        // If a section would be split and it fits on a single page, push it to the next page.
        const overflowingSection = sectionRectsPdf.find(
          ({ top, bottom }) =>
            top < nominalBreak &&
            bottom > nominalBreak &&
            bottom - top <= usableHeight,
        );

        let smartBreak = nominalBreak;
        if (overflowingSection) {
          smartBreak = overflowingSection.top;
        } else {
          // Otherwise, try to break on the last full row that fits.
          const rowsBeforeBreak = rowBottomsPdf.filter(
            (y) => y > currentStart + minGap && y <= nominalBreak,
          );
          if (rowsBeforeBreak.length) {
            smartBreak = rowsBeforeBreak[rowsBeforeBreak.length - 1];
          }
        }

        // Safety: ensure forward progress even when no suitable boundary exists
        if (smartBreak <= currentStart + minGap) {
          smartBreak = nominalBreak;
        }

        pageStarts.push(smartBreak);
        currentStart = smartBreak;
      }

      // Add first page
      pdf.addImage(
        imgData,
        "JPEG",
        pageMargin,
        pageMargin,
        imgWidth,
        imgHeight,
      );

      // Mask out the bottom of the first page if there's a break
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

      // Add remaining pages, offsetting the image so the correct slice is visible
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

        // Mask out the bottom of this page if there's another break
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

      pdf.save(`${event?.title?.replace(/\s+/g, "_") || "Event"}_Draws.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                🏆 Tournament Brackets & Draws
              </h2>
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-70"
              >
                {isDownloading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z"
                        clipRule="evenodd"
                      />
                      <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
                    </svg>
                    Download PDF
                  </>
                )}
              </button>
            </div>

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
                              To be determined
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ─── GROUP STAGE ─── */
                    <div className="space-y-8">
                      {(() => {
                        // Prefer groupings from DB; fall back to chunking drawnTeams
                        const storedGroupings: {
                          name: string;
                          teams: any[];
                        }[] =
                          draw.groupings && draw.groupings.length > 0
                            ? draw.groupings
                            : (() => {
                                const chunks: { name: string; teams: any[] }[] =
                                  [];
                                const all = draw.drawnTeams;
                                for (let i = 0; i < all.length; i += 4) {
                                  chunks.push({
                                    name: String.fromCharCode(
                                      65 + chunks.length,
                                    ),
                                    teams: all.slice(i, i + 4),
                                  });
                                }
                                return chunks;
                              })();

                        const groupMatchId = (
                          gName: string,
                          t1: any,
                          t2: any,
                        ) => {
                          const ids = [t1._id, t2._id].sort();
                          return `group_${gName}_${ids[0]}_${ids[1]}`;
                        };

                        const computeStandings = (
                          gName: string,
                          groupTeams: any[],
                        ) =>
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
                                  const parts = score
                                    .split(/\s*-\s*/)
                                    .map(Number);
                                  if (
                                    parts.length === 2 &&
                                    !isNaN(parts[0]) &&
                                    !isNaN(parts[1])
                                  ) {
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
                                  Pts += 1;
                                } else L++;
                              });
                              return { team, P, W, L, Pts, Diff: SF - SA };
                            })
                            .sort((a, b) =>
                              b.Pts !== a.Pts ? b.Pts - a.Pts : b.Diff - a.Diff,
                            );

                        return storedGroupings.map((group) => {
                          const groupTeams: any[] = group.teams;
                          const standings = computeStandings(
                            group.name,
                            groupTeams,
                          );
                          const matches: [any, any][] = [];
                          for (let i = 0; i < groupTeams.length; i++)
                            for (let j = i + 1; j < groupTeams.length; j++)
                              matches.push([groupTeams[i], groupTeams[j]]);

                          return (
                            <div
                              key={group.name}
                              className="bg-zinc-50 dark:bg-zinc-800/10 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden"
                            >
                              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
                                <h3 className="text-lg font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-[#DD1D25]"></span>
                                  Group {group.name}
                                </h3>
                                <span className="text-[10px] font-bold text-zinc-400 uppercase">
                                  {groupTeams.length} Teams · {matches.length}{" "}
                                  Matches
                                </span>
                              </div>
                              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-zinc-100 dark:divide-zinc-800">
                                {/* Standings */}
                                <div className="p-5">
                                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3">
                                    Standings
                                  </h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr>
                                          <th className="pb-2 font-bold text-zinc-500 text-left pr-3 w-full">
                                            Team
                                          </th>
                                          {["P", "W", "L", "Diff", "Pts"].map(
                                            (h) => (
                                              <th
                                                key={h}
                                                className="pb-2 font-bold text-zinc-400 text-center px-1.5"
                                              >
                                                {h}
                                              </th>
                                            ),
                                          )}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                        {standings.map((row, ri) => (
                                          <tr
                                            key={row.team._id}
                                            className={
                                              ri < 2
                                                ? "font-semibold text-zinc-900 dark:text-zinc-50"
                                                : "text-zinc-400"
                                            }
                                          >
                                            <td className="py-2 pr-3 truncate max-w-[110px]">
                                              <span className="flex items-center gap-1.5">
                                                {ri < 2 && (
                                                  <span className="w-1.5 h-1.5 rounded-full bg-[#DD1D25] shrink-0"></span>
                                                )}
                                                {row.team.name}
                                              </span>
                                            </td>
                                            <td className="py-2 text-center px-1.5">
                                              {row.P}
                                            </td>
                                            <td className="py-2 text-center px-1.5 text-emerald-600 dark:text-emerald-400">
                                              {row.W}
                                            </td>
                                            <td className="py-2 text-center px-1.5 text-red-500">
                                              {row.L}
                                            </td>
                                            <td
                                              className={`py-2 text-center px-1.5 font-bold ${
                                                row.Diff > 0
                                                  ? "text-green-600 dark:text-green-400"
                                                  : row.Diff < 0
                                                    ? "text-red-600 dark:text-red-400"
                                                    : "text-zinc-500 dark:text-zinc-400"
                                              }`}
                                            >
                                              {row.Diff > 0
                                                ? `+${row.Diff}`
                                                : row.Diff}
                                            </td>
                                            <td className="py-2 text-center px-1.5 font-black text-zinc-900 dark:text-zinc-50">
                                              {row.Pts}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  <p className="text-[9px] text-zinc-400 mt-3">
                                    🔴 Top 2 advance · Win = 1 pt · Loss = 0 pts
                                  </p>
                                </div>

                                {/* Match Schedule */}
                                <div className="p-5">
                                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3">
                                    Fixtures ({matches.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {matches.map(([t1, t2], mi) => {
                                      const mid = groupMatchId(
                                        group.name,
                                        t1,
                                        t2,
                                      );
                                      const score = draw.matchScores?.[mid];
                                      const result = draw.matchResults?.[mid];
                                      const isPlayed = !!result;
                                      const isDraw = result === "DRAW"; // Keep for potential future use, but not displayed
                                      const isT1Win = result === t1._id;
                                      const isT2Win = result === t2._id;
                                      return (
                                        <div
                                          key={mi}
                                          onClick={() =>
                                            isAdmin &&
                                            handleOpenScoreModal(
                                              draw._id,
                                              mid,
                                              t1,
                                              t2,
                                              score || "",
                                            )
                                          }
                                          className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-xs ${isAdmin ? "cursor-pointer hover:border-[#DD1D25]/40" : ""} ${isPlayed ? "border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900" : "border-dashed border-zinc-200 dark:border-zinc-700 bg-transparent"}`}
                                        >
                                          <span
                                            className={`flex-1 font-bold truncate text-right ${isT1Win ? "text-[#DD1D25]" : isDraw ? "text-zinc-600 dark:text-zinc-300" : "text-zinc-400"}`}
                                          >
                                            {t1.name}
                                          </span>
                                          <div className="shrink-0">
                                            {score ? (
                                              <span className="font-black bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-2 py-0.5 rounded text-[10px] tabular-nums">
                                                {score}
                                              </span>
                                            ) : (
                                              <span className="text-zinc-400 font-bold px-1">
                                                vs
                                              </span>
                                            )}
                                          </div>
                                          <span
                                            className={`flex-1 font-bold truncate ${isT2Win ? "text-[#DD1D25]" : isDraw ? "text-zinc-600 dark:text-zinc-300" : "text-zinc-400"}`}
                                          >
                                            {t2.name}
                                          </span>
                                          {isAdmin && !isPlayed && (
                                            <span className="text-[9px] text-[#DD1D25] shrink-0 font-bold">
                                              Set →
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                      {/* Generate Playoffs Button */}
                      {isAdmin && (
                        <div className="mt-8 flex justify-end">
                          <button
                            onClick={() => handleGeneratePlayoffs(draw)}
                            disabled={isGeneratingPlayoffs}
                            className="px-6 py-2.5 bg-[#DD1D25] text-white rounded-xl font-bold text-sm tracking-wide hover:bg-[#b0171d] shadow hover:shadow-lg hover:-translate-y-0.5 transition-all outline-none focus:ring-2 focus:ring-[#DD1D25]/50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isGeneratingPlayoffs ? (
                              <span className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                                Generating...
                              </span>
                            ) : (
                              <>
                                <span>🏆</span>
                                Generate Playoffs
                              </>
                            )}
                          </button>
                        </div>
                      )}
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
          isGroupFormat={
            draws.find((d) => d._id === selectedMatch.drawId)?.format ===
            "Group"
          }
          onUpdate={(newDraw) => {
            setDraws((prev) =>
              prev.map((d) => (d._id === newDraw._id ? newDraw : d)),
            );
          }}
        />
      )}
      {/* Off-screen PDF Export Template */}
      <div
        style={{
          position: "fixed",
          left: "-10000px",
          top: "-10000px",
          zIndex: -1000,
        }}
      >
        <div ref={drawContainerRef}>
          <DrawPdfTemplate draws={draws} eventTitle={event.title} />
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
