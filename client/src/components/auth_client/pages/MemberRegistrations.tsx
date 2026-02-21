import { useState, useEffect } from "react";
import api from "../../../services/api";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import LoadingSpinner from "../../ui/LoadingSpinner";

interface Registration {
  _id: string;
  name: string;
  email: string;
  phone: string;
  collegeId: string;
  appliedRole: string;
  sportsInterests?: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: {
    name: string;
    email: string;
  };
  reviewedAt?: string;
  note?: string;
  createdAt: string;
}

const MemberRegistrations = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");
  const [isBulkReject, setIsBulkReject] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Date Range State
  const [startDate, setStartDate] = useState(
    format(new Date().setDate(1), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const endpoint = `/forms/membership-registrations/all?status=${filter}`;
      const response = await api.get(endpoint);
      setRegistrations(response.data);
      setSelectedIds([]); // Clear selection on filter change
    } catch (err) {
      console.error("Failed to fetch registrations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [filter]);

  const toggleSelectAll = () => {
    const pendingRegs = registrations.filter((r) => r.status === "pending");
    if (selectedIds.length === pendingRegs.length && pendingRegs.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingRegs.map((r) => r._id));
    }
  };

  const toggleSelect = (id: string, status: string) => {
    if (status !== "pending") return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleBulkStatusUpdate = async (newStatus: string, note?: string) => {
    if (selectedIds.length === 0) return;

    if (
      !note &&
      !window.confirm(
        `Are you sure you want to mark ${selectedIds.length} items as ${newStatus}?`,
      )
    )
      return;

    try {
      setUpdating(true);
      await api.patch(`/forms/membership-registrations/bulk/status`, {
        ids: selectedIds,
        status: newStatus,
        note,
      });
      fetchRegistrations();
      setShowRejectModal(false);
      setRejectionNote("");
      setIsBulkReject(false);
    } catch (err) {
      console.error("Bulk update failed:", err);
      alert("Failed to perform bulk update.");
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = async (
    id: string,
    newStatus: string,
    note?: string,
  ) => {
    if (
      !note &&
      !window.confirm(`Are you sure you want to mark this as ${newStatus}?`)
    )
      return;

    try {
      setUpdating(true);
      await api.patch(`/forms/membership-registrations/${id}/status`, {
        status: newStatus,
        note,
      });
      fetchRegistrations();
      setShowRejectModal(false);
      setRejectionNote("");
    } catch (err) {
      console.error("Status update failed:", err);
      alert("Failed to update status.");
    } finally {
      setUpdating(false);
    }
  };

  const getRoleLabel = (role: string) => {
    return role === "moderator" ? "General Member" : "Student";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "rejected":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    }
  };

  const downloadPDF = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Inclusion of the full end day

    const filteredRegs = registrations.filter((reg) => {
      const createdDate = new Date(reg.createdAt);
      return createdDate >= start && createdDate <= end;
    });

    if (filteredRegs.length === 0) {
      alert("No data found for the selected time frame.");
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
    const mainTitle = `Membership ${filter.charAt(0).toUpperCase() + filter.slice(1)} List`;
    doc.text(mainTitle, 30, pageHeight / 2 - 10);

    doc.setFontSize(18);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 200, 200);
    const monthYear = format(start, "MMMM yyyy");
    const subTitle =
      start.getMonth() === end.getMonth() &&
      start.getFullYear() === end.getFullYear()
        ? `Report for ${monthYear}`
        : `Report from ${format(start, "MMM d")} to ${format(end, "MMM d, yyyy")}`;
    doc.text(subTitle, 30, pageHeight / 2 + 10);

    doc.setFontSize(10);
    doc.text("SSRC Sports Club", 30, pageHeight - 35);
    doc.text(`generated on ${format(new Date(), "PPpp")}`, 30, pageHeight - 30);

    // --- DATA PAGE ---
    doc.addPage();
    doc.setTextColor(0, 0, 0);

    const tableColumn = ["Name", "Email", "Role", "Phone", "ID", "Date"];
    if (filter === "rejected") tableColumn.push("Rejection Note");

    const tableRows: any[] = [];
    filteredRegs.forEach((reg) => {
      const regData = [
        reg.name,
        reg.email,
        getRoleLabel(reg.appliedRole),
        reg.phone,
        reg.collegeId,
        format(new Date(reg.createdAt), "MMM d, yyyy"),
      ];
      if (filter === "rejected") regData.push(reg.note || "");
      tableRows.push(regData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: {
        fillColor: [221, 29, 37],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
    });

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`${filter.toUpperCase()} REQUESTS DATA`, 14, 18);

    doc.save(`Membership_${filter}_${format(start, "MMMyy")}.pdf`);
    setShowDateModal(false);
  };

  const canShowBulkActions = filter === "pending";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
            Membership Requests
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Dashboard for managing club enrollment applications.
          </p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {filter !== "pending" && registrations.length > 0 && (
            <button
              onClick={() => setShowDateModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-800 text-white dark:text-zinc-100 rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all border border-zinc-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              PDF List
            </button>
          )}

          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            {["pending", "approved", "rejected"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                  filter === s
                    ? "bg-white dark:bg-zinc-900 text-[#DD1D25] shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : registrations.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800">
          <p className="text-zinc-500">No registration requests found.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                  {canShowBulkActions && (
                    <th className="p-4 w-12 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded text-[#DD1D25] focus:ring-[#DD1D25] bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 disabled:opacity-30"
                        checked={
                          selectedIds.length ===
                            registrations.filter((r) => r.status === "pending")
                              .length &&
                          registrations.filter((r) => r.status === "pending")
                            .length > 0
                        }
                        onChange={toggleSelectAll}
                        disabled={
                          registrations.filter((r) => r.status === "pending")
                            .length === 0
                        }
                      />
                    </th>
                  )}
                  <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Applicant
                  </th>
                  <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Role & Status
                  </th>
                  <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    {filter === "rejected"
                      ? "Interests / Note"
                      : "Interests / Reason"}
                  </th>
                  <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                {registrations.map((reg) => (
                  <tr
                    key={reg._id}
                    className={`hover:bg-zinc-50/40 dark:hover:bg-zinc-800/40 transition-colors ${selectedIds.includes(reg._id) ? "bg-zinc-50/80 dark:bg-zinc-800/80" : ""}`}
                  >
                    {canShowBulkActions && (
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded text-[#DD1D25] focus:ring-[#DD1D25] bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 disabled:opacity-30"
                          checked={selectedIds.includes(reg._id)}
                          onChange={() => toggleSelect(reg._id, reg.status)}
                          disabled={reg.status !== "pending"}
                        />
                      </td>
                    )}
                    <td className="p-4">
                      <div className="font-bold text-zinc-900 dark:text-zinc-50">
                        {reg.name}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-medium">
                        ID: {reg.collegeId}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-medium">
                        {format(new Date(reg.createdAt), "MMM d, yyyy")}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] w-fit font-bold px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded uppercase tracking-wider">
                          {getRoleLabel(reg.appliedRole)}
                        </span>
                        <span
                          className={`text-[10px] w-fit px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${getStatusColor(reg.status)}`}
                        >
                          {reg.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                        {reg.email}
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        {reg.phone}
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 italic line-clamp-2 max-w-xs">
                        "{reg.sportsInterests || "No details provided"}"
                      </p>
                      {filter === "rejected" && reg.note && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg">
                          <span className="text-[10px] text-red-500 font-bold uppercase block mb-0.5">
                            Note
                          </span>
                          <p className="text-[11px] text-red-700 dark:text-red-400 leading-tight">
                            {reg.note}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {reg.status === "pending" ? (
                        <div className="flex justify-end gap-2 text-sm">
                          <button
                            onClick={() =>
                              handleStatusUpdate(reg._id, "approved")
                            }
                            disabled={updating}
                            className="p-1.5 bg-green-600/10 text-green-600 hover:bg-green-600 hover:text-white rounded-lg transition-all"
                            title="Approve"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedIds([reg._id]);
                              setIsBulkReject(false);
                              setShowRejectModal(true);
                            }}
                            disabled={updating}
                            className="p-1.5 bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all"
                            title="Reject"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="text-[10px] text-zinc-400 font-bold">
                          {reg.reviewedBy?.name || "System"}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-8 duration-300 border border-zinc-800">
          <div className="flex items-center gap-2 border-r border-zinc-800 pr-6">
            <span className="w-8 h-8 rounded-full bg-[#DD1D25] flex items-center justify-center font-bold text-sm">
              {selectedIds.length}
            </span>
            <span className="text-sm font-bold text-zinc-400">Selected</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleBulkStatusUpdate("approved")}
              disabled={updating}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-2"
            >
              Approve All
            </button>
            <button
              onClick={() => {
                setIsBulkReject(true);
                setShowRejectModal(true);
              }}
              disabled={updating}
              className="px-4 py-2 bg-[#DD1D25] hover:bg-[#c41a21] text-white font-bold text-sm rounded-xl transition-all flex items-center gap-2"
            >
              Reject All
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-4 py-2 text-zinc-400 hover:text-white font-bold text-sm transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md p-8 shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 mb-2">
              Reject{" "}
              {isBulkReject
                ? `${selectedIds.length} Applications`
                : "Application"}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
              Please provide a reason for the rejection. This note will be sent
              to the applicant(s) via email.
            </p>

            <textarea
              className="w-full h-32 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-zinc-900 dark:text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD1D25]/20 focus:border-[#DD1D25] transition-all resize-none"
              placeholder="Enter rejection reason..."
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionNote("");
                  setIsBulkReject(false);
                }}
                className="flex-1 py-3 text-zinc-600 dark:text-zinc-400 font-bold text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  isBulkReject
                    ? handleBulkStatusUpdate("rejected", rejectionNote)
                    : handleStatusUpdate(
                        selectedIds[0],
                        "rejected",
                        rejectionNote,
                      )
                }
                disabled={!rejectionNote.trim() || updating}
                className="flex-2 py-3 bg-[#DD1D25] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#DD1D25]/20 hover:bg-[#c41a21] transition-all disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Date Range Modal */}
      {showDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-sm p-8 shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 mb-2">
              Select Time Frame
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
              Only registrations within this period will be included in the PDF
              report.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">
                  Start Date
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-50 text-sm focus:outline-none focus:border-[#DD1D25] transition-all"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">
                  End Date
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-50 text-sm focus:outline-none focus:border-[#DD1D25] transition-all"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowDateModal(false)}
                className="flex-1 py-3 text-zinc-600 dark:text-zinc-400 font-bold text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={downloadPDF}
                className="flex-2 py-3 bg-[#DD1D25] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#DD1D25]/20 hover:bg-[#c41a21] transition-all"
              >
                Download Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberRegistrations;
