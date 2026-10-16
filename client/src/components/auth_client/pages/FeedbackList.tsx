import { useState, useEffect } from "react";
import api from "../../../services/api";
import { toast } from "react-hot-toast";
import { HeaderSkeleton, ListSkeleton } from "../../ui/Skeleton";

interface Feedback {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  type: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
}

const FeedbackList = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const response = await api.get("/reports");
      // Filter only feedback types
      setFeedbacks(
        response.data.filter((r: Feedback) => r.type === "feedback"),
      );
    } catch {
      toast.error("Failed to fetch feedbacks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/reports/${id}`, { status });
      toast.success("Status updated");
      fetchFeedbacks();
    } catch {
      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <HeaderSkeleton action={false} />
        <ListSkeleton rows={5} label="Loading feedback" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            User Feedbacks
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Review and manage member feedback.
          </p>
        </div>
        <div className="px-4 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {feedbacks.length} Feedbacks
        </div>
      </div>

      {feedbacks.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <p className="text-zinc-500">No feedback entries found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedbacks.map((feedback) => (
            <div
              key={feedback._id}
              className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                      {feedback.user?.name || "Anonymous"}
                    </span>
                    <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      {feedback.user?.role}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {new Date(feedback.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-md font-semibold text-[#DD1D25] mb-2 font-display">
                    {feedback.subject}
                  </h3>
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap border border-zinc-100 dark:border-zinc-800/50">
                    {feedback.description}
                  </div>
                </div>
                <div className="flex items-center shrink-0">
                  <button
                    onClick={() =>
                      handleUpdateStatus(
                        feedback._id,
                        feedback.status === "pending" ? "resolved" : "pending",
                      )
                    }
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm transform active:scale-95 ${
                      feedback.status === "pending"
                        ? "bg-[#DD1D25] text-white hover:bg-[#C41920] hover:shadow-red-900/20"
                        : "bg-green-100 text-green-700 border border-green-200 hover:bg-green-200"
                    }`}
                  >
                    {feedback.status === "pending" ? (
                      <>Mark as Resolved</>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Resolved
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedbackList;
