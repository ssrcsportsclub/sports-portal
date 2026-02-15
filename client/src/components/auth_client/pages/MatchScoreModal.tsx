import { useState, useEffect } from "react";
import Modal from "../../ui/Modal";
import api from "../../../services/api";

interface Team {
  _id: string;
  name: string;
}

interface MatchScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  drawId: string;
  matchId: string;
  team1: Team | null;
  team2: Team | null;
  currentScore: string;
  onUpdate: (newDrawData: any) => void;
}

const MatchScoreModal = ({
  isOpen,
  onClose,
  drawId,
  matchId,
  team1,
  team2,
  currentScore,
  onUpdate,
}: MatchScoreModalProps) => {
  const [score1, setScore1] = useState("0");
  const [score2, setScore2] = useState("0");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  useEffect(() => {
    if (currentScore) {
      const parts = currentScore.split(" - ");
      if (parts.length === 2) {
        setScore1(parts[0]);
        setScore2(parts[1]);
      }
    } else {
      setScore1("0");
      setScore2("0");
    }
  }, [currentScore, isOpen]);

  const handleUpdateScore = async () => {
    setIsUpdating(true);
    try {
      const scoreString = `${score1} - ${score2}`;
      // Basic validation
      if (Number(score1) < 0 || Number(score2) < 0) {
        alert("Scores cannot be negative.");
        setIsUpdating(false);
        return;
      }
      const res = await api.patch(`/draws/${drawId}/score`, {
        matchScores: { [matchId]: scoreString },
      });
      onUpdate(res.data);
      alert("Score updated!");
    } catch (err) {
      console.error("Error updating score:", err);
      alert("Failed to update score.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFinalizeMatch = async () => {
    const s1 = Number(score1);
    const s2 = Number(score2);

    if (s1 === s2) {
      alert(
        "Match cannot end in a draw in Knockout stage. Please play extra time or penalties to determine a winner.",
      );
      return;
    }

    const winner = s1 > s2 ? team1 : team2;
    if (!winner) return; // Should not happen if team1/team2 exist

    if (
      !window.confirm(
        `Final Score: ${team1?.name} (${s1}) - (${s2}) ${team2?.name}\n\nWinner: ${winner.name}\n\nAre you sure you want to finalize this match? This action cannot be undone.`,
      )
    )
      return;

    setIsFinalizing(true);
    try {
      // 1. Update winner
      const res = await api.patch(`/draws/${drawId}/results`, {
        matchResults: { [matchId]: winner._id },
      });

      // 2. Also ensure final score is saved
      const scoreString = `${score1} - ${score2}`;
      await api.patch(`/draws/${drawId}/score`, {
        matchScores: { [matchId]: scoreString },
      });

      onUpdate(res.data);
      alert("Match finalized successfully!");
      onClose();
    } catch (err) {
      console.error("Error finalizing match:", err);
      alert("Failed to finalize match.");
    } finally {
      setIsFinalizing(false);
    }
  };

  if (!team1 || !team2) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Match">
      <div className="space-y-8 p-4">
        {/* Teams and Score Inputs */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl font-black border-2 border-zinc-200 dark:border-zinc-700 shadow-sm text-zinc-400">
              {team1.name.charAt(0)}
            </div>
            <p className="font-bold text-base text-center leading-tight">
              {team1.name}
            </p>
            <input
              type="number"
              min="0"
              value={score1}
              onChange={(e) => setScore1(e.target.value)}
              className="w-20 text-center py-3 text-3xl font-black bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-4 focus:ring-[#DD1D25]/20 focus:border-[#DD1D25] outline-none transition-all"
            />
          </div>

          <div className="flex flex-col items-center justify-center gap-2">
            <span className="text-xl font-black text-zinc-300 dark:text-zinc-700">
              VS
            </span>
          </div>

          <div className="flex-1 flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl font-black border-2 border-zinc-200 dark:border-zinc-700 shadow-sm text-zinc-400">
              {team2.name.charAt(0)}
            </div>
            <p className="font-bold text-base text-center leading-tight">
              {team2.name}
            </p>
            <input
              type="number"
              min="0"
              value={score2}
              onChange={(e) => setScore2(e.target.value)}
              className="w-20 text-center py-3 text-3xl font-black bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-4 focus:ring-[#DD1D25]/20 focus:border-[#DD1D25] outline-none transition-all"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={handleUpdateScore}
            disabled={isUpdating || isFinalizing}
            className="w-full py-3.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUpdating ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              "Update Live Score"
            )}
          </button>

          <button
            onClick={handleFinalizeMatch}
            disabled={isFinalizing || isUpdating}
            className="w-full py-3.5 bg-[#DD1D25] text-white font-bold rounded-xl hover:bg-[#C41920] shadow-lg shadow-[#DD1D25]/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isFinalizing ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Finalize Match & Declare Winner"
            )}
          </button>

          <p className="text-center text-xs text-zinc-500 mt-2">
            Finalizing will end the match and advance the winner.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default MatchScoreModal;
