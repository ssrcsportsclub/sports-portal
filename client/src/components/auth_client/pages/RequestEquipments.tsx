import { useState, useEffect } from "react";
import { equipmentService } from "../../../services/equipment.service";
import { useAppSelector } from "../../../store/hooks";
import type { Equipment, Responsibility } from "../../../types";
import { RequestStatus } from "../../../types";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../../ui/LoadingSpinner";

const RequestEquipments = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [items, setItems] = useState<Equipment[]>([]);
  const [responsibilities, setResponsibilities] = useState<Responsibility[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState("");
  const [notes, setNotes] = useState("");

  const isWithinRequestWindow = () => {
    const nptTime = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kathmandu",
      hour: "numeric",
      hour12: false,
    });
    const currentHourNPT = parseInt(nptTime.format(new Date()));
    return currentHourNPT >= 9 && currentHourNPT < 17;
  };

  const isWindowOpen = isWithinRequestWindow();

  // Transfer Logic
  const [waitlistMap, setWaitlistMap] = useState<
    Record<string, Responsibility[]>
  >({});
  const [transferTarget, setTransferTarget] = useState<Record<string, string>>(
    {},
  ); // respId -> userId

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [equipData, respData] = await Promise.all([
        equipmentService.getAll(),
        equipmentService.getResponsibilities(),
      ]);
      setItems(equipData);

      // Filter to only show current user's responsibilities
      // Backend may return all responsibilities for admins/moderators, but on this page we only want to see our own
      const myResponsibilities = respData
        .filter((r) => {
          const userId = typeof r.user === "object" ? r.user._id : r.user;
          return userId === user?._id;
        })
        .sort(
          (a, b) =>
            new Date(a.requestDate).getTime() -
            new Date(b.requestDate).getTime(),
        );
      setResponsibilities(myResponsibilities);

      // Fetch waitlists for items that I currently hold (APPROVED), so I know if I can transfer
      const myApproved = myResponsibilities.filter(
        (r) => r.status === RequestStatus.APPROVED,
      );
      const waitlists: Record<string, Responsibility[]> = {};

      for (const resp of myApproved) {
        const equipId =
          typeof resp.equipment === "object"
            ? resp.equipment._id
            : resp.equipment;
        try {
          const list = await equipmentService.getWaitlist(equipId);
          waitlists[resp._id] = list; // Map by Responsibility ID for easy access in row
        } catch (e) {
          console.error("Failed to load waitlist for", equipId);
        }
      }
      setWaitlistMap(waitlists);
    } catch (error) {
      toast.error("Failed to fetch equipment data");
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWindowOpen) {
      toast.error(
        "Requests are only allowed between 9:00 AM and 5:00 PM Nepal Time.",
      );
      return;
    }
    if (!selectedItem) return;

    try {
      await equipmentService.requestEquipment({
        equipmentId: selectedItem,
        quantity: 1,
        notes: user?.name + " requests " + notes, // Simple note append
      });
      toast.success("Request submitted successfully!");
      setSelectedItem("");
      setNotes("");
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Request failed");
    }
  };

  const handleTransfer = async (respId: string) => {
    const targetUserId = transferTarget[respId];
    if (!targetUserId) {
      toast.error("Please select a student to transfer to.");
      return;
    }

    try {
      await equipmentService.transferEquipment(respId, {
        targetUserId,
        quantity: 1,
      });
      toast.success(
        "Transfer successful! The item is now responsibly transferred.",
      );
      setRefreshKey((k) => k + 1);
      // Clear selection
      setTransferTarget((prev) => {
        const next = { ...prev };
        delete next[respId];
        return next;
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Transfer failed");
    }
  };

  // Helper to check if user has active responsibility for an item type
  // TRANSFERRED and RETURNED items should NOT block new requests
  const hasActiveRequest = (itemId: string) => {
    return responsibilities.some((r) => {
      const equipId =
        typeof r.equipment === "object" ? r.equipment._id : r.equipment;
      const isActiveStatus =
        r.status === RequestStatus.PENDING ||
        r.status === RequestStatus.APPROVED ||
        r.status === RequestStatus.WAITING;
      return equipId === itemId && isActiveStatus;
    });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Request Form */}
        <div className="lg:col-span-1">
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm sticky top-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center justify-between">
              Request Equipment
              {!isWindowOpen && (
                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Closed
                </span>
              )}
            </h2>

            {!isWindowOpen && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  Requests are only accepted between **9:00 AM - 5:00 PM** Nepal
                  Time.
                </p>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleRequest}>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Select Item
                </label>
                <select
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD1D25] dark:text-zinc-100 disabled:opacity-50"
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                >
                  <option value="">Choose an item...</option>
                  {items.map((item) => {
                    const isBlocked = hasActiveRequest(item._id);
                    const isOutOfStock = item.quantity <= 0;
                    // Logic: If Blocked, disable. If OutOfStock, allowed but "Join Waitlist".
                    return (
                      <option
                        key={item._id}
                        value={item._id}
                        disabled={isBlocked}
                      >
                        {item.name}
                        {isBlocked ? " (Already Requested)" : ""}
                        {isOutOfStock && !isBlocked
                          ? " (Waitlist Available)"
                          : ""}
                        {/* Show Linked Info? */}
                        {item.type === "Secondary" ? " (Consumable)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Notes / Purpose
                </label>
                <textarea
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD1D25] dark:text-zinc-100"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Training session..."
                />
              </div>

              <button
                type="submit"
                disabled={!selectedItem || !isWindowOpen}
                className="w-full bg-[#DD1D25] text-white rounded-md py-2 text-sm font-bold hover:bg-[#C41920] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {items.find((i) => i._id === selectedItem)?.quantity === 0
                  ? "Join Waitlist"
                  : "Submit Request"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Available Items */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Inventory Status
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map((item) => (
              <div
                key={item._id}
                className="flex items-center justify-between p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
              >
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                    {item.name}{" "}
                    <span className="text-xs text-zinc-400">
                      ({item.category})
                    </span>
                  </h3>
                  {item.type === "Secondary" && (
                    <span className="text-xs text-blue-500">
                      Auto-Approve Linked
                    </span>
                  )}
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Condition: {item.condition}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-1 rounded-md text-xs font-semibold
                    ${
                      item.quantity > 0
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}
                  >
                    {item.quantity > 0
                      ? `${item.quantity} Available`
                      : "Waitlist Open"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New Section: My Responsibilities */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          My Responsibilities & Requests
        </h2>
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-950/50">
                <tr>
                  <th className="px-6 py-3">Item Name</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Transfer Responsibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {responsibilities.map((resp) => {
                  const item =
                    typeof resp.equipment === "object"
                      ? resp.equipment
                      : items.find((i) => i._id === resp.equipment);
                  const itemName = item?.name || "Unknown Item";

                  const waitlist = waitlistMap[resp._id] || [];
                  const hasWaitlist = waitlist.length > 0;

                  return (
                    <tr
                      key={resp._id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-50">
                        {itemName}
                        {item?.type === "Secondary" && (
                          <span className="ml-2 text-xs border border-zinc-200 px-1 rounded">
                            Consumable
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium capitalize
                        ${
                          resp.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : resp.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : resp.status === "waiting"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-zinc-100 text-zinc-800"
                        }
                      `}
                        >
                          {resp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                        {new Date(resp.requestDate).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        {resp.status === RequestStatus.APPROVED &&
                          item?.type === "Primary" && (
                            <div className="flex gap-2 items-center">
                              {hasWaitlist ? (
                                <>
                                  {waitlist.length > 0 && (
                                    <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                                      Next: {(waitlist[0].user as any).name}
                                    </div>
                                  )}
                                  <select
                                    className="text-xs border rounded p-1 max-w-[150px] bg-white dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700"
                                    value={transferTarget[resp._id] || ""}
                                    onChange={(e) =>
                                      setTransferTarget({
                                        ...transferTarget,
                                        [resp._id]: e.target.value,
                                      })
                                    }
                                  >
                                    <option
                                      value=""
                                      className="bg-white dark:bg-zinc-800"
                                    >
                                      Select Student...
                                    </option>
                                    {waitlist.map((w) => {
                                      const u = w.user as any;
                                      return (
                                        <option
                                          key={u._id}
                                          value={u._id}
                                          className="bg-white dark:bg-zinc-800"
                                        >
                                          {u.name}
                                        </option>
                                      );
                                    })}
                                  </select>
                                  <button
                                    onClick={() => handleTransfer(resp._id)}
                                    className="text-xs bg-[#DD1D25] text-white px-2 py-1 rounded hover:bg-[#C41920]"
                                  >
                                    Transfer
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs text-zinc-400 italic">
                                  No one in waitlist
                                </span>
                              )}
                            </div>
                          )}
                        {resp.status === RequestStatus.WAITING && (
                          <span className="text-xs text-zinc-400">
                            In Queue
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestEquipments;
