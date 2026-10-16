import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  getFormSubmissions,
  updateSubmissionStatus,
} from "../../../store/slices/formSlice";
import type { SubmissionStatus } from "../../../types";
import Modal from "../../ui/Modal";
import { TableSkeleton } from "../../ui/Skeleton";

// Icons
const CheckIcon = ({ className }: { className?: string }) => (
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
    <polyline points="20 6 9 17 4 12" />
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
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const EyeIcon = ({ className }: { className?: string }) => (
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
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const LoaderIcon = ({ className }: { className?: string }) => (
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
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const DataValue: React.FC<{ value: any }> = ({ value }) => {
  if (value === null || value === undefined)
    return <span className="text-zinc-400 italic">null</span>;

  if (Array.isArray(value)) {
    if (value.length === 0)
      return <span className="text-zinc-400 italic">empty array</span>;
    return (
      <div className="overflow-hidden border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
        <table className="w-full text-[11px] text-left">
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {value.map((item, index) => (
              <tr key={index}>
                <td className="px-2 py-1.5 bg-zinc-50 dark:bg-zinc-900/50 w-6 text-zinc-400 font-mono border-r border-zinc-200 dark:border-zinc-800 text-center">
                  {index + 1}
                </td>
                <td className="px-3 py-1.5">
                  <DataValue value={item} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (typeof value === "object") {
    if (Object.keys(value).length === 0)
      return <span className="text-zinc-400 italic">empty object</span>;
    return (
      <div className="overflow-hidden border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
        <table className="w-full text-[11px] text-left">
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {Object.entries(value).map(([k, v]) => (
              <tr key={k}>
                <td className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900/50 font-bold text-zinc-500 uppercase w-24 border-r border-zinc-200 dark:border-zinc-800">
                  {k.replace(/_/g, " ")}
                </td>
                <td className="px-3 py-1.5">
                  <DataValue value={v} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Handle strings that look like URLs/images
  const strVal = String(value);
  if (
    strVal.startsWith("http") ||
    strVal.startsWith("/") ||
    strVal.startsWith("data:image")
  ) {
    if (
      strVal.match(/\.(jpeg|jpg|gif|png)$/) ||
      strVal.startsWith("data:image")
    ) {
      return (
        <a
          href={strVal}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block"
        >
          <img
            src={strVal}
            alt="Preview"
            className="h-12 w-auto rounded border border-zinc-200 dark:border-zinc-800 hover:scale-105 transition-transform"
          />
        </a>
      );
    }
  }

  return (
    <span className="text-zinc-900 dark:text-zinc-100 wrap-break-word line-clamp-2 hover:line-clamp-none cursor-default transition-all">
      {strVal}
    </span>
  );
};

interface FormSubmissionsProps {
  formId: string;
}

export const FormSubmissions: React.FC<FormSubmissionsProps> = ({ formId }) => {
  const dispatch = useAppDispatch();
  const { submissions, loading } = useAppSelector((state) => state.form);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);

  useEffect(() => {
    dispatch(getFormSubmissions({ formId }));
  }, [dispatch, formId]);

  const handleStatusUpdate = async (
    id: string,
    status: SubmissionStatus,
    createTeam = false,
  ) => {
    setProcessingId(id);
    await dispatch(updateSubmissionStatus({ id, status, createTeam }));
    setProcessingId(null);
  };

  if (loading && submissions.length === 0) {
    return <TableSkeleton rows={6} label="Loading submissions" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <tr>
            <th className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
              Submitted By
            </th>
            <th className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
              Date
            </th>
            <th className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
              Data Summary
            </th>
            <th className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
              Status
            </th>
            <th className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {submissions.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                No submissions found.
              </td>
            </tr>
          ) : (
            submissions.map((submission) => (
              <tr
                key={submission._id}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    {(submission.submittedBy as any) || "Guest"}
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 font-mono">
                  {new Date(submission.submittedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="max-w-md">
                    <table className="min-w-full text-[10px] leading-tight text-zinc-600 dark:text-zinc-400">
                      <tbody>
                        {Object.entries(submission.data).map(([key, value]) => (
                          <tr
                            key={key}
                            className="border-b border-zinc-100 dark:border-zinc-800/50 last:border-0"
                          >
                            <td className="py-1 font-bold uppercase w-24 truncate">
                              {key.replace(/_/g, " ")}:
                            </td>
                            <td className="py-1 pl-2 truncate max-w-[150px]">
                              {Array.isArray(value) ? (
                                <span className="">{value.length}</span>
                              ) : typeof value === "object" &&
                                value !== null ? (
                                <span className="text-zinc-400 italic">
                                  Object
                                </span>
                              ) : (
                                String(value)
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                      submission.status === "approved"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : submission.status === "rejected"
                          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }`}
                  >
                    {submission.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setSelectedSubmission(submission)}
                      className="p-1.5 rounded bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 transition-colors"
                      title="View Details"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    {submission.status === "pending" && (
                      <>
                        <button
                          onClick={() =>
                            handleStatusUpdate(submission._id, "approved", true)
                          }
                          disabled={processingId === submission._id}
                          className="p-1.5 rounded bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/10 dark:hover:bg-green-900/20 disabled:opacity-50 transition-colors"
                          title="Approve & Create Team"
                        >
                          {processingId === submission._id ? (
                            <LoaderIcon className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckIcon className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() =>
                            handleStatusUpdate(submission._id, "rejected")
                          }
                          disabled={processingId === submission._id}
                          className="p-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                          title="Reject"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {selectedSubmission && (
        <Modal
          isOpen={!!selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          title="Submission Details"
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs text-zinc-500 uppercase tracking-wider font-bold">
              <span>Field</span>
              <span>Value</span>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border-y border-zinc-100 dark:border-zinc-800 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {Object.entries(selectedSubmission.data).map(([key, value]) => (
                <div key={key} className="py-4 space-y-2">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    {key.replace(/_/g, " ")}
                  </div>
                  <div>
                    <DataValue value={value} />
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
