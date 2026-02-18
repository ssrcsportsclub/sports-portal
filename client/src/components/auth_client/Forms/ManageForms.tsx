import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  getForms,
  deleteForm,
  hardDeleteForm,
  updateForm,
} from "../../../store/slices/formSlice";
import { FormSubmissions } from "./FormSubmissions";

// Icons
const ClipboardListIcon = ({ className }: { className?: string }) => (
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
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M12 11h4" />
    <path d="M12 16h4" />
    <path d="M8 11h.01" />
    <path d="M8 16h.01" />
  </svg>
);

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

const TrashIcon = ({ className }: { className?: string }) => (
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
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const ArrowLeftIcon = ({ className }: { className?: string }) => (
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
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

export const ManageForms = () => {
  const dispatch = useAppDispatch();
  const { forms, loading } = useAppSelector((state) => state.form);
  const { user } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<"active" | "deactivated">(
    "active",
  );
  const [viewingSubmissionsId, setViewingSubmissionsId] = useState<
    string | null
  >(null);

  useEffect(() => {
    dispatch(getForms({ includeInactive: true }));
  }, [dispatch]);

  const handleDelete = (formId: string) => {
    if (
      window.confirm(
        "Are you sure you want to deactivate this form? Students will no longer be able to submit it.",
      )
    ) {
      dispatch(deleteForm(formId));
    }
  };

  const handleHardDelete = (formId: string) => {
    if (
      window.confirm(
        "CRITICAL ACTION: Are you sure you want to PERMANENTLY delete this form and ALL its submissions? This cannot be undone.",
      )
    ) {
      if (
        window.confirm("Please confirm one last time. All data will be wiped.")
      ) {
        dispatch(hardDeleteForm(formId));
      }
    }
  };

  const handleRestore = (formId: string) => {
    dispatch(updateForm({ formId, data: { isActive: true } }));
  };

  const filteredForms = forms.filter((form) => {
    const isHiddenReg =
      user?.role === "moderator" && form.formId === "registration";
    if (isHiddenReg) return false;

    if (activeTab === "active") return form.isActive;
    return !form.isActive;
  });

  if (viewingSubmissionsId) {
    const activeForm = forms.find((f) => f.formId === viewingSubmissionsId);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setViewingSubmissionsId(null)}
            className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Managed Forms
          </button>
          <div className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
            <span className="text-xs font-medium text-zinc-500">
              {activeForm?.formTitle} Submissions
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <FormSubmissions formId={viewingSubmissionsId} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "active"
              ? "border-[#DD1D25] text-[#DD1D25]"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Active Forms
        </button>
        <button
          onClick={() => setActiveTab("deactivated")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "deactivated"
              ? "border-[#DD1D25] text-[#DD1D25]"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Deactivated Forms
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading && forms.length === 0 ? (
          <div className="col-span-full flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-[#DD1D25] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredForms.length === 0 ? (
          <div className="col-span-full text-center p-12 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
            <ClipboardListIcon className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">
              No {activeTab} forms found
            </h3>
            <p className="text-sm text-zinc-500">
              {activeTab === "active"
                ? "Start adding forms to see them here."
                : "Inactive forms will appear in this section."}
            </p>
          </div>
        ) : (
          filteredForms.map((form) => (
            <div
              key={form._id}
              className="group bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1 overflow-hidden">
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {form.formTitle}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded ${form.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800"}`}
                    >
                      {form.isActive ? "Active" : "Inactive"}
                    </span>
                    <span>•</span>
                    <span>ID: {form.formId}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => setViewingSubmissionsId(form.formId)}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-zinc-100 hover:bg-[#DD1D25]/10 hover:text-[#DD1D25] dark:bg-zinc-800 dark:hover:bg-[#DD1D25]/20 text-sm font-medium transition-all"
                >
                  <UsersIcon className="w-4 h-4" />
                  Submissions
                </button>
                {form.isActive ? (
                  <button
                    onClick={() => handleDelete(form.formId)}
                    className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm font-medium transition-all"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => handleRestore(form.formId)}
                    className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-green-50 hover:bg-green-100 dark:bg-green-900/10 dark:hover:bg-green-900/20 text-green-600 text-sm font-medium transition-all"
                  >
                    Restore
                  </button>
                )}
                {!form.isActive &&
                  (user?.role === "admin" || user?.role === "superuser") && (
                    <button
                      onClick={() => handleHardDelete(form.formId)}
                      className="col-span-2 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-600 text-sm font-medium transition-all border border-red-100 dark:border-red-900/30"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Permanently Delete
                    </button>
                  )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
