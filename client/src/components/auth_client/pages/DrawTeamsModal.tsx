import { useState, useEffect } from "react";
import Modal from "../../ui/Modal";
import api from "../../../services/api";

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
}

type DrawFormat = "Group" | "Knockout";
type DrawStep = "selectEvent" | "config" | "drawing" | "result";

const DrawTeamsModal = ({
  isOpen,
  onClose,
  teams,
  events,
  initialSport = "",
  initialEventId = "",
}: DrawTeamsModalProps) => {
  const [step, setStep] = useState<DrawStep>("selectEvent");
  const [selectedEvent, setSelectedEvent] = useState<string>(initialEventId);
  const [selectedSport, setSelectedSport] = useState<string>(initialSport);
  const [format, setFormat] = useState<DrawFormat>("Group");
  const [teamSize, setTeamSize] = useState<number>(1);
  const [drawnTeams, setDrawnTeams] = useState<Team[]>([]);
  const [currentDrawIndex, setCurrentDrawIndex] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Extract unique sports from only event-type teams
  const sports = Array.from(
    new Set(teams.filter((t) => t.teamType === "event").map((t) => t.sport)),
  ).sort();

  // Reset state when modal closes
  useEffect(() => {
    if (isOpen) {
      setSelectedSport(initialSport);
      if (initialEventId) {
        setSelectedEvent(initialEventId);
        setStep("config");
      }
    } else {
      setTimeout(() => {
        setStep("selectEvent");
        setSelectedEvent("");
        setSelectedSport("");
        setFormat("Group");
        setTeamSize(1);
        setDrawnTeams([]);
        setCurrentDrawIndex(0);
        setIsAnimating(false);
        setIsSaving(false);
      }, 300);
    }
  }, [isOpen, initialSport]);

  const handleEventSelect = () => {
    if (!selectedEvent) {
      alert("Please select an event");
      return;
    }

    setStep("config");
  };

  const handleStartDraw = () => {
    if (!selectedSport) {
      alert("Please select a sport");
      return;
    }

    // Filter teams by sport AND type (only tournament teams can be drawn)
    let filteredTeams = teams.filter(
      (t) => t.sport === selectedSport && t.teamType === "event",
    );

    // If Group format, filter by team size
    if (format === "Group") {
      filteredTeams = filteredTeams.filter(
        (t) => t.members.length === teamSize,
      );
    }

    if (filteredTeams.length === 0) {
      alert("No teams match the selected criteria");
      return;
    }

    const confirmDraw = window.confirm(
      `Are you sure you want to start the ${format} draw for ${selectedSport}? This will randomize the selection.`,
    );
    if (!confirmDraw) return;

    // Shuffle teams
    const shuffled = [...filteredTeams].sort(() => Math.random() - 0.5);
    setDrawnTeams(shuffled);
    setStep("drawing");
    setIsAnimating(true);
    setCurrentDrawIndex(0);
  };

  // Animation effect
  useEffect(() => {
    if (isAnimating && currentDrawIndex < drawnTeams.length) {
      const timer = setTimeout(() => {
        setCurrentDrawIndex((prev) => prev + 1);
      }, 800);
      return () => clearTimeout(timer);
    } else if (isAnimating && currentDrawIndex >= drawnTeams.length) {
      setIsAnimating(false);
      setStep("result");
      saveDraw();
    }
  }, [isAnimating, currentDrawIndex, drawnTeams.length]);

  const saveDraw = async () => {
    try {
      setIsSaving(true);
      await api.post("/draws", {
        event: selectedEvent,
        format,
        sport: selectedSport,
        teamSize: format === "Group" ? teamSize : undefined,
        drawnTeams: drawnTeams.map((t) => t._id),
      });
    } catch (error) {
      console.error("Error saving draw:", error);
      alert("Draw completed but failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderEventSelection = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
          Select Event
        </label>
        <select
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#DD1D25]"
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

  const renderConfig = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
          Select Sport
        </label>
        <select
          value={selectedSport}
          onChange={(e) => setSelectedSport(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#DD1D25]"
        >
          <option value="">-- Choose Sport --</option>
          {sports.map((sport) => (
            <option key={sport} value={sport}>
              {sport}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-3">
          Draw Format
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setFormat("Group")}
            className={`py-3 px-4 rounded-lg font-bold transition-all ${
              format === "Group"
                ? "bg-[#DD1D25] text-white shadow-md"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            Group
          </button>
          <button
            onClick={() => setFormat("Knockout")}
            className={`py-3 px-4 rounded-lg font-bold transition-all ${
              format === "Knockout"
                ? "bg-[#DD1D25] text-white shadow-md"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            Knockout
          </button>
        </div>
      </div>

      {format === "Group" && (
        <div>
          <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
            Players Quantity per Team
          </label>
          <select
            value={teamSize}
            onChange={(e) => setTeamSize(Number(e.target.value))}
            className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#DD1D25]"
          >
            <option value={1}>1 Team = 1 Player</option>
            <option value={2}>1 Team = 2 Players</option>
            <option value={4}>1 Team = 4 Players</option>
            <option value={5}>1 Team = 5 Players</option>
            <option value={6}>1 Team = 6 Players</option>
            <option value={8}>1 Team = 8 Players</option>
          </select>
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

  const renderDrawing = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Drawing Teams...
        </h3>
        <p className="text-zinc-500 text-sm">
          Team {currentDrawIndex + 1} of {drawnTeams.length}
        </p>
      </div>

      <div className="relative h-64 flex items-center justify-center overflow-hidden">
        {drawnTeams.slice(0, currentDrawIndex + 1).map((team, idx) => {
          const isLatest = idx === currentDrawIndex;
          return (
            <div
              key={team._id}
              className={`absolute transition-all duration-500 ${
                isLatest
                  ? "scale-100 opacity-100 z-10"
                  : "scale-75 opacity-0 z-0"
              }`}
            >
              <div className="p-6 bg-linear-to-br from-[#DD1D25] to-[#C41920] text-white rounded-xl shadow-2xl min-w-[300px]">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">{team.name}</div>
                  <div className="text-sm opacity-90">{team.sport}</div>
                  <div className="mt-3 text-xs opacity-75">
                    {team.members.length} Member
                    {team.members.length > 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 justify-center">
        {drawnTeams.map((_, idx) => (
          <div
            key={idx}
            className={`h-2 rounded-full transition-all ${
              idx <= currentDrawIndex
                ? "w-8 bg-[#DD1D25]"
                : "w-2 bg-zinc-300 dark:bg-zinc-700"
            }`}
          />
        ))}
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          🎉 Draw Complete!
        </h3>
        <p className="text-zinc-500 text-sm">
          {format === "Group" ? "Group Draw Results" : "Knockout Draw Results"}
        </p>
        {isSaving && (
          <p className="text-xs text-zinc-400 mt-1">Saving draw...</p>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {drawnTeams.map((team, idx) => (
          <div
            key={team._id}
            className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-[#DD1D25] text-white flex items-center justify-center font-bold">
              {idx + 1}
            </div>
            <div className="flex-1">
              <div className="font-bold text-zinc-900 dark:text-zinc-50">
                {team.name}
              </div>
              <div className="text-sm text-zinc-500">
                {team.members.length} member{team.members.length > 1 ? "s" : ""}{" "}
                • {team.sport}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => {
            setStep("selectEvent");
            setSelectedEvent("");
            setDrawnTeams([]);
            setCurrentDrawIndex(0);
          }}
          className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          New Draw
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-2.5 bg-[#DD1D25] text-white font-bold rounded-lg hover:bg-[#C41920] transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );

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
