import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { fetchProfile } from "../../../store/slices/authSlice";
import { userService } from "../../../services/user.service";
import { toast } from "react-hot-toast";
import { ProfileSkeleton } from "../../ui/Skeleton";

const Profile = () => {
  const dispatch = useAppDispatch();
  const { user, loading } = useAppSelector((state: any) => state.auth);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    studentId: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        studentId: user.studentId || "",
      });
    }
  }, [user]);

  const initials = user?.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Recently";

  // Cooldown Logic
  const canUpdateProfile = (() => {
    if (!user?.lastProfileUpdate) return true;
    const lastUpdate = new Date(user.lastProfileUpdate).getTime();
    const now = new Date().getTime();
    return now - lastUpdate > 7 * 24 * 60 * 60 * 1000;
  })();

  const profileNextAvailable = (() => {
    if (!user?.lastProfileUpdate) return null;
    return new Date(
      new Date(user.lastProfileUpdate).getTime() + 7 * 24 * 60 * 60 * 1000,
    );
  })();

  const canUpdatePassword = (() => {
    if (!user?.lastPasswordUpdate) return true;
    const lastUpdate = new Date(user.lastPasswordUpdate).getTime();
    const now = new Date().getTime();
    return now - lastUpdate > 7 * 24 * 60 * 60 * 1000;
  })();

  const passwordNextAvailable = (() => {
    if (!user?.lastPasswordUpdate) return null;
    return new Date(
      new Date(user.lastPasswordUpdate).getTime() + 7 * 24 * 60 * 60 * 1000,
    );
  })();

  const handleSave = async () => {
    try {
      await userService.update(user._id, formData);
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      dispatch(fetchProfile());
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordData.currentPassword) {
      toast.error("Current password is required");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      setIsChangingPassword(true);
      await userService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success("Password updated successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      dispatch(fetchProfile());
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading && !user) {
    return (
      <div className="p-6">
        <ProfileSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
        Profile Settings
      </h1>

      <div className="space-y-6">
        {/* Header Card */}
        <div className="p-4 sm:p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col md:flex-row items-center md:items-start gap-6 shadow-sm">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-[#DD1D25] flex items-center justify-center text-3xl font-bold text-white shadow-lg border-4 border-white dark:border-zinc-800">
              {initials || "U"}
            </div>
          </div>
          <div className="text-center md:text-left flex-1 w-full">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {user?.name || "User Name"}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 capitalize">
              {user?.role || "Member"} • Joined {joinedDate}
            </p>
          </div>
          {!isEditing && (
            <div className="flex flex-col items-center md:items-end gap-2 w-full md:w-auto">
              <button
                disabled={!canUpdateProfile}
                onClick={() => setIsEditing(true)}
                className={`w-full md:w-auto px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  canUpdateProfile
                    ? "bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90 shadow-sm"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                }`}
              >
                Edit Profile
              </button>
              {!canUpdateProfile && profileNextAvailable && (
                <span className="text-[10px] text-zinc-500 font-medium">
                  Available: {profileNextAvailable.toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Details Form */}
        <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm transition-all">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-[#DD1D25] rounded-full"></span>
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                readOnly={!isEditing}
                className={`w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 transition-colors focus:ring-2 focus:ring-[#DD1D25] focus:outline-none ${!isEditing ? "cursor-default opacity-80" : "bg-white dark:bg-zinc-800 border-[#DD1D25]/50"}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 opacity-60">
                Email Address (Read Only)
              </label>
              <input
                type="email"
                value={user?.email || ""}
                readOnly
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm text-zinc-500 dark:text-zinc-500 focus:outline-none cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                readOnly={!isEditing}
                placeholder="N/A"
                className={`w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 transition-colors focus:ring-2 focus:ring-[#DD1D25] focus:outline-none ${!isEditing ? "cursor-default opacity-80" : "bg-white dark:bg-zinc-800 border-[#DD1D25]/50"}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Student ID
              </label>
              <input
                type="text"
                value={formData.studentId}
                onChange={(e) =>
                  setFormData({ ...formData, studentId: e.target.value })
                }
                readOnly={!isEditing}
                placeholder="N/A"
                className={`w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 transition-colors focus:ring-2 focus:ring-[#DD1D25] focus:outline-none ${!isEditing ? "cursor-default opacity-80" : "bg-white dark:bg-zinc-800 border-[#DD1D25]/50"}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 opacity-60">
                Current Role
              </label>
              <input
                type="text"
                value={user?.role?.toUpperCase() || ""}
                readOnly
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm text-zinc-500 dark:text-zinc-500 cursor-not-allowed"
              />
            </div>
          </div>

          {isEditing && (
            <div className="mt-8 flex justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-6">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-[#DD1D25] text-white rounded-md text-sm font-bold hover:bg-[#C41920] transition-colors shadow-md"
              >
                Save Changes
              </button>
            </div>
          )}
        </div>

        {/* Security / Password Section */}
        <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-zinc-400 dark:bg-zinc-600 rounded-full"></span>
            Security & Password
          </h3>
          <form onSubmit={handlePasswordSubmit} className="max-w-xl space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      currentPassword: e.target.value,
                    })
                  }
                  required
                  autoComplete="current-password"
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#DD1D25] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value,
                    })
                  }
                  required
                  autoComplete="new-password"
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#DD1D25] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value,
                    })
                  }
                  required
                  autoComplete="new-password"
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#DD1D25] focus:outline-none"
                />
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 pt-4">
              <button
                type="submit"
                disabled={isChangingPassword || !canUpdatePassword}
                className={`px-6 py-2 text-white rounded-md text-sm font-bold transition-all shadow-md disabled:opacity-50 flex items-center gap-2 ${
                  canUpdatePassword
                    ? "bg-[#DD1D25] hover:bg-[#C41920]"
                    : "bg-zinc-400 dark:bg-zinc-700 cursor-not-allowed shadow-none"
                }`}
              >
                {isChangingPassword ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </button>
              {!canUpdatePassword && passwordNextAvailable && (
                <span className="text-[10px] text-zinc-500 font-medium">
                  Available: {passwordNextAvailable.toLocaleDateString()}
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
