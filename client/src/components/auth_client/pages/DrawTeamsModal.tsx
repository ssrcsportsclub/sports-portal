import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-hot-toast";
import Modal from "../../ui/Modal";
import { errorMessage, useCreateDrawMutation } from "../../../store/api";
import {
  balancedSizes,
  fixtureCount,
  matchdays,
  roundName,
  type Draw,
  type DrawFormat,
  type Scoring,
} from "../../../lib/tournament";

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
}

interface Event {
  _id: string;
  title: string;
  date: string;
  sport?: string;
}

interface DrawTeamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  events: Event[];
  initialSport?: string;
  initialEventId?: string;
  onCreated?: (draw: Draw) => void;
}

type DrawStep = "selectEvent" | "config" | "drawing" | "result";

const FORMATS: { value: DrawFormat; label: string; sub: string }[] = [
  {
    value: "League",
    label: "Champions League",
    sub: "Everyone plays everyone in one big table, then groups or a knockout",
  },
  {
    value: "Group",
    label: "Group Stage",
    sub: "Teams split into groups, top teams reach the playoffs",
  },
  {
    value: "Knockout",
    label: "Knockout",
    sub: "Straight elimination bracket",
  },
];

const shuffle = <T,>(items: T[]) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/** Splits drawn teams into balanced groups A, B, C… in draw order. */
const buildGroupings = (teams: Team[], perGroup: number) => {
  const count = Math.max(1, Math.round(teams.length / perGroup));
  let offset = 0;
  return balancedSizes(teams.length, count).map((size, i) => {
    const group = teams.slice(offset, offset + size);
    offset += size;
    return { name: String.fromCharCode(65 + i), teams: group };
  });
};

const selectClass =
  "w-full px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#DD1D25]";

const DrawTeamsModal = ({
  isOpen,
  onClose,
  teams,
  events,
  initialSport = "",
  initialEventId = "",
  onCreated,
}: DrawTeamsModalProps) => {
  const [step, setStep] = useState<DrawStep>("selectEvent");
  const [selectedEvent, setSelectedEvent] = useState<string>(initialEventId);
  const [selectedSport, setSelectedSport] = useState<string>(initialSport);
  const [format, setFormat] = useState<DrawFormat>("League");
  const [teamSize, setTeamSize] = useState<number>(1);
  const [perGroup, setPerGroup] = useState<number>(4);
  const [scoring, setScoring] = useState<Scoring>("football");
  const [drawnTeams, setDrawnTeams] = useState<Team[]>([]);
  const [currentDrawIndex, setCurrentDrawIndex] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedDraw, setSavedDraw] = useState<Draw | null>(null);
  const saveStarted = useRef(false);
  const [createDraw] = useCreateDrawMutation();

  const sports = Array.from(
    new Set(teams.filter((t) => t.teamType === "event").map((t) => t.sport)),
  ).sort();
  const eligibleCount = teams.filter(
    (t) => t.sport === selectedSport && t.teamType === "event",
  ).length;

  const reset = useCallback(() => {
    setStep("selectEvent");
    setSelectedEvent("");
    setSelectedSport("");
    setFormat("League");
    setTeamSize(1);
    setPerGroup(4);
    setScoring("football");
    setDrawnTeams([]);
    setCurrentDrawIndex(0);
    setIsAnimating(false);
    setIsSaving(false);
    setSavedDraw(null);
    saveStarted.current = false;
  }, []);

  // Seed from props when opening; reset after the close animation.
  useEffect(() => {
    if (isOpen) {
      setSelectedSport(initialSport);
      if (initialEventId) {
        setSelectedEvent(initialEventId);
        setStep("config");
      }
      return;
    }
    const timer = setTimeout(reset, 300);
    return () => clearTimeout(timer);
  }, [isOpen, initialSport, initialEventId, reset]);

  const saveDraw = useCallback(async () => {
    if (saveStarted.current) return;
    saveStarted.current = true;
    setIsSaving(true);
    try {
      const draw = await createDraw({
        event: selectedEvent,
        format,
        sport: selectedSport,
        teamSize: format === "Group" ? teamSize : undefined,
        scoring: format === "Group" ? scoring : undefined,
        drawnTeams: drawnTeams.map((t) => t._id),
        groupings:
          format === "Group"
            ? buildGroupings(drawnTeams, perGroup).map((g) => ({
                name: g.name,
                teams: g.teams.map((t) => t._id),
              }))
            : undefined,
      }).unwrap();
      setSavedDraw(draw);
      onCreated?.(draw);
      toast.success("Draw saved");
    } catch (error) {
      saveStarted.current = false;
      toast.error(errorMessage(error, "Draw completed but failed to save."));
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedEvent,
    format,
    selectedSport,
    teamSize,
    scoring,
    drawnTeams,
    perGroup,
    onCreated,
    createDraw,
  ]);

  // Reveal one team at a time, then persist the draw once.
  useEffect(() => {
    if (!isAnimating) return;
    if (currentDrawIndex < drawnTeams.length - 1) {
      const timer = setTimeout(() => setCurrentDrawIndex((i) => i + 1), 800);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setIsAnimating(false);
      setStep("result");
      saveDraw();
    }, 800);
    return () => clearTimeout(timer);
  }, [isAnimating, currentDrawIndex, drawnTeams.length, saveDraw]);

  const handleEventSelect = () => {
    if (!selectedEvent) {
      toast.error("Please select an event");
      return;
    }
    setStep("config");
  };

  const handleStartDraw = () => {
    if (!selectedSport) {
      toast.error("Please select a sport");
      return;
    }
    const filteredTeams = teams.filter(
      (t) => t.sport === selectedSport && t.teamType === "event",
    );
    if (filteredTeams.length < 2) {
      toast.error("At least 2 event teams are needed for a draw");
      return;
    }
    if (
      !window.confirm(
        `Start the ${FORMATS.find((f) => f.value === format)?.label} draw for ${selectedSport}? The order is randomised and saved.`,
      )
    )
      return;

    setDrawnTeams(shuffle(filteredTeams));
    setCurrentDrawIndex(0);
    setStep("drawing");
    setIsAnimating(true);
  };

  const skipAnimation = () => setCurrentDrawIndex(drawnTeams.length - 1);

  const renderEventSelection = () => (
    <div className="space-y-6">
      <div>
        <label
          htmlFor="draw-event"
          className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2"
        >
          Select Event
        </label>
        <select
          id="draw-event"
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className={selectClass}
        >
          <option value="">-- Choose Event --</option>
          {events.map((event) => (
            <option key={event._id} value={event._id}>
              {event.title} ({new Date(event.date).toLocaleDateString()})
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleEventSelect}
        className="w-full py-3 bg-[#DD1D25] text-white font-bold rounded-lg hover:bg-[#C41920] transition-colors"
      >
        Continue
      </button>
    </div>
  );

  const groupPreview = (() => {
    if (eligibleCount < 2) return "";
    const count = Math.max(1, Math.round(eligibleCount / perGroup));
    const sizes = [...new Set(balancedSizes(eligibleCount, count))].sort(
      (a, b) => b - a,
    );
    return `${count} group${count > 1 ? "s" : ""} of ${sizes.join(" or ")}`;
  })();

  const renderConfig = () => (
    <div className="space-y-6">
      <div>
        <label
          htmlFor="draw-sport"
          className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2"
        >
          Select Sport
        </label>
        <select
          id="draw-sport"
          value={selectedSport}
          onChange={(e) => setSelectedSport(e.target.value)}
          className={selectClass}
        >
          <option value="">-- Choose Sport --</option>
          {sports.map((sport) => (
            <option key={sport} value={sport}>
              {sport}
            </option>
          ))}
        </select>
        {selectedSport && (
          <p className="text-xs text-zinc-500 mt-1.5">
            {eligibleCount} event team{eligibleCount === 1 ? "" : "s"} will be
            drawn
          </p>
        )}
      </div>

      <div>
        <span className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-3">
          Draw Format
        </span>
        <div className="space-y-2">
          {FORMATS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFormat(f.value)}
              aria-pressed={format === f.value}
              className={`w-full p-3 rounded-xl border-2 text-left transition-all ${format === f.value ? "border-[#DD1D25] bg-[#DD1D25]/5" : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"}`}
            >
              <span className="block text-sm font-black text-zinc-900 dark:text-zinc-50">
                {f.label}
              </span>
              <span className="block text-xs text-zinc-500 mt-0.5">
                {f.sub}
              </span>
            </button>
          ))}
        </div>
        {format === "League" && eligibleCount >= 2 && (
          <p className="text-xs text-zinc-500 mt-2">
            {eligibleCount} teams · {(eligibleCount * (eligibleCount - 1)) / 2}{" "}
            fixtures over{" "}
            {eligibleCount % 2 ? eligibleCount : eligibleCount - 1} matchdays ·
            Win 3, Draw 1, Loss 0. After the league you choose how many teams
            advance and whether they play groups or a knockout.
          </p>
        )}
      </div>

      {format === "Group" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="draw-per-group"
              className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2"
            >
              Teams per Group
            </label>
            <select
              id="draw-per-group"
              value={perGroup}
              onChange={(e) => setPerGroup(Number(e.target.value))}
              className={selectClass}
            >
              {[3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} teams
                </option>
              ))}
            </select>
            {groupPreview && (
              <p className="text-xs text-zinc-500 mt-1.5">{groupPreview}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="draw-scoring"
              className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2"
            >
              Points System
            </label>
            <select
              id="draw-scoring"
              value={scoring}
              onChange={(e) => setScoring(e.target.value as Scoring)}
              className={selectClass}
            >
              <option value="football">Win 3 · Draw 1 · Loss 0</option>
              <option value="winOnly">Win 1 · Loss 0</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="draw-team-size"
              className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2"
            >
              Players Quantity per Team
            </label>
            <select
              id="draw-team-size"
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              className={selectClass}
            >
              {[1, 2, 4, 5, 6, 8].map((n) => (
                <option key={n} value={n}>
                  1 Team = {n} Player{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setStep("selectEvent")}
          className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleStartDraw}
          className="flex-1 py-3 bg-[#DD1D25] text-white font-bold rounded-lg hover:bg-[#C41920] transition-colors"
        >
          Start Draw
        </button>
      </div>
    </div>
  );

  const renderDrawing = () => {
    const team = drawnTeams[currentDrawIndex];
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Drawing Teams...
          </h3>
          <p className="text-zinc-500 text-sm" aria-live="polite">
            Team {currentDrawIndex + 1} of {drawnTeams.length}
          </p>
        </div>

        <div className="h-48 sm:h-64 flex items-center justify-center">
          {team && (
            <div
              key={team._id}
              className="p-6 bg-linear-to-br from-[#DD1D25] to-[#C41920] text-white rounded-xl shadow-2xl w-full max-w-xs animate-in fade-in zoom-in-95 duration-300 text-center"
            >
              <div className="text-2xl sm:text-4xl font-bold mb-2 break-words">
                {team.name}
              </div>
              <div className="text-sm opacity-90">{team.sport}</div>
              <div className="mt-3 text-xs opacity-75">
                {team.members.length} Member
                {team.members.length === 1 ? "" : "s"}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 justify-center">
          {drawnTeams.map((t, idx) => (
            <div
              key={t._id}
              className={`h-2 rounded-full transition-all ${
                idx <= currentDrawIndex
                  ? "w-6 bg-[#DD1D25]"
                  : "w-2 bg-zinc-300 dark:bg-zinc-700"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={skipAnimation}
          className="w-full py-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          Skip animation
        </button>
      </div>
    );
  };

  const renderResult = () => {
    const draw = savedDraw;
    let body: React.ReactNode = (
      <p className="text-center text-sm text-zinc-500 py-8">
        {isSaving ? "Saving draw..." : "The draw could not be saved."}
      </p>
    );

    if (draw?.format === "Knockout") {
      const slots = draw.bracketSlots ?? draw.drawnTeams;
      const ties: [string, string][] = [];
      for (let i = 0; i < slots.length; i += 2) {
        ties.push([slots[i]?.name ?? "Bye", slots[i + 1]?.name ?? "Bye"]);
      }
      body = (
        <ol className="space-y-2">
          {ties.map(([a, b], i) => (
            <li
              key={i}
              className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm"
            >
              <span className="w-7 h-7 shrink-0 rounded-full bg-[#DD1D25] text-white flex items-center justify-center font-bold text-xs">
                {i + 1}
              </span>
              <span className="flex-1 min-w-0 truncate font-bold text-right">
                {a}
              </span>
              <span className="text-zinc-400 text-xs font-bold">vs</span>
              <span
                className={`flex-1 min-w-0 truncate font-bold ${b === "Bye" ? "italic text-emerald-600 dark:text-emerald-400" : ""}`}
              >
                {b}
              </span>
            </li>
          ))}
        </ol>
      );
    } else if (draw) {
      body = (
        <div className="space-y-4">
          {(draw.groupings ?? []).map((group) => (
            <div
              key={group.name}
              className="bg-zinc-50 dark:bg-zinc-800/20 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800"
            >
              <h4 className="text-sm font-bold uppercase mb-3 text-zinc-800 dark:text-zinc-200">
                {draw.format === "League"
                  ? "League Table"
                  : `Group ${group.name}`}
                <span className="ml-2 text-[10px] font-semibold normal-case text-zinc-400">
                  {fixtureCount(group)} fixtures · {matchdays(group).length}{" "}
                  matchdays
                </span>
              </h4>
              <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.teams.map((team, tIdx) => (
                  <li
                    key={team._id}
                    className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/50 rounded-lg flex items-center gap-3"
                  >
                    <span className="w-6 h-6 shrink-0 rounded-full bg-[#DD1D25]/90 text-white flex items-center justify-center font-bold text-[10px]">
                      {tIdx + 1}
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-50 truncate text-sm">
                      {team.name}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            🎉 Draw Complete!
          </h3>
          <p className="text-zinc-500 text-sm">
            {draw?.format === "Knockout"
              ? `${roundName(draw.bracketSlots?.length ?? 2)} draw`
              : (draw?.stage ?? "Draw results")}
          </p>
        </div>

        <div className="max-h-96 overflow-y-auto pr-1 custom-scrollbar">
          {body}
        </div>

        <div className="flex gap-3">
          {!draw && !isSaving ? (
            <button
              onClick={saveDraw}
              className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Retry Save
            </button>
          ) : (
            <button
              onClick={reset}
              disabled={isSaving}
              className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              New Draw
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-[#DD1D25] text-white font-bold rounded-lg hover:bg-[#C41920] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Draw Teams">
      {step === "selectEvent" && renderEventSelection()}
      {step === "config" && renderConfig()}
      {step === "drawing" && renderDrawing()}
      {step === "result" && renderResult()}
    </Modal>
  );
};

export default DrawTeamsModal;
