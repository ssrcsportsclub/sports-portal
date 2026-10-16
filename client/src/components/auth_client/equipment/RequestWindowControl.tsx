import { useState } from "react";
import { toast } from "react-hot-toast";
import {
  errorMessage,
  useGetRequestWindowQuery,
  useUpdateRequestWindowMutation,
  type RequestWindowMode,
} from "../../../store/api";
import { useAppSelector } from "../../../store/hooks";
import { Skeleton } from "../../ui/Skeleton";

/** Roles that manage equipment requests (mirrors the server route). */
const REQUEST_WINDOW_MANAGERS = ["admin", "superuser", "moderator"];

const MODES: { value: RequestWindowMode; label: string; sub: string }[] = [
  { value: "scheduled", label: "Scheduled", sub: "Open during set hours" },
  { value: "open", label: "Always open", sub: "Accept requests any time" },
  { value: "closed", label: "Closed", sub: "Stop all new requests" },
];

const hourLabel = (h: number) =>
  `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 || h === 24 ? "AM" : "PM"}`;

/**
 * Lets staff switch the equipment request window between scheduled hours,
 * always open and closed. Renders nothing for other roles.
 */
const RequestWindowControl = () => {
  const role = useAppSelector((state) => state.auth.user?.role);
  const canManage = !!role && REQUEST_WINDOW_MANAGERS.includes(role);
  const { data: settings, isLoading } = useGetRequestWindowQuery(undefined, {
    skip: !canManage,
  });
  const [updateWindow, { isLoading: saving }] =
    useUpdateRequestWindowMutation();
  const [noteDraft, setNoteDraft] = useState<string | null>(null);

  if (!canManage) return null;

  if (isLoading || !settings) {
    return (
      <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  const save = async (
    changes: Parameters<typeof updateWindow>[0],
    success: string,
  ) => {
    try {
      await updateWindow(changes).unwrap();
      toast.success(success);
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "Failed to update the request window"));
      return false;
    }
  };

  const note = noteDraft ?? settings.note;

  return (
    <section
      aria-labelledby="request-window-heading"
      className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="request-window-heading"
          className="text-base font-bold text-zinc-900 dark:text-zinc-50"
        >
          Equipment Request Window
        </h2>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${settings.isOpen ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}
        >
          {settings.isOpen ? "Accepting requests" : "Not accepting"}
        </span>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-2"
        role="radiogroup"
        aria-label="Request window mode"
      >
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={settings.mode === m.value}
            disabled={saving}
            onClick={() =>
              settings.mode !== m.value &&
              save({ mode: m.value }, `Request window: ${m.label}`)
            }
            className={`p-3 rounded-lg border-2 text-left transition-colors disabled:opacity-60 ${settings.mode === m.value ? "border-[#DD1D25] bg-[#DD1D25]/5" : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"}`}
          >
            <span className="block text-sm font-bold text-zinc-900 dark:text-zinc-50">
              {m.label}
            </span>
            <span className="block text-[11px] text-zinc-500">{m.sub}</span>
          </button>
        ))}
      </div>

      {settings.mode === "scheduled" && (
        <div className="flex flex-wrap items-end gap-3">
          {(["openHour", "closeHour"] as const).map((field) => (
            <label
              key={field}
              className="text-xs font-bold text-zinc-600 dark:text-zinc-300"
            >
              {field === "openHour" ? "Opens" : "Closes"}
              <select
                value={settings[field]}
                disabled={saving}
                onChange={(e) =>
                  save(
                    { [field]: Number(e.target.value) },
                    "Request hours updated",
                  )
                }
                className="mt-1 block rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-normal text-zinc-900 dark:text-zinc-100"
              >
                {Array.from({ length: 24 }, (_, i) =>
                  field === "openHour" ? i : i + 1,
                ).map((h) => (
                  <option
                    key={h}
                    value={h}
                    disabled={
                      field === "openHour"
                        ? h >= settings.closeHour
                        : h <= settings.openHour
                    }
                  >
                    {hourLabel(h)}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <span className="text-[11px] text-zinc-500 pb-2">Nepal Time</span>
        </div>
      )}

      {settings.mode === "closed" && (
        <form
          className="flex flex-col sm:flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save({ note: note.trim() }, "Message saved").then(
              (ok) => ok && setNoteDraft(null),
            );
          }}
        >
          <label className="sr-only" htmlFor="request-window-note">
            Message shown to members
          </label>
          <input
            id="request-window-note"
            value={note}
            maxLength={200}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Message for members, e.g. Closed for inventory check until Monday"
            className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={saving || noteDraft === null}
            className="px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-bold disabled:opacity-50"
          >
            Save message
          </button>
        </form>
      )}

      {settings.updatedBy && settings.updatedAt && (
        <p className="text-[11px] text-zinc-400">
          Last changed by {settings.updatedBy.name} ·{" "}
          {new Date(settings.updatedAt).toLocaleString()}
        </p>
      )}
    </section>
  );
};

export default RequestWindowControl;
