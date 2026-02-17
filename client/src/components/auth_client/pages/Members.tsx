import { useState, useEffect } from "react";
import api from "../../../services/api";
import { useAppSelector } from "../../../store/hooks";
import Modal from "../../ui/Modal";

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

const Members = () => {
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/users");
      setUsers(data);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError("Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleBan = async (user: User) => {
    if (
      !window.confirm(
        `Are you sure you want to ${user.isBanned ? "unban" : "ban"} ${user.name}?`,
      )
    )
      return;
    try {
      await api.put(`/users/${user._id}`, { isBanned: !user.isBanned });
      fetchUsers();
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
      setIsAddModalOpen(false);
      setNewMember({
        name: "",
        email: "",
        password: "",
        role: "user",
        studentId: "",
        phone: "",
      });
      fetchUsers();
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Failed to create member");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Categorization logic based on user request
  const categories = [
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

  if (loading) {
    return (
      <div className="p-10 text-center text-zinc-500 font-medium">
        Loading members directory...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center text-red-500 font-medium">{error}</div>
    );
  }

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
              {users.length}
            </span>
            <span className="text-sm text-zinc-500 font-medium tracking-wide uppercase">
              Total
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {categories.map((cat) => {
          const catUsers = users.filter((u) => u.role === cat.role);
          if (catUsers.length === 0) return null;

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
                  {catUsers.length}{" "}
                  {catUsers.length === 1 ? "Individual" : "Individuals"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {catUsers.map((user) => (
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
