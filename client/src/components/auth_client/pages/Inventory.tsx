import { useState, useEffect } from "react";
import { equipmentService } from "../../../services/equipment.service";
import type { Equipment, Responsibility } from "../../../types";
import { RequestStatus } from "../../../types";
import { toast } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Modal from "../../ui/Modal";
import LoadingSpinner from "../../ui/LoadingSpinner";

const Inventory = () => {
  const [items, setItems] = useState<Equipment[]>([]);
  const [responsibilities, setResponsibilities] = useState<Responsibility[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Add Equipment State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEquipment, setNewEquipment] = useState<Partial<Equipment>>({
    name: "",
    category: "",
    type: "Primary",
    quantity: 1,
    condition: "Good",
    description: "",
  });

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
      setResponsibilities(respData);
    } catch (error) {
      toast.error("Failed to fetch inventory data");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: RequestStatus) => {
    try {
      await equipmentService.updateResponsibilityStatus(id, status);
      toast.success(`Request ${status} successfully`);
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      toast.error(error.message || "Update failed");
    }
  };

  const handleForceReturn = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to force return this item? It will be added back to stock.",
      )
    )
      return;
    try {
      await equipmentService.forceReturn(id);
      toast.success("Item force returned successfully");
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      toast.error(error.message || "Force return failed");
    }
  };

  const handleExportReport = async () => {
    try {
      const data = await equipmentService.getChainOfCustodyReport();

      // Filter for the selected date
      const dateStr = selectedDate.toDateString();

      const dailyData = data
        .filter((row: any) => {
          const reqDate = new Date(row.requestDate).toDateString();
          const issueDate = row.issueDate
            ? new Date(row.issueDate).toDateString()
            : "";
          const returnDate = row.returnDate
            ? new Date(row.returnDate).toDateString()
            : "";

          return (
            reqDate === dateStr ||
            issueDate === dateStr ||
            returnDate === dateStr
          );
        })
        .sort((a: any, b: any) => {
          const dateA = new Date(
            a.returnDate || a.issueDate || a.requestDate,
          ).getTime();
          const dateB = new Date(
            b.returnDate || b.issueDate || b.requestDate,
          ).getTime();
          return dateA - dateB;
        });

      if (dailyData.length === 0) {
        toast.error(
          `No activity found for ${selectedDate.toLocaleDateString()} to export.`,
        );
        return;
      }

      const doc = new jsPDF() as any;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // --- FRONT PAGE ---
      doc.setFillColor(30, 30, 30); // Dark background for cover
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      // Brand accent line
      doc.setFillColor(221, 29, 37); // #DD1D25
      doc.rect(0, pageHeight / 2 - 40, 10, 80, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(32);
      doc.setFont("helvetica", "bold");
      doc.text("Daily Equipment Report", 30, pageHeight / 2 - 10);

      doc.setFontSize(18);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(200, 200, 200);
      doc.text(
        `Report for ${selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
        30,
        pageHeight / 2 + 10,
      );

      doc.setFontSize(10);
      doc.text("SSRC Sports Club", 30, pageHeight - 35);
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
        30,
        pageHeight - 30,
      );

      // --- DATA PAGE ---
      doc.addPage();
      doc.setTextColor(0, 0, 0);

      const tableData = dailyData.map((row: any) => {
        const user = row.user as any;
        return [
          user?.name || "Unknown",
          user?.studentId || "N/A",
          user?.phone || "N/A",
          user?.email || "N/A",
          row.issueDate
            ? new Date(row.issueDate).toLocaleTimeString()
            : "Pending",
          row.equipment?.name || "Unknown",
          row.approvedBy?.name ||
            (row.status !== "pending" && row.status !== "rejected"
              ? "Staff"
              : "Staff"),
          row.status,
        ];
      });

      autoTable(doc, {
        startY: 25,
        head: [
          [
            "Student Name",
            "Student ID",
            "Phone Number",
            "Email",
            "Taken Time",
            "Equipment",
            "Approved By",
            "Status",
          ],
        ],
        body: tableData,
        theme: "striped",
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: {
          fillColor: [221, 29, 37],
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      });

      doc.save(
        `daily_equipment_report_${selectedDate.toISOString().split("T")[0]}.pdf`,
      );
      toast.success(
        `Daily report for ${selectedDate.toLocaleDateString()} downloaded`,
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate report");
    }
  };

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await equipmentService.create(newEquipment as any);
      toast.success("Equipment added successfully");
      setIsAddModalOpen(false);
      setNewEquipment({
        name: "",
        category: "",
        type: "Primary",
        quantity: 1,
        condition: "Good",
        description: "",
      });
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add equipment");
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  const pendingRequests = responsibilities.filter(
    (r) => r.status === RequestStatus.PENDING,
  );
  const activeLoans = responsibilities
    .filter((r) => {
      const dateStr = selectedDate.toDateString();
      const reqDate = new Date(r.requestDate).toDateString();
      const issueDate = r.issueDate ? new Date(r.issueDate).toDateString() : "";
      const returnDate = r.returnDate
        ? new Date(r.returnDate).toDateString()
        : "";

      const isRelevantDate =
        reqDate === dateStr || issueDate === dateStr || returnDate === dateStr;

      return (
        isRelevantDate &&
        (r.status === RequestStatus.APPROVED ||
          r.status === RequestStatus.OVERDUE ||
          r.status === RequestStatus.TRANSFERRED ||
          r.status === RequestStatus.RETURNED)
      );
    })
    .sort((a, b) => {
      const dateA = new Date(
        a.returnDate || a.issueDate || a.requestDate,
      ).getTime();
      const dateB = new Date(
        b.returnDate || b.issueDate || b.requestDate,
      ).getTime();
      return dateA - dateB;
    });

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <h1 className="text-2xl font-bold dark:text-white">
          Inventory Management
        </h1>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d);
              }}
              className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors text-zinc-600 dark:text-zinc-300"
              title="Previous Day"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 px-2 min-w-[80px] sm:min-w-[100px] text-center">
              {selectedDate.toDateString() === new Date().toDateString()
                ? "Today"
                : selectedDate.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
            </span>
            <button
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                setSelectedDate(d);
              }}
              className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors text-zinc-600 dark:text-zinc-300"
              title="Next Day"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex-1 sm:flex-none bg-[#DD1D25] text-white p-2.5 sm:px-4 sm:py-2 rounded-lg hover:bg-[#C41920] text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 sm:h-4 sm:w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="hidden sm:inline">Add Item</span>
            </button>
            <button
              onClick={handleExportReport}
              className="flex-1 sm:flex-none bg-zinc-800 text-white px-4 py-2 rounded hover:bg-zinc-700 text-sm font-bold transition-colors shadow-sm"
            >
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Equipment Stock */}
      <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 dark:text-zinc-50">
          Equipment Stock
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item._id}
              className="p-4 border rounded-lg dark:border-zinc-700"
            >
              <h3 className="font-medium dark:text-zinc-200">{item.name}</h3>
              <p className="text-sm dark:text-zinc-400">Type: {item.type}</p>
              <p className="text-sm dark:text-zinc-400">Qty: {item.quantity}</p>
              <p className="text-sm dark:text-zinc-400">
                Cond: {item.condition}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Requests */}
      <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 dark:text-zinc-50">
          Pending Requests
        </h2>
        {pendingRequests.length === 0 ? (
          <p className="text-zinc-500">No pending requests.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-2">User</th>
                  <th className="px-4 py-2">Item</th>
                  <th className="px-4 py-2">Qty</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {pendingRequests.map((req) => {
                  const user = req.user as any;
                  const item = req.equipment as any;
                  return (
                    <tr key={req._id}>
                      <td className="px-4 py-2 dark:text-zinc-300">
                        {user?.name}
                      </td>
                      <td className="px-4 py-2 dark:text-zinc-300">
                        {item?.name}
                      </td>
                      <td className="px-4 py-2 dark:text-zinc-300">
                        {req.quantity}
                      </td>
                      <td className="px-4 py-2 flex gap-2">
                        <button
                          onClick={() =>
                            handleUpdateStatus(req._id, RequestStatus.APPROVED)
                          }
                          className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateStatus(req._id, RequestStatus.REJECTED)
                          }
                          className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Responsibilities */}
      <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 dark:text-zinc-50">
          Active Responsibilities
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 min-w-[100px]">Time</th>
                <th className="px-4 py-3 min-w-[120px]">User</th>
                <th className="px-4 py-3 min-w-[140px]">Item</th>
                <th className="px-4 py-3 min-w-[100px]">Status</th>
                <th className="px-4 py-3 min-w-[120px]">Chain</th>
                <th className="px-4 py-3 min-w-[120px]">Approved By</th>
                <th className="px-4 py-3 min-w-[160px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {activeLoans.map((req) => {
                const user = req.user as any;
                const item = req.equipment as any;
                const chainLength = req.transferChain?.length || 0;
                return (
                  <tr key={req._id}>
                    <td className="px-4 py-2 dark:text-zinc-300">
                      <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                        {new Date(
                          req.returnDate || req.issueDate || req.requestDate,
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-2 dark:text-zinc-300">
                      {user?.name}
                    </td>
                    <td className="px-4 py-2 dark:text-zinc-300">
                      {item?.name}
                    </td>
                    <td className="px-4 py-2 dark:text-zinc-300">
                      {req.status}
                    </td>
                    <td className="px-4 py-2 dark:text-zinc-300">
                      {chainLength > 0
                        ? `${chainLength} Transfers`
                        : "Original"}
                    </td>
                    <td className="px-4 py-2 dark:text-zinc-300">
                      {(req.approvedBy as any)?.name ||
                        (req.status !== RequestStatus.PENDING &&
                        req.status !== RequestStatus.REJECTED
                          ? "Admin"
                          : "N/A")}
                    </td>
                    <td className="px-4 py-2 flex gap-2">
                      {req.status === RequestStatus.TRANSFERRED ||
                      req.status === RequestStatus.RETURNED ? (
                        <span className="text-zinc-400 italic text-xs">
                          {req.status === RequestStatus.RETURNED
                            ? "Chain Ended"
                            : "Transferred"}
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                req._id,
                                RequestStatus.RETURNED,
                              )
                            }
                            className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                          >
                            Receive & End Chain
                          </button>
                          <button
                            onClick={() => handleForceReturn(req._id)}
                            className="bg-orange-600 text-white px-3 py-1 rounded text-xs hover:bg-orange-700"
                          >
                            Force Ret
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Equipment"
      >
        <form onSubmit={handleAddEquipment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Name
            </label>
            <input
              type="text"
              required
              value={newEquipment.name}
              onChange={(e) =>
                setNewEquipment({ ...newEquipment, name: e.target.value })
              }
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD1D25]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Category
            </label>
            <input
              type="text"
              required
              value={newEquipment.category}
              onChange={(e) =>
                setNewEquipment({ ...newEquipment, category: e.target.value })
              }
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD1D25]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Type
              </label>
              <select
                value={newEquipment.type}
                onChange={(e) =>
                  setNewEquipment({
                    ...newEquipment,
                    type: e.target.value as any,
                  })
                }
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD1D25]"
              >
                <option value="Primary">Primary</option>
                <option value="Secondary">Secondary</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Condition
              </label>
              <select
                value={newEquipment.condition}
                onChange={(e) =>
                  setNewEquipment({
                    ...newEquipment,
                    condition: e.target.value as any,
                  })
                }
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD1D25]"
              >
                <option value="New">New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Quantity
            </label>
            <input
              type="number"
              required
              min="1"
              value={newEquipment.quantity}
              onChange={(e) =>
                setNewEquipment({
                  ...newEquipment,
                  quantity: parseInt(e.target.value),
                })
              }
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD1D25]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Description
            </label>
            <textarea
              value={newEquipment.description}
              onChange={(e) =>
                setNewEquipment({
                  ...newEquipment,
                  description: e.target.value,
                })
              }
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD1D25]"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-[#DD1D25] hover:bg-[#C41920] rounded-md"
            >
              Add Equipment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Inventory;
