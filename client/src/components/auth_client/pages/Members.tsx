import { useState, useEffect, useRef } from "react";
import api from "../../../services/api";
import type { PaginatedUsersResponse } from "../../../services/user.service";
import { useAppSelector } from "../../../store/hooks";
import Modal from "../../ui/Modal";
import { HeaderSkeleton, TableSkeleton } from "../../ui/Skeleton";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  isBanned: boolean;
  createdAt: string;
  studentId?: string;
  phone?: string;
}

interface CategoryState {
  users: User[];
  total: number;
  totalPages: number;
  loading: boolean;
}

// Debounce hook — same pattern used in MeetingManagement
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const PAGINATED_ROLES = ["moderator", "user"];
const ITEMS_PER_PAGE = 12;

// Defined outside the component so it never changes between renders
const MEMBER_CATEGORIES = [
  {
    label: "Executive",
    role: "admin",
    color:
      "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border-red-100 dark:border-red-900/30",
  },
  {
    label: "Staff",
    role: "superuser",
    color:
      "text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400 border-purple-100 dark:border-purple-900/30",
  },
  {
    label: "General member",
    role: "moderator",
    color:
      "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 border-blue-100 dark:border-blue-900/30",
  },
  {
    label: "Student",
    role: "user",
    color:
      "text-zinc-600 bg-zinc-50 dark:bg-zinc-800/50 dark:text-zinc-400 border-zinc-100 dark:border-zinc-800",
  },
];

const Members = () => {
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [categoryData, setCategoryData] = useState<
    Record<string, CategoryState>
  >({});
  const [globalLoading, setGlobalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & pagination state per category role
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>(
    {},
  );
  const debouncedSearchQueries = useDebounce(searchQueries, 300);
  const [currentPages, setCurrentPages] = useState<Record<string, number>>({});

  // Refs to manage effect sequencing
  const initialLoadDone = useRef(false);
  // Prevents the page-change effect from double-fetching after the search effect resets pages
  const searchChangedPageRef = useRef(false);

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    studentId: "",
    phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCategoryData = async (role: string, q: string, page: number) => {
    setCategoryData((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] ?? { users: [], total: 0, totalPages: 0 }),
        loading: true,
      },
    }));
    try {
      const params = new URLSearchParams({
        role,
        page: String(page),
        limit: String(PAGINATED_ROLES.includes(role) ? ITEMS_PER_PAGE : 100),
      });
      if (q.trim().length >= 2) params.set("q", q.trim());
      const { data } = await api.get<PaginatedUsersResponse>(
        `/users?${params}`,
      );
      setCategoryData((prev) => ({
        ...prev,
        [role]: {
          users: data.users,
          total: data.total,
          totalPages: data.totalPages,
          loading: false,
        },
      }));
    } catch {
      setCategoryData((prev) => ({
        ...prev,
        [role]: {
          ...(prev[role] ?? { users: [], total: 0, totalPages: 0 }),
          loading: false,
        },
      }));
    }
  };

  // Initial load: fetch all categories
  useEffect(() => {
    const init = async () => {
      setGlobalLoading(true);
      try {
        await Promise.all(
          MEMBER_CATEGORIES.map((cat) => fetchCategoryData(cat.role, "", 1)),
        );
      } catch {
        setError("Failed to load members");
      } finally {
        initialLoadDone.current = true;
        setGlobalLoading(false);
      }
    };
    init();
  }, []);

  // Debounced search effect: fires when the user stops typing (after 300 ms)
  useEffect(() => {
    if (!initialLoadDone.current) return;
    // Mark that the coming page-reset is caused by a search change so the page
    // effect skips its own fetch (avoiding a duplicate request).
    searchChangedPageRef.current = true;
    setCurrentPages((prev) => ({
      ...prev,
      ...Object.fromEntries(PAGINATED_ROLES.map((r) => [r, 1])),
    }));
    PAGINATED_ROLES.forEach((role) => {
      fetchCategoryData(role, debouncedSearchQueries[role] ?? "", 1);
    });
  }, [debouncedSearchQueries]);

  // Page navigation effect: fires when the user clicks a page button
  useEffect(() => {
    if (!initialLoadDone.current) return;
    // Skip if this page change was programmatically triggered by the search effect
    if (searchChangedPageRef.current) {
      searchChangedPageRef.current = false;
      return;
    }
    PAGINATED_ROLES.forEach((role) => {
      fetchCategoryData(
        role,
        debouncedSearchQueries[role] ?? "",
        currentPages[role] ?? 1,
      );
    });
  }, [currentPages]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleBan = async (user: User) => {
    if (
      !window.confirm(
        `Are you sure you want to ${user.isBanned ? "unban" : "ban"} ${user.name}?`,
      )
    )
      return;
    try {
      await api.put(`/users/${user._id}`, { isBanned: !user.isBanned });
      // Refresh only the affected category
      fetchCategoryData(
        user.role,
        debouncedSearchQueries[user.role] ?? "",
        currentPages[user.role] ?? 1,
      );
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update ban status");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      await api.post("/users", newMember);
      const addedRole = newMember.role;
      setIsAddModalOpen(false);
      setNewMember({
        name: "",
        email: "",
        password: "",
        role: "user",
        studentId: "",
        phone: "",
      });
      // Reset search & page for the new member's category, then refresh it
      setSearchQueries((prev) => ({ ...prev, [addedRole]: "" }));
      setCurrentPages((prev) => ({ ...prev, [addedRole]: 1 }));
      fetchCategoryData(addedRole, "", 1);
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Failed to create member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateSearchQuery = (role: string, query: string) => {
    setSearchQueries((prev) => ({ ...prev, [role]: query }));
    // Page reset is handled by the debounced search effect to avoid stale fetches
  };

  const handlePageChange = (role: string, page: number) => {
    setCurrentPages((prev) => ({ ...prev, [role]: page }));
  };

  if (globalLoading) {
    return (
      <div className="p-6 space-y-6">
        <HeaderSkeleton action={false} />
        <TableSkeleton rows={8} label="Loading members" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center text-red-500 font-medium">{error}</div>
    );
  }

  // Grand total: sum of all category totals (reflects filters when search is active)
  const totalCount = Object.values(categoryData).reduce(
    (sum, cat) => sum + cat.total,
    0,
  );

  return (
    <div className="p-6 space-y-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Members Directory
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Manage and view all registered portal members by their roles.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {currentUser?.role === "admin" && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#DD1D25] text-white rounded-lg font-bold hover:bg-[#C41920] transition-transform active:scale-95 shadow-sm"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Member
            </button>
          )}
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <span className="text-sm font-bold text-[#DD1D25]">
              {totalCount}
            </span>
            <span className="text-sm text-zinc-500 font-medium tracking-wide uppercase">
              Total
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {MEMBER_CATEGORIES.map((cat) => {
          const catData = categoryData[cat.role];
          const isPaginated = PAGINATED_ROLES.includes(cat.role);
          const searchQuery = searchQueries[cat.role] ?? "";
          const currentPage = currentPages[cat.role] ?? 1;
          const hasActiveSearch = searchQuery.trim().length > 0;

          // Hide categories that have no members (unless a search is active or data is loading)
          if (
            !catData ||
            (catData.total === 0 && !hasActiveSearch && !catData.loading)
          )
            return null;

          const displayUsers = catData.users; // already filtered + paginated by server
          const totalPages = catData.totalPages;

          return (
            <div key={cat.label} className="space-y-6">
              <div className="flex items-center gap-4">
                <h2
                  className={`text-sm font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-md border ${cat.color}`}
                >
                  {cat.label}
                </h2>
                <div className="h-px flex-1 bg-linear-to-r from-zinc-200 to-transparent dark:from-zinc-800" />
                <span className="text-xs font-semibold text-zinc-400">
                  {catData.total}{" "}
                  {catData.total === 1 ? "Individual" : "Individuals"}
                </span>
              </div>

              {isPaginated && (
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder={`Search ${cat.label}s by name or email…`}
                    value={searchQuery}
                    onChange={(e) =>
                      updateSearchQuery(cat.role, e.target.value)
                    }
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-[#DD1D25] focus:border-transparent outline-none transition-all shadow-sm"
                  />
                </div>
              )}

              {isPaginated && catData.loading ? (
                <div className="py-8 text-center text-zinc-400 text-sm font-medium">
                  Loading…
                </div>
              ) : isPaginated && displayUsers.length === 0 ? (
                <div className="py-10 text-center text-zinc-400 text-sm font-medium">
                  No {cat.label.toLowerCase()}s found
                  {hasActiveSearch && (
                    <> matching &ldquo;{searchQuery}&rdquo;</>
                  )}
                  .
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {displayUsers.map((user) => (
                    <div
                      key={user._id}
                      className="p-4 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-lg font-bold text-zinc-400 group-hover:bg-[#DD1D25]/10 group-hover:text-[#DD1D25] transition-colors border border-zinc-200 dark:border-zinc-800">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-zinc-900 dark:text-zinc-50 truncate leading-tight">
                              {user.name}
                            </h3>
                            {user.isBanned && (
                              <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-red-200 dark:border-red-900/50">
                                Banned
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-zinc-50 dark:border-zinc-900/50 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-tight">
                            Joined
                          </span>
                          <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-bold">
                            {new Date(user.createdAt).toLocaleDateString(
                              undefined,
                              { month: "short", year: "numeric" },
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {currentUser?.role === "admin" &&
                            user.role !== "admin" &&
                            user.role !== "superuser" && (
                              <button
                                onClick={() => handleToggleBan(user)}
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors ${user.isBanned ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"}`}
                              >
                                {user.isBanned ? "Unban" : "Ban"}
                              </button>
                            )}
                          <a
                            href={`mailto:${user.email}`}
                            className="text-[10px] font-bold text-[#DD1D25] uppercase tracking-wider hover:underline"
                          >
                            Message
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isPaginated && totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => handlePageChange(cat.role, currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Prev
                  </button>
                  {(() => {
                    const pages: (number | "…")[] = [];
                    if (totalPages <= 7) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (currentPage > 3) pages.push("…");
                      for (
                        let i = Math.max(2, currentPage - 1);
                        i <= Math.min(totalPages - 1, currentPage + 1);
                        i++
                      )
                        pages.push(i);
                      if (currentPage < totalPages - 2) pages.push("…");
                      pages.push(totalPages);
                    }
                    return pages.map((page, idx) =>
                      page === "…" ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-2 text-xs text-zinc-400 select-none"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => handlePageChange(cat.role, page)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                            page === currentPage
                              ? "bg-[#DD1D25] text-white border-[#DD1D25] shadow-sm"
                              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          {page}
                        </button>
                      ),
                    );
                  })()}
                  <button
                    onClick={() => handlePageChange(cat.role, currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Member"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg border border-red-100 dark:border-red-900/30">
              {formError}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1">
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder="Enter member's name"
              value={newMember.name}
              onChange={(e) =>
                setNewMember({ ...newMember, name: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-[#DD1D25] focus:border-transparent outline-none transition-all text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="email@example.com"
              value={newMember.email}
              onChange={(e) =>
                setNewMember({ ...newMember, email: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-[#DD1D25] focus:border-transparent outline-none transition-all text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1">
              Temporary Password
            </label>
            <input
              type="password"
              required
              placeholder="Minimum 6 characters"
              value={newMember.password}
              onChange={(e) =>
                setNewMember({ ...newMember, password: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-[#DD1D25] focus:border-transparent outline-none transition-all text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1">
              Student ID{" "}
              {newMember.role !== "superuser" && (
                <span className="text-red-500">*</span>
              )}
            </label>
            <input
              type="text"
              required={newMember.role !== "superuser"}
              placeholder="Enter student ID"
              value={newMember.studentId}
              onChange={(e) =>
                setNewMember({ ...newMember, studentId: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-[#DD1D25] focus:border-transparent outline-none transition-all text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1">
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="Enter phone number"
              value={newMember.phone}
              onChange={(e) =>
                setNewMember({ ...newMember, phone: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-[#DD1D25] focus:border-transparent outline-none transition-all text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1">
              Member Role
            </label>
            <select
              value={newMember.role}
              onChange={(e) =>
                setNewMember({ ...newMember, role: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-[#DD1D25] focus:border-transparent outline-none transition-all text-zinc-900 dark:text-zinc-100"
            >
              <option value="user">Student</option>
              <option value="moderator">General Member</option>
              <option value="superuser">Staff</option>
              <option value="admin">Executive</option>
            </select>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-2 py-2.5 bg-[#DD1D25] text-white font-bold rounded-xl shadow-lg hover:bg-[#C41920] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Adding..." : "Confirm Add"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Members;
