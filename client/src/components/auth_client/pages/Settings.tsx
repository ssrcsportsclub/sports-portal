import { useState, useEffect } from "react";
import api from "../../../services/api";
import toast from "react-hot-toast";
import { HeaderSkeleton, ListSkeleton } from "../../ui/Skeleton";

const Settings = () => {
  const [notifications, setNotifications] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await api.get("/notifications/announcements/status");
      setNotifications(response.data.isSubscribed);
    } catch (err) {
      console.error("Failed to fetch notification status", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubscription = async () => {
    try {
      const response = await api.post("/notifications/announcements/toggle");
      setNotifications(response.data.isSubscribed);
      toast.success(
        response.data.isSubscribed
          ? "Announcements will be sent to your email!"
          : "Announcement emails disabled.",
      );
    } catch {
      toast.error("Failed to update notification settings");
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <HeaderSkeleton action={false} />
        <ListSkeleton rows={2} label="Loading settings" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
        Settings
      </h1>

      <div className="space-y-6">
        {/* Notifications Section */}
        <div className="p-4 sm:p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Notifications
          </h2>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  Announcement Emails
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Receive email notifications for new club announcements
                </p>
              </div>
              <button
                onClick={handleToggleSubscription}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  notifications
                    ? "bg-indigo-600"
                    : "bg-zinc-200 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="p-4 sm:p-6 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 shadow-sm opacity-60">
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-400 mb-4">
            Danger Zone
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium text-red-900 dark:text-red-400">
                Delete Account
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                Permanently delete your account and all data
              </p>
            </div>
            <button
              disabled
              className="w-full sm:w-auto px-4 py-2 bg-zinc-400 cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors"
            >
              Account Deletion Disabled
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
