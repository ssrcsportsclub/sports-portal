import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { logout } from "../../../store/slices/authSlice";
import logo from "../../../assets/logo_main.png";

// Icons

const UsersIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const SettingsIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const MenuIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const LogOutIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

const DumbbellIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m6.5 6.5 11 11" />
    <path d="m21 21-1-1" />
    <path d="m3 3 1 1" />
    <path d="m18 22 4-4" />
    <path d="m2 6 4-4" />
    <path d="m3 10 7-7" />
    <path d="m14 21 7-7" />
  </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const MessageSquareIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  // Dynamic navigation based on exact RBAC requirements
  const getNavItems = () => {
    const userRole = user?.role || "user";

    // USER (Members)
    if (userRole === "user") {
      return [
        {
          label: "Announcements",
          icon: MessageSquareIcon,
          href: "/dashboard/announcements",
        },
        {
          label: "Request Equipments",
          icon: DumbbellIcon,
          href: "/dashboard/equipments",
        },
        { label: "My Team", icon: UsersIcon, href: "/dashboard/team" },
        {
          label: "Registered Events",
          icon: CalendarIcon,
          href: "/dashboard/my-events",
        },
        {
          label: "All Events",
          icon: CalendarIcon,
          href: "/dashboard/all-events",
        },
        {
          label: "Meetings",
          icon: CalendarIcon,
          href: "/dashboard/meetings",
        },
        {
          label: "Feedback",
          icon: MessageSquareIcon,
          href: "/dashboard/feedback",
        },
        { label: "Profile", icon: UserIcon, href: "/dashboard/profile" },
        { label: "Settings", icon: SettingsIcon, href: "/dashboard/settings" },
      ];
    }

    // MODERATOR (General Members)
    if (userRole === "moderator") {
      return [
        {
          label: "Announcements",
          icon: MessageSquareIcon,
          href: "/dashboard/announcements",
        },
        {
          label: "Request Equipment",
          icon: DumbbellIcon,
          href: "/dashboard/equipments",
        },
        { label: "My Team", icon: UsersIcon, href: "/dashboard/team" },
        {
          label: "My Upcoming Events",
          icon: CalendarIcon,
          href: "/dashboard/my-events",
        },
        {
          label: "All Events",
          icon: CalendarIcon,
          href: "/dashboard/all-events",
        },
        {
          label: "Meetings",
          icon: CalendarIcon,
          href: "/dashboard/meetings",
        },
        {
          label: "Manage Members",
          icon: UsersIcon,
          href: "/dashboard/members",
        },
        {
          label: "Update Forms",
          icon: SettingsIcon,
          href: "/dashboard/forms",
        },
        {
          label: "Feedback",
          icon: MessageSquareIcon,
          href: "/dashboard/feedback",
        },
        {
          label: "User Feedbacks",
          icon: MessageSquareIcon,
          href: "/dashboard/user-feedback",
        },
        { label: "Profile", icon: UserIcon, href: "/dashboard/profile" },
        { label: "Settings", icon: SettingsIcon, href: "/dashboard/settings" },
      ];
    }

    // SUPERUSER (College Staff)
    if (userRole === "superuser") {
      return [
        {
          label: "Announcements",
          icon: MessageSquareIcon,
          href: "/dashboard/announcements",
        },
        {
          label: "Equipment Inventory",
          icon: DumbbellIcon,
          href: "/dashboard/inventory",
        },
        {
          label: "All Events",
          icon: CalendarIcon,
          href: "/dashboard/all-events",
        },
        {
          label: "Meetings",
          icon: CalendarIcon,
          href: "/dashboard/meetings",
        },
        {
          label: "View Members",
          icon: UsersIcon,
          href: "/dashboard/members",
        },
        {
          label: "Feedback",
          icon: MessageSquareIcon,
          href: "/dashboard/feedback",
        },
        { label: "Profile", icon: UserIcon, href: "/dashboard/profile" },
        { label: "Settings", icon: SettingsIcon, href: "/dashboard/settings" },
      ];
    }

    // ADMIN (Club Executives)
    if (userRole === "admin") {
      return [
        {
          label: "Announcements",
          icon: MessageSquareIcon,
          href: "/dashboard/announcements",
        },
        {
          label: "Request Equipment",
          icon: DumbbellIcon,
          href: "/dashboard/equipments",
        },
        {
          label: "Equipment Inventory",
          icon: DumbbellIcon,
          href: "/dashboard/inventory",
        },
        { label: "My Team", icon: UsersIcon, href: "/dashboard/team" },
        {
          label: "All Teams",
          icon: UsersIcon,
          href: "/dashboard/all-teams",
        },
        {
          label: "My Upcoming Events",
          icon: CalendarIcon,
          href: "/dashboard/my-events",
        },
        {
          label: "Manage Forms",
          icon: SettingsIcon,
          href: "/dashboard/forms",
        },
        {
          label: "All Events",
          icon: CalendarIcon,
          href: "/dashboard/all-events",
        },
        {
          label: "Meetings",
          icon: CalendarIcon,
          href: "/dashboard/meetings",
        },
        {
          label: "View Members",
          icon: UsersIcon,
          href: "/dashboard/members",
        },
        {
          label: "Membership Requests",
          icon: UsersIcon,
          href: "/dashboard/membership-requests",
        },
        {
          label: "Feedback",
          icon: MessageSquareIcon,
          href: "/dashboard/feedback",
        },
        {
          label: "User Feedbacks",
          icon: MessageSquareIcon,
          href: "/dashboard/user-feedback",
        },
        { label: "Profile", icon: UserIcon, href: "/dashboard/profile" },
        { label: "Settings", icon: SettingsIcon, href: "/dashboard/settings" },
      ];
    }

    // Default fallback
    return [{ label: "Profile", icon: UserIcon, href: "/dashboard/profile" }];
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Trigger */}
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-300"
      >
        {isOpen ? (
          <XIcon className="w-5 h-5" />
        ) : (
          <MenuIcon className="w-5 h-5" />
        )}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 transition-transform duration-300 ease-in-out
          md:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          ${className}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header / Logo */}
          <div className="h-14 flex items-center px-6 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 font-semibold text-lg text-zinc-900 dark:text-zinc-50">
              <img
                src={logo}
                alt="Sports Portal"
                className="w-8 h-8 object-contain"
              />
              <span>Sports Club</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
            <div className="px-3 mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Platform
            </div>
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors group ${
                    isActive
                      ? "bg-[#DD1D25] text-white"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-50"
                  }`}
                >
                  <item.icon
                    className={`w-4 h-4 ${
                      isActive
                        ? "text-white"
                        : "text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-50"
                    }`}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Footer / User Profile */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#DD1D25] text-white flex items-center justify-center font-medium shadow-sm">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                  {user?.name || "User"}
                </p>
                <div className="flex flex-col">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {user?.email || ""}
                  </p>
                  <span
                    className={`mt-1 inline-flex w-fit items-center px-1.5 py-0.5 rounded text-[10px] font-medium capitalize border ${
                      user?.role === "admin"
                        ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30"
                        : user?.role === "moderator"
                          ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30"
                          : user?.role === "superuser"
                            ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900/30"
                            : "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                    }`}
                  >
                    {user?.role || "user"}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors border border-zinc-200 dark:border-zinc-800"
            >
              <LogOutIcon className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
