import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { getForms } from "../../../store/slices/formSlice";
import { FormRenderer } from "./FormRenderer";
import {
  submitForm,
  clearSuccess,
  clearError,
} from "../../../store/slices/formSlice";
import type { Form } from "../../../types";
import { CardGridSkeleton } from "../../ui/Skeleton";

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

const CheckCircleIcon = ({ className }: { className?: string }) => (
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
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
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

export const FormList = () => {
  const dispatch = useAppDispatch();
  const { forms, loading, error, success } = useAppSelector(
    (state) => state.form,
  );
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);

  useEffect(() => {
    dispatch(getForms());
  }, [dispatch]);

  // Handle successful submission
  useEffect(() => {
    if (success) {
      setTimeout(() => {
        dispatch(clearSuccess());
        setSelectedForm(null);
      }, 3000);
    }
  }, [success, dispatch]);

  const handleSubmit = (data: any) => {
    if (selectedForm) {
      dispatch(submitForm({ formId: selectedForm.formId, data }));
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
          <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Application Submitted!
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 max-w-md">
          Your application has been successfully submitted and is pending
          review. You will be notified once it has been processed.
        </p>
      </div>
    );
  }

  if (selectedForm) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => {
            setSelectedForm(null);
            dispatch(clearError());
          }}
          className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Forms
        </button>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-md text-sm">
            {error}
          </div>
        )}

        <FormRenderer
          form={selectedForm}
          onSubmit={handleSubmit}
          isLoading={loading}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Available Forms
        </h2>
      </div>

      {loading && forms.length === 0 ? (
        <CardGridSkeleton label="Loading forms" />
      ) : forms.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <ClipboardListIcon className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            No Forms Available
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400">
            There are currently no active forms or applications.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map((form) => (
            <div
              key={form._id}
              className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-[#DD1D25] dark:hover:border-[#DD1D25] transition-colors shadow-sm group cursor-pointer"
              onClick={() => setSelectedForm(form)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-md group-hover:bg-[#DD1D25] group-hover:text-white transition-colors text-[#DD1D25]">
                  <ClipboardListIcon className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2 truncate">
                {form.formTitle}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                {form.formDescription}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
