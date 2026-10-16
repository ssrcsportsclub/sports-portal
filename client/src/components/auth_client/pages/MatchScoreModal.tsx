import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import Modal from "../../ui/Modal";
import { errorMessage, useUpdateMatchMutation } from "../../../store/api";
import {
  formatScore,
  parseScore,
  type Draw,
  type TeamRef,
} from "../../../lib/tournament";

interface MatchScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  drawId: string;
  matchId: string;
  team1: TeamRef | null;
  team2: TeamRef | null;
  currentScore: string;
  /** Optional: the cached draw lists are already updated in place. */
  onUpdate?: (draw: Draw) => void;
  /** League/group fixtures may end level; knockout ties go to penalties. */
  allowDraw?: boolean;
}

const toGoals = (value: string) =>
  Math.max(0, Math.min(99, Math.floor(Number(value) || 0)));

const ScoreInput = ({
  label,
  value,
  onChange,
  small = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  small?: boolean;
}) => (
  <input
    type="number"
    inputMode="numeric"
    min="0"
    max="99"
    aria-label={label}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onFocus={(e) => e.target.select()}
    className={`${small ? "w-14 py-1.5 text-lg" : "w-16 sm:w-20 py-3 text-3xl"} text-center font-black bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-4 focus:ring-[#DD1D25]/20 focus:border-[#DD1D25] outline-none transition-all tabular-nums`}
  />
);

const MatchScoreModal = ({
  isOpen,
  onClose,
  drawId,
  matchId,
  team1,
  team2,
  currentScore,
  onUpdate,
  allowDraw = false,
}: MatchScoreModalProps) => {
  const [score1, setScore1] = useState("0");
  const [score2, setScore2] = useState("0");
  const [pens1, setPens1] = useState("0");
  const [pens2, setPens2] = useState("0");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [updateMatch] = useUpdateMatchMutation();

  useEffect(() => {
    const parsed = parseScore(currentScore);
    setScore1(String(parsed?.home ?? 0));
    setScore2(String(parsed?.away ?? 0));
    setPens1(String(parsed?.pens?.[0] ?? 0));
    setPens2(String(parsed?.pens?.[1] ?? 0));
  }, [currentScore, isOpen]);

  if (!team1 || !team2) return null;

  const s1 = toGoals(score1);
  const s2 = toGoals(score2);
  const p1 = toGoals(pens1);
  const p2 = toGoals(pens2);
  const isLevel = s1 === s2;
  const needsPens = isLevel && !allowDraw;

  const winner = !isLevel
    ? s1 > s2
      ? team1
      : team2
    : needsPens && p1 !== p2
      ? p1 > p2
        ? team1
        : team2
      : null;

  const scoreString = formatScore(s1, s2, needsPens ? [p1, p2] : undefined);

  const handleUpdateScore = async () => {
    setIsUpdating(true);
    try {
      const draw = await updateMatch({
        drawId,
        matchId,
        score: scoreString,
      }).unwrap();
      onUpdate?.(draw);
      toast.success("Live score updated");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to update score"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFinalizeMatch = async () => {
    if (needsPens && p1 === p2) {
      toast.error("Knockout ties need a winner — enter the penalty shoot-out.");
      return;
    }

    const verdict = winner ? `Winner: ${winner.name}` : "Result: DRAW";
    if (
      !window.confirm(
        `${team1.name} ${scoreString} ${team2.name}\n\n${verdict}\n\nFinalize this match?`,
      )
    )
      return;

    setIsFinalizing(true);
    try {
      // Score and result are saved together in a single request.
      const draw = await updateMatch({
        drawId,
        matchId,
        score: scoreString,
        result: winner ? winner._id : "DRAW",
      }).unwrap();
      onUpdate?.(draw);
      toast.success("Match finalized");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to finalize match"));
    } finally {
      setIsFinalizing(false);
    }
  };

  const busy = isUpdating || isFinalizing;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Match">
      <div className="space-y-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
          {[
            { team: team1, value: score1, set: setScore1 },
            null,
            { team: team2, value: score2, set: setScore2 },
          ].map((side, i) =>
            side ? (
              <div key={i} className="flex flex-col items-center gap-3 min-w-0">
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl sm:text-2xl font-black border-2 border-zinc-200 dark:border-zinc-700 text-zinc-400">
                  {side.team.name.charAt(0)}
                </div>
                <p className="font-bold text-sm sm:text-base text-center leading-tight text-zinc-900 dark:text-zinc-50 break-words w-full">
                  {side.team.name}
                </p>
                <ScoreInput
                  label={`${side.team.name} goals`}
                  value={side.value}
                  onChange={side.set}
                />
              </div>
            ) : (
              <span
                key={i}
                className="self-center pt-6 text-lg font-black text-zinc-300 dark:text-zinc-700"
              >
                VS
              </span>
            ),
          )}
        </div>

        {needsPens && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 text-center mb-3">
              Level after full time — penalty shoot-out
            </p>
            <div className="flex items-center justify-center gap-4">
              <ScoreInput
                small
                label={`${team1.name} penalties`}
                value={pens1}
                onChange={setPens1}
              />
              <span className="text-xs font-bold text-amber-700/70">pens</span>
              <ScoreInput
                small
                label={`${team2.name} penalties`}
                value={pens2}
                onChange={setPens2}
              />
            </div>
          </div>
        )}

        <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={handleUpdateScore}
            disabled={busy}
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
            disabled={busy}
            className="w-full py-3.5 bg-[#DD1D25] text-white font-bold rounded-xl hover:bg-[#C41920] shadow-lg shadow-[#DD1D25]/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isFinalizing ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : allowDraw && isLevel ? (
              "Finalize as Draw"
            ) : (
              "Finalize Match & Declare Winner"
            )}
          </button>

          <p className="text-center text-xs text-zinc-500">
            {allowDraw
              ? "Finalizing records the result in the table."
              : "Finalizing advances the winner to the next round."}
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default MatchScoreModal;
