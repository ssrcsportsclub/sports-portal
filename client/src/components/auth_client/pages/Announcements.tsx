import { useState, useEffect } from "react";
import api from "../../../services/api";
import { format } from "date-fns";
import { useAppSelector } from "../../../store/hooks";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];
const EMOJI_LABELS: { [key: string]: string } = {
  "👍": "ok",
  "❤️": "love",
  "😂": "haha",
  "😮": "woah",
  "😢": "aww",
  "🔥": "hell yeah",
};

interface ReactionSummary {
  emoji: string;
  count: number;
  isReacted: boolean;
}

interface Comment {
  response: string;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  isMe: boolean;
  isEdited: boolean;
}

interface Announcement {
  _id: string;
  title: string;
  content: string;
  author: {
    _id: string;
    name: string;
    role: string;
  };
  comments: Comment[];
  reactionsSummary: ReactionSummary[];
  createdAt: string;
}

const Announcements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<{
    annId: string;
    index: number;
    text: string;
  } | null>(null);

  const { user } = useAppSelector((state) => state.auth);

  const canCreate = user?.role === "admin" || user?.role === "superuser";

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await api.get("/announcements");
      setAnnouncements(res.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    try {
      setSubmitting(true);
      if (editingId) {
        const res = await api.put(`/announcements/${editingId}`, {
          title,
          content,
        });
        setAnnouncements((prev) =>
          prev.map((ann) => (ann._id === editingId ? res.data : ann)),
        );
      } else {
        await api.post("/announcements", { title, content });
        fetchAnnouncements();
      }
      resetForm();
    } catch (error) {
      console.error("Error saving announcement:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setEditingId(null);
    setShowCreateModal(false);
  };

  const handleEdit = (ann: Announcement) => {
    setTitle(ann.title);
    setContent(ann.content);
    setEditingId(ann._id);
    setShowCreateModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this announcement?"))
      return;
    try {
      await api.delete(`/announcements/${id}`);
      fetchAnnouncements();
    } catch (error) {
      console.error("Error deleting announcement:", error);
    }
  };

  const handleReact = async (id: string, emoji: string) => {
    try {
      const res = await api.post(`/announcements/${id}/react`, { emoji });
      setAnnouncements((prev) =>
        prev.map((ann) => (ann._id === id ? res.data : ann)),
      );
    } catch (error) {
      console.error("Error toggling reaction:", error);
    }
  };

  const handleAddComment = async (announcementId: string) => {
    const text = commentText[announcementId];
    if (!text?.trim()) return;

    try {
      const res = await api.post(`/announcements/${announcementId}/comments`, {
        response: text,
      });
      // Update the specific announcement in the list
      setAnnouncements((prev) =>
        prev.map((ann) => (ann._id === announcementId ? res.data : ann)),
      );
      setCommentText((prev) => ({ ...prev, [announcementId]: "" }));
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleUpdateComment = async () => {
    if (!editingComment || !editingComment.text.trim()) return;

    try {
      const res = await api.put(
        `/announcements/${editingComment.annId}/comments/${editingComment.index}`,
        { response: editingComment.text },
      );
      setAnnouncements((prev) =>
        prev.map((ann) => (ann._id === editingComment.annId ? res.data : ann)),
      );
      setEditingComment(null);
    } catch (error) {
      console.error("Error updating comment:", error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500 bg-zinc-50 dark:bg-zinc-950 min-h-screen">
      <div className="flex items-center justify-between sticky top-0 py-4 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-md z-10 border-b border-zinc-200 dark:border-zinc-800 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Announcements
          </h1>
        </div>
        {canCreate && (
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-[#DD1D25] hover:bg-[#C11920] text-white rounded-full font-medium transition-colors flex items-center gap-2 text-sm shadow-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create announcement
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-zinc-500 dark:text-zinc-400 font-medium text-center">
            No community posts yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <div
              key={ann._id}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                    {getInitials(ann.author.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-50 hover:underline cursor-pointer">
                          @{ann.author.name.toLowerCase().replace(/\s/g, "")}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {format(new Date(ann.createdAt), "MMM d")}
                        </span>
                      </div>
                      {user?.role === "admin" && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(ann)}
                            className="text-zinc-400 hover:text-blue-500 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(ann._id)}
                            className="text-zinc-400 hover:text-red-500 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mt-1">
                      {ann.title}
                    </h3>
                    <p className="mt-2 text-zinc-800 dark:text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">
                      {ann.content}
                    </p>

                    {/* Reactions Summary */}
                    {ann.reactionsSummary?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {ann.reactionsSummary.map((r) => (
                          <button
                            key={r.emoji}
                            onClick={() => handleReact(ann._id, r.emoji)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border transition-all ${
                              r.isReacted
                                ? "bg-[#DD1D25]/10 border-[#DD1D25]/30 text-[#DD1D25]"
                                : "bg-zinc-50 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 text-zinc-600 hover:border-zinc-300 dark:hover:border-zinc-600"
                            }`}
                          >
                            <span>{r.emoji}</span>
                            <span>{r.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-6">
                  {/* Reaction Picker */}
                  <div className="relative group/picker">
                    {(() => {
                      const activeReaction = ann.reactionsSummary?.find(
                        (r) => r.isReacted,
                      );
                      return (
                        <button
                          className={`flex items-center gap-2 transition-colors ${
                            activeReaction
                              ? "text-[#DD1D25] font-bold"
                              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                          }`}
                        >
                          {activeReaction ? (
                            <span className="text-xl leading-none">
                              {activeReaction.emoji}
                            </span>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            >
                              <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" />
                              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                              <line x1="9" y1="9" x2="9.01" y2="9" />
                              <line x1="15" y1="9" x2="15.01" y2="9" />
                            </svg>
                          )}
                          <span className="text-xs font-medium">
                            {activeReaction
                              ? EMOJI_LABELS[activeReaction.emoji] || "Reacted"
                              : "React"}
                          </span>
                        </button>
                      );
                    })()}
                    <div className="absolute bottom-3 left-0 mb-2 p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full shadow-xl opacity-0 scale-90 pointer-events-none group-hover/picker:opacity-100 group-hover/picker:scale-100 group-hover/picker:pointer-events-auto transition-all flex gap-1 z-30">
                      {REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReact(ann._id, emoji)}
                          className="w-10 h-10 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-2xl"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setActiveCommentId(
                        activeCommentId === ann._id ? null : ann._id,
                      )
                    }
                    className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    <span className="text-xs font-medium">
                      {ann.comments?.length || 0}
                    </span>
                  </button>
                </div>
              </div>

              {/* Comments Section */}
              {activeCommentId === ann._id && (
                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex gap-3 mb-6">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs uppercase">
                      {user ? getInitials(user.name) : "?"}
                    </div>
                    <div className="flex-1 space-y-2">
                      <textarea
                        value={commentText[ann._id] || ""}
                        onChange={(e) =>
                          setCommentText((prev) => ({
                            ...prev,
                            [ann._id]: e.target.value,
                          }))
                        }
                        placeholder="Add a comment..."
                        className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-100 outline-none py-1 text-sm resize-none transition-colors"
                        rows={1}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setActiveCommentId(null)}
                          className="px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleAddComment(ann._id)}
                          disabled={!commentText[ann._id]?.trim()}
                          className="px-3 py-1.5 text-xs font-semibold bg-[#DD1D25] hover:bg-[#C11920] text-white rounded-full disabled:opacity-50 transition-colors"
                        >
                          Comment
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {ann.comments?.map((comment, idx) => (
                      <div key={idx} className="flex gap-3 group/comment">
                        <div className="shrink-0 w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 font-bold text-xs">
                          {getInitials(comment.authorName)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">
                              @
                              {comment.authorName
                                .toLowerCase()
                                .replace(/\s/g, "")}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {format(new Date(comment.createdAt), "MMM d")}
                              {comment.isEdited && " (edited)"}
                            </span>
                            {comment.isMe && (
                              <button
                                onClick={() =>
                                  setEditingComment({
                                    annId: ann._id,
                                    index: idx,
                                    text: comment.response,
                                  })
                                }
                                className="opacity-0 group-hover/comment:opacity-100 p-1 text-zinc-400 hover:text-blue-500 transition-all"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3 w-3"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                >
                                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                </svg>
                              </button>
                            )}
                          </div>
                          {editingComment?.annId === ann._id &&
                          editingComment?.index === idx ? (
                            <div className="mt-2 space-y-2">
                              <textarea
                                value={editingComment.text}
                                onChange={(e) =>
                                  setEditingComment({
                                    ...editingComment,
                                    text: e.target.value,
                                  })
                                }
                                className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-100 outline-none py-1 text-sm resize-none"
                                rows={1}
                                autoFocus
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setEditingComment(null)}
                                  className="px-2 py-1 text-[10px] font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleUpdateComment}
                                  className="px-2 py-1 text-[10px] font-bold bg-[#DD1D25] text-white rounded hover:bg-[#C11920] transition-colors"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-zinc-800 dark:text-zinc-200 mt-0.5">
                              {comment.response}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal (Handles Edit too) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-lg dark:text-zinc-100">
                {editingId ? "Edit post" : "Create post"}
              </h3>
              <button
                onClick={resetForm}
                className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <input
                type="text"
                className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-[#DD1D25] dark:text-zinc-100 outline-none"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <textarea
                className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-[#DD1D25] dark:text-zinc-100 outline-none min-h-[120px] resize-none"
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#DD1D25] hover:bg-[#C11920] text-white rounded-full font-semibold text-sm disabled:opacity-50 transition-colors shadow-md"
                >
                  {submitting
                    ? "Saving..."
                    : editingId
                      ? "Update post"
                      : "Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;
