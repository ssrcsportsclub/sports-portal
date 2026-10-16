/**
 * Skeleton placeholders shaped like the content they stand in for, so the
 * layout doesn't jump when data arrives. The pulse is motion-safe only.
 */

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className = "" }: SkeletonProps) => {
  // Defaults apply only when not overridden: equal-specificity utilities
  // resolve by stylesheet order, not by class order, so they can't be mixed.
  const radius = /(^|\s)rounded/.test(className) ? "" : "rounded-md";
  const tone = /(^|\s)bg-/.test(className)
    ? ""
    : "bg-zinc-200/80 dark:bg-zinc-800";
  return (
    <div
      aria-hidden="true"
      className={`motion-safe:animate-pulse ${radius} ${tone} ${className}`}
    />
  );
};

/** Wrapper that announces loading once to assistive tech. */
const Loading = ({
  label = "Loading",
  className = "",
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <div role="status" aria-live="polite" aria-busy="true" className={className}>
    <span className="sr-only">{label}…</span>
    {children}
  </div>
);

const repeat = (count: number) => Array.from({ length: count }, (_, i) => i);

export const SkeletonText = ({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) => (
  <div className={`space-y-2 ${className}`}>
    {repeat(lines).map((i) => (
      <Skeleton
        key={i}
        className={`h-3 ${i === lines - 1 && lines > 1 ? "w-2/3" : "w-full"}`}
      />
    ))}
  </div>
);

/** Page title row: heading plus an optional action button. */
export const HeaderSkeleton = ({ action = true }: { action?: boolean }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="space-y-2">
      <Skeleton className="h-7 w-48 sm:w-64" />
      <Skeleton className="h-3 w-32" />
    </div>
    {action && <Skeleton className="h-9 w-28 rounded-lg" />}
  </div>
);

/** Event cards (All Events / My Events / public events). */
export const EventCardsSkeleton = ({ count = 6 }: { count?: number }) => (
  <Loading
    label="Loading events"
    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
  >
    {repeat(count).map((i) => (
      <div
        key={i}
        className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
      >
        <div className="h-32 bg-zinc-100 dark:bg-zinc-800/60 p-4 flex flex-col justify-end gap-2">
          <Skeleton className="h-5 w-3/4 bg-zinc-300/70 dark:bg-zinc-700" />
          <Skeleton className="h-3 w-1/2 bg-zinc-300/70 dark:bg-zinc-700" />
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <SkeletonText lines={2} />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>
    ))}
  </Loading>
);

/** Generic content cards with an avatar row (teams, members, items). */
export const CardGridSkeleton = ({
  count = 6,
  label = "Loading",
}: {
  count?: number;
  label?: string;
}) => (
  <Loading
    label={label}
    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
  >
    {repeat(count).map((i) => (
      <div
        key={i}
        className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4"
      >
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <SkeletonText lines={2} />
      </div>
    ))}
  </Loading>
);

/** Sport sections each holding a row of team cards (All Teams). */
export const TeamSectionsSkeleton = ({
  sections = 2,
}: {
  sections?: number;
}) => (
  <Loading label="Loading teams" className="space-y-10">
    {repeat(sections).map((s) => (
      <div key={s} className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-24 rounded-lg" />
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="h-6 w-20 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {repeat(4).map((i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3"
            >
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex -space-x-2 pt-1">
                {repeat(4).map((a) => (
                  <Skeleton
                    key={a}
                    className="w-7 h-7 rounded-full ring-2 ring-white dark:ring-zinc-900"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </Loading>
);

/** Stacked rows with avatar, title and meta (feeds, feedback, meetings). */
export const ListSkeleton = ({
  rows = 4,
  label = "Loading",
  tall = false,
}: {
  rows?: number;
  label?: string;
  tall?: boolean;
}) => (
  <Loading label={label} className="space-y-4">
    {repeat(rows).map((i) => (
      <div
        key={i}
        className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 space-y-4"
      >
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40 max-w-[60%]" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <SkeletonText lines={tall ? 4 : 2} />
      </div>
    ))}
  </Loading>
);

/** Data table (members, registrations, inventory, submissions). */
export const TableSkeleton = ({
  rows = 6,
  cols = 5,
  label = "Loading",
}: {
  rows?: number;
  cols?: number;
  label?: string;
}) => (
  <Loading
    label={label}
    className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
  >
    <div className="flex gap-4 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
      {repeat(cols).map((c) => (
        <Skeleton
          key={c}
          className={`h-3 ${c === 0 ? "flex-2" : "flex-1"} ${c > 2 ? "hidden sm:block" : ""}`}
        />
      ))}
    </div>
    {repeat(rows).map((r) => (
      <div
        key={r}
        className="flex items-center gap-4 px-4 py-3.5 border-b last:border-b-0 border-zinc-100 dark:border-zinc-800"
      >
        {repeat(cols).map((c) =>
          c === 0 ? (
            <div key={c} className="flex-2 flex items-center gap-3 min-w-0">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <Skeleton className="h-3.5 w-full max-w-40" />
            </div>
          ) : (
            <Skeleton
              key={c}
              className={`h-3 flex-1 ${c > 2 ? "hidden sm:block" : ""}`}
            />
          ),
        )}
      </div>
    ))}
  </Loading>
);

/** Profile: avatar card plus a form of labelled fields. */
export const ProfileSkeleton = () => (
  <Loading
    label="Loading profile"
    className="grid grid-cols-1 lg:grid-cols-3 gap-6"
  >
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col items-center gap-4">
      <Skeleton className="w-28 h-28 rounded-full" />
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
    <div className="lg:col-span-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
      {repeat(6).map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
    </div>
  </Loading>
);

/** Form: title, intro and labelled inputs (public forms, settings). */
export const FormSkeleton = ({ fields = 5 }: { fields?: number }) => (
  <Loading
    label="Loading form"
    className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 space-y-6"
  >
    <div className="space-y-3">
      <Skeleton className="h-7 w-2/3" />
      <SkeletonText lines={2} />
    </div>
    {repeat(fields).map((i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    ))}
    <Skeleton className="h-11 w-full rounded-lg" />
  </Loading>
);

/** Event page: hero, description, sidebar card and a tournament table. */
export const EventDetailsSkeleton = () => (
  <Loading
    label="Loading event"
    className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6"
  >
    <div className="flex justify-between">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-9 w-24 rounded-md" />
    </div>
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="min-h-48 bg-zinc-100 dark:bg-zinc-800/60 p-6 flex flex-col justify-end gap-3">
        <Skeleton className="h-8 w-2/3 bg-zinc-300/70 dark:bg-zinc-700" />
        <div className="flex gap-4">
          <Skeleton className="h-3 w-24 bg-zinc-300/70 dark:bg-zinc-700" />
          <Skeleton className="h-3 w-32 bg-zinc-300/70 dark:bg-zinc-700" />
        </div>
      </div>
      <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-3">
          <Skeleton className="h-5 w-32" />
          <SkeletonText lines={4} />
        </div>
        <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 p-4 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
      <div className="p-4 sm:p-6 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-14 w-full rounded-lg" />
        <div className="space-y-2">
          {repeat(6).map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  </Loading>
);

/** Fallback while a dashboard page's code loads. */
export const PageSkeleton = () => (
  <div className="space-y-8">
    <HeaderSkeleton />
    <CardGridSkeleton count={6} label="Loading page" />
  </div>
);

/** Whole dashboard (sidebar + page) during the initial session check. */
export const DashboardShellSkeleton = () => (
  <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
    <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col gap-6 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="space-y-3">
        {repeat(10).map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-3 flex-1" />
          </div>
        ))}
      </div>
      <div className="mt-auto flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </aside>
    <main className="flex-1 md:ml-64 p-4 md:p-8 pt-16 md:pt-8">
      <PageSkeleton />
    </main>
  </div>
);

/** Full-page fallback for public routes. */
export const PublicPageSkeleton = () => (
  <Loading
    label="Loading page"
    className="min-h-screen bg-[#171717] p-6 sm:p-10 space-y-8"
  >
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-32 bg-zinc-800" />
      <Skeleton className="h-9 w-24 rounded-full bg-zinc-800" />
    </div>
    <div className="max-w-3xl mx-auto pt-16 space-y-4 text-center">
      <Skeleton className="h-10 w-3/4 mx-auto bg-zinc-800" />
      <Skeleton className="h-4 w-1/2 mx-auto bg-zinc-800" />
    </div>
  </Loading>
);
