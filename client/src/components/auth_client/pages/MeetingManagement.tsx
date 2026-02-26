import { useState, useEffect, useRef } from "react";
import { useAppSelector } from "../../../store/hooks";
import { meetingService } from "../../../services/meeting.service";
import api from "../../../services/api";
import type { Meeting, MeetingCreate } from "../../../types";
import toast from "react-hot-toast";
import {
  Plus,
  X,
  Video,
  MapPin,
  Clock,
  CalendarDays,
  Users,
  Trash2,
  Link as LinkIcon,
  Mail,
  Loader2,
  Search,
} from "lucide-react";

// Debounce hook
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface UserSearchResult {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function MeetingManagement() {
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [form, setForm] = useState<MeetingCreate>({
    title: "",
    topic: "",
    type: "virtual",
    venue: "",
    roomNo: "",
    meetingLink: "",
    date: "",
    time: "",
    participants: [],
  });

  // Internal user search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // External email input
  const [externalEmail, setExternalEmail] = useState("");
  const [externalEmailError, setExternalEmailError] = useState("");

  useEffect(() => {
    fetchMeetings();
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (debouncedSearch.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const fetchUsers = async () => {
      try {
        setSearching(true);
        const res = await api.get<UserSearchResult[]>(
          `/users/search?q=${encodeURIComponent(debouncedSearch)}`,
        );
        // Filter out already-added participants
        const filtered = res.data.filter(
          (u) => !form.participants.includes(u.email),
        );
        setSearchResults(filtered);
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    fetchUsers();
  }, [debouncedSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const data = await meetingService.getAll();
      setMeetings(data);
    } catch {
      toast.error("Failed to load meetings");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user: UserSearchResult) => {
    if (!form.participants.includes(user.email)) {
      setForm((prev) => ({
        ...prev,
        participants: [...prev.participants, user.email],
      }));
    }
    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleAddExternalEmail = () => {
    const email = externalEmail.trim().toLowerCase();
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setExternalEmailError("Please enter a valid email address");
      return;
    }

    if (form.participants.includes(email)) {
      setExternalEmailError("This email has already been added");
      return;
    }

    setForm((prev) => ({
      ...prev,
      participants: [...prev.participants, email],
    }));
    setExternalEmail("");
    setExternalEmailError("");
  };

  const handleExternalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddExternalEmail();
    }
  };

  const handleRemoveEmail = (email: string) => {
    setForm((prev) => ({
      ...prev,
      participants: prev.participants.filter((e) => e !== email),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.participants.length === 0) {
      toast.error("Please add at least one participant");
      return;
    }

    try {
      setCreating(true);
      await meetingService.create(form);
      toast.success("Meeting created & invitations sent!");
      setShowForm(false);
      setForm({
        title: "",
        topic: "",
        type: "virtual",
        venue: "",
        roomNo: "",
        meetingLink: "",
        date: "",
        time: "",
        participants: [],
      });
      fetchMeetings();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create meeting");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this meeting?")) return;
    try {
      await meetingService.delete(id);
      toast.success("Meeting deleted");
      setMeetings((prev) => prev.filter((m) => m._id !== id));
    } catch {
      toast.error("Failed to delete meeting");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const roleColors: Record<string, string> = {
    admin: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    moderator:
      "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    superuser:
      "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
    user: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Meetings
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {isAdmin
              ? "Schedule and manage meetings"
              : "View your meeting invitations"}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#DD1D25] text-white rounded-lg text-sm font-semibold hover:bg-[#c41920] transition-colors md:px-4 md:py-2"
          >
            {showForm ? (
              <>
                <X className="w-4 h-4" />
                <span className="hidden md:inline">Cancel</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline">New Meeting</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Create Meeting Form */}
      {showForm && isAdmin && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-5"
        >
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Schedule a Meeting
          </h2>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="e.g. Tenure ending meeting"
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD1D25]/50"
            />
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Topic *
            </label>
            <textarea
              required
              value={form.topic}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, topic: e.target.value }))
              }
              placeholder="What will this meeting be about?"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD1D25]/50 resize-none"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Meeting Type *
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({ ...prev, type: "virtual" }))
                }
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  form.type === "virtual"
                    ? "bg-[#DD1D25] text-white border-[#DD1D25]"
                    : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <Video className="w-4 h-4" />
                Virtual
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({ ...prev, type: "physical" }))
                }
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  form.type === "physical"
                    ? "bg-[#DD1D25] text-white border-[#DD1D25]"
                    : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <MapPin className="w-4 h-4" />
                Physical
              </button>
            </div>
          </div>

          {/* Conditional: Virtual Meeting Link */}
          {form.type === "virtual" && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Meeting Link *
              </label>
              <input
                type="url"
                required
                value={form.meetingLink}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    meetingLink: e.target.value,
                  }))
                }
                placeholder="https://meet.google.com/..."
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD1D25]/50"
              />
            </div>
          )}

          {/* Conditional: Venue + Room No */}
          {form.type === "physical" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Venue *
                </label>
                <input
                  type="text"
                  required
                  value={form.venue}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, venue: e.target.value }))
                  }
                  placeholder="e.g. Main Building"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD1D25]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Room No.
                </label>
                <input
                  type="text"
                  value={form.roomNo}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, roomNo: e.target.value }))
                  }
                  placeholder="e.g. 301"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD1D25]/50"
                />
              </div>
            </div>
          )}

          {/* Date + Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD1D25]/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Time *
              </label>
              <input
                type="time"
                required
                value={form.time}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, time: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD1D25]/50"
              />
            </div>
          </div>

          {/* ======================== */}
          {/* PARTICIPANTS SECTION     */}
          {/* ======================== */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Participants *
            </label>

            {/* Internal: search by name */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Add from portal users
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowDropdown(true);
                  }}
                  placeholder="Search by name or email..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD1D25]/50"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-zinc-400" />
                )}
              </div>

              {/* Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map((u) => (
                    <button
                      key={u._id}
                      type="button"
                      onClick={() => handleSelectUser(u)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-sm"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#DD1D25] text-white flex items-center justify-center text-xs font-semibold shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {u.name}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {u.email}
                        </p>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${roleColors[u.role] || roleColors.user}`}
                      >
                        {u.role}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {showDropdown &&
                searchResults.length === 0 &&
                debouncedSearch.length >= 2 &&
                !searching && (
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg px-3 py-3 text-sm text-zinc-500">
                    No users found
                  </div>
                )}
            </div>

            {/* External email input */}
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Add external email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={externalEmail}
                  onChange={(e) => {
                    setExternalEmail(e.target.value);
                    setExternalEmailError("");
                  }}
                  onKeyDown={handleExternalKeyDown}
                  placeholder="external@example.com"
                  className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD1D25]/50"
                />
                <button
                  type="button"
                  onClick={handleAddExternalEmail}
                  className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
                >
                  Add
                </button>
              </div>
              {externalEmailError && (
                <p className="text-xs text-red-500 mt-1">
                  {externalEmailError}
                </p>
              )}
            </div>

            {/* Participant chips */}
            {form.participants.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.participants.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                  >
                    <Mail className="w-3 h-3" />
                    {email}
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="ml-0.5 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#DD1D25] text-white rounded-lg text-sm font-semibold hover:bg-[#c41920] transition-colors disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending Invitations...
              </>
            ) : (
              "Create Meeting & Send Invitations"
            )}
          </button>
        </form>
      )}

      {/* Meeting List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-20">
          <CalendarDays className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            No meetings scheduled yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => {
            const isPast = new Date(meeting.date) < new Date();
            return (
              <div
                key={meeting._id}
                className={`p-5 bg-white dark:bg-zinc-900 border rounded-xl transition-colors ${
                  isPast
                    ? "border-zinc-200 dark:border-zinc-800 opacity-60"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                        {meeting.title}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          meeting.type === "virtual"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                            : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                        }`}
                      >
                        {meeting.type === "virtual" ? (
                          <Video className="w-3 h-3" />
                        ) : (
                          <MapPin className="w-3 h-3" />
                        )}
                        {meeting.type}
                      </span>
                      {isPast && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500">
                          Past
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                      {meeting.topic}
                    </p>

                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {formatDate(meeting.date)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {meeting.time}
                      </span>
                      {meeting.type === "virtual" && meeting.meetingLink && (
                        <a
                          href={meeting.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#DD1D25] hover:underline font-medium"
                        >
                          <LinkIcon className="w-3.5 h-3.5" />
                          Join Meeting
                        </a>
                      )}
                      {meeting.type === "physical" && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {meeting.venue}
                          {meeting.roomNo && `, Room ${meeting.roomNo}`}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {meeting.participants.length} participant
                        {meeting.participants.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(meeting._id)}
                      className="p-2 text-zinc-400 hover:text-red-500 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      title="Delete meeting"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
