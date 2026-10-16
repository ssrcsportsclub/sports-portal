import React, {
  lazy,
  Suspense,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAppSelector } from "../../../store/hooks";
import {
  useGetEventDrawsQuery,
  useGetEventQuery,
  useUpdateEventMutation,
} from "../../../store/api";
import { EventDetailsSkeleton } from "../../ui/Skeleton";
import MatchScoreModal from "./MatchScoreModal";
import TableStage from "../tournament/TableStage";
import KnockoutBracket from "../tournament/KnockoutBracket";
import AdvancePhaseModal from "../tournament/AdvancePhaseModal";
import { exportElementToPdf, nextPaint } from "../../../lib/pdfExport";
import {
  phaseNumber,
  stageLabel,
  type Draw,
  type Fixture,
} from "../../../lib/tournament";

// Only admins in edit mode need the date picker; load it on demand.
const DatePicker = lazy(() => import("../../ui/DateTimePicker"));

type PdfTemplate = typeof import("./DrawPdfTemplate").DrawPdfTemplate;

const toInputDate = (value?: string) =>
  value ? new Date(value).toISOString().slice(0, 16) : "";

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const eventQuery = useGetEventQuery(id!, { skip: !id });
  const drawsQuery = useGetEventDrawsQuery(id!, { skip: !id });
  const [updateEvent] = useUpdateEventMutation();
  const event = eventQuery.data;
  const draws = useMemo(() => drawsQuery.data ?? [], [drawsQuery.data]);
  const loading = eventQuery.isLoading || drawsQuery.isLoading;
  const formError =
    eventQuery.isError || drawsQuery.isError
      ? "Failed to load event details"
      : null;

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    date: "",
    endDate: "",
    location: "",
  });

  // Match scoring
  const [selectedMatch, setSelectedMatch] = useState<{
    drawId: string;
    fixture: Fixture;
    allowDraw: boolean;
  } | null>(null);

  // Phase advancement (league → groups/knockout, groups → knockout)
  const [advancingDraw, setAdvancingDraw] = useState<Draw | null>(null);

  // PDF export: the template is code-split and only mounted while exporting.
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [PdfTemplateComponent, setPdfTemplateComponent] =
    useState<PdfTemplate | null>(null);
  const isDownloading = PdfTemplateComponent !== null;

  const isAdmin = user?.role === "admin";
  const hasStarted = !!event && new Date() >= new Date(event.date);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateEvent({ id: id!, data: editFormData }).unwrap();
      setIsEditing(false);
      toast.success("Event updated");
    } catch (err) {
      console.error("Error updating event:", err);
      toast.error("Failed to update event");
    }
  };

  const openMatch = useCallback(
    (drawId: string, fixture: Fixture, allowDraw: boolean) => {
      if (!isAdmin) return;
      if (!hasStarted) {
        toast("Scores can be entered once the event has started.", {
          icon: "⏱️",
        });
        return;
      }
      setSelectedMatch({ drawId, fixture, allowDraw });
    },
    [isAdmin, hasStarted],
  );

  // Stable per-draw callbacks so memoised stage components don't re-render.
  const openMatchHandlers = useMemo(
    () =>
      Object.fromEntries(
        draws.map((d) => [
          d._id,
          (fixture: Fixture, allowDraw: boolean) =>
            openMatch(d._id, fixture, allowDraw),
        ]),
      ),
    [draws, openMatch],
  );

  const childOf = useMemo(() => {
    const map = new Map<string, Draw>();
    draws.forEach((d) => d.parentDraw && map.set(d.parentDraw, d));
    return map;
  }, [draws]);

  const handleDownloadPDF = async () => {
    if (isDownloading) return;
    try {
      const { DrawPdfTemplate } = await import("./DrawPdfTemplate");
      setPdfTemplateComponent(() => DrawPdfTemplate);
      await nextPaint();
      if (!pdfContainerRef.current) throw new Error("PDF template not mounted");
      await exportElementToPdf(
        pdfContainerRef.current,
        `${event?.title?.replace(/\s+/g, "_") || "Event"}_Draws.pdf`,
        { snapToRows: true },
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setPdfTemplateComponent(null);
    }
  };

  if (loading) return <EventDetailsSkeleton />;
  if (formError || !event)
    return (
      <div className="p-6 text-center text-red-500">
        {formError || "Event not found"}
      </div>
    );

  const selectedDraw = selectedMatch
    ? draws.find((d) => d._id === selectedMatch.drawId)
    : undefined;

  const datePickerClass =
    "w-full px-2 py-1 bg-black/50 backdrop-blur-sm border border-white/20 text-white rounded text-xs focus:outline-none focus:ring-1 focus:ring-white/50";

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 flex items-center gap-1"
        >
          &larr; Back
        </button>
        {isAdmin && (
          <button
            onClick={() => {
              // Seed the form from the latest cached event each time.
              if (!isEditing && event) {
                setEditFormData({
                  title: event.title,
                  description: event.description,
                  date: toInputDate(event.date),
                  endDate: toInputDate(event.endDate),
                  location: event.location,
                });
              }
              setIsEditing(!isEditing);
            }}
            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-md text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            {isEditing ? "Cancel Edit" : "Edit Event"}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {/* Header: grows with its content so edit controls never overflow */}
        <div className="min-h-48 bg-zinc-100 dark:bg-zinc-800 relative flex items-end">
          <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
          <div className="relative w-full p-4 sm:p-6">
            {!isEditing ? (
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 break-words">
                {event.title}
              </h1>
            ) : (
              <input
                type="text"
                aria-label="Event title"
                value={editFormData.title}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, title: e.target.value })
                }
                className="w-full px-3 py-2 bg-black/50 backdrop-blur-sm border border-white/20 text-white text-xl sm:text-2xl font-bold rounded focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            )}

            <div className="flex flex-wrap items-start gap-x-4 gap-y-2 text-zinc-200 text-sm mt-2">
              <span className="flex items-center gap-1">
                📍{" "}
                {!isEditing ? (
                  event.location
                ) : (
                  <input
                    type="text"
                    aria-label="Location"
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
                  <span className="flex flex-col gap-1">
                    <span className="text-[10px] text-white/70 uppercase">
                      Start Date
                    </span>
                    <Suspense
                      fallback={<span className="text-xs">Loading…</span>}
                    >
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
                        className={datePickerClass}
                        wrapperClassName="w-full"
                      />
                    </Suspense>
                  </span>
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
                  <span className="flex flex-col gap-1">
                    <span className="text-[10px] text-white/70 uppercase">
                      End Date
                    </span>
                    <Suspense
                      fallback={<span className="text-xs">Loading…</span>}
                    >
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
                        className={datePickerClass}
                        wrapperClassName="w-full"
                      />
                    </Suspense>
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                About Event
              </h2>
              {isEditing ? (
                <textarea
                  rows={6}
                  aria-label="Description"
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

        {/* Tournament phases */}
        {!isEditing && draws.length > 0 && (
          <div className="p-4 sm:p-6 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                🏆 Tournament Brackets & Draws
              </h2>
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-70"
              >
                {isDownloading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-4 h-4"
                      aria-hidden="true"
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
              {draws.map((draw) => {
                const next = childOf.get(draw._id);
                const canAdvance =
                  isAdmin && draw.format !== "Knockout" && !next;
                return (
                  <section
                    key={draw._id}
                    id={`draw-${draw._id}`}
                    className="space-y-4 scroll-mt-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-[#DD1D25] uppercase tracking-wider">
                          {draw.sport}
                          {(draw.parentDraw || next) &&
                            ` · Phase ${phaseNumber(draw, draws)}`}
                        </span>
                        <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
                          {stageLabel(draw)}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {next && (
                          <a
                            href={`#draw-${next._id}`}
                            className="text-[11px] font-bold text-zinc-500 hover:text-[#DD1D25] transition-colors"
                          >
                            Advanced to {stageLabel(next)} →
                          </a>
                        )}
                        {canAdvance && (
                          <button
                            onClick={() => setAdvancingDraw(draw)}
                            className="px-3 py-1.5 bg-[#DD1D25] text-white rounded-lg font-bold text-xs hover:bg-[#b0171d] shadow-sm transition-colors"
                          >
                            {draw.format === "League"
                              ? "Draw Next Phase"
                              : "Draw Knockout"}
                          </button>
                        )}
                        <span className="text-[10px] text-zinc-400 font-medium bg-white dark:bg-zinc-900 px-2 py-1 rounded border border-zinc-100 dark:border-zinc-800 uppercase tracking-widest">
                          {new Date(draw.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {draw.format === "Knockout" ? (
                      <KnockoutBracket
                        draw={draw}
                        canManage={isAdmin}
                        onOpenMatch={openMatchHandlers[draw._id]}
                      />
                    ) : (
                      <TableStage
                        draw={draw}
                        canManage={isAdmin}
                        onOpenMatch={openMatchHandlers[draw._id]}
                      />
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selectedMatch && (
        <MatchScoreModal
          isOpen
          onClose={() => setSelectedMatch(null)}
          drawId={selectedMatch.drawId}
          matchId={selectedMatch.fixture.id}
          team1={selectedMatch.fixture.home}
          team2={selectedMatch.fixture.away}
          currentScore={
            selectedDraw?.matchScores?.[selectedMatch.fixture.id] || ""
          }
          allowDraw={selectedMatch.allowDraw}
        />
      )}

      {advancingDraw && (
        <AdvancePhaseModal
          isOpen
          draw={advancingDraw}
          onClose={() => setAdvancingDraw(null)}
          onAdvanced={async (next) => {
            // RTK Query refetches this event's phases; wait, then scroll.
            await drawsQuery.refetch();
            requestAnimationFrame(() =>
              document
                .getElementById(`draw-${next._id}`)
                ?.scrollIntoView({ behavior: "smooth" }),
            );
          }}
        />
      )}

      {/* Off-screen PDF template, mounted only while exporting */}
      {PdfTemplateComponent && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            left: "-10000px",
            top: "-10000px",
            zIndex: -1000,
          }}
        >
          <div ref={pdfContainerRef}>
            <PdfTemplateComponent draws={draws} eventTitle={event.title} />
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetails;
