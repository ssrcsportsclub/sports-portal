import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { useAppSelector } from "../../../store/hooks";

interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  slug?: string;
  organizer: string;
}

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
  });

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        // We need an endpoint to get single event.
        // Existing eventController doesn't explicitly have getEventById public,
        // but let's check if we can query it or if we need to add it.
        // Usually REST API has GET /events/:id.
        // Checking routes... eventRoutes.ts has `router.put("/:id", ...)` but NO `router.get("/:id")` ?!
        // It has `router.get("/", getEvents)`.
        // I might need to update backend to get single event.
        // For now, I will assume I need to fetch all and find, OR add the endpoint.
        // Best practice: Add GET /events/:id endpoint.
        // I will add that task next. For now, writing frontend assuming it exists.
        const { data } = await api.get(`/events/${id}`);
        setEvent(data);
        setEditFormData({
          title: data.title,
          description: data.description,
          date: new Date(data.date).toISOString().slice(0, 16), // Format for datetime-local
          location: data.location,
        });
      } catch (err: any) {
        console.error("Error fetching event details:", err);
        setError("Failed to load event details");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchEvent();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/events/${id}`, editFormData);
      setEvent((prev) => (prev ? { ...prev, ...editFormData } : null));
      setIsEditing(false);
      alert("Event updated successfully!");
    } catch (err) {
      console.error("Error updating event:", err);
      alert("Failed to update event.");
    }
  };

  const isAdmin = user?.role === "admin";

  if (loading)
    return <div className="p-6 text-center text-zinc-500">Loading...</div>;
  if (error || !event)
    return (
      <div className="p-6 text-center text-red-500">
        {error || "Event not found"}
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 flex items-center gap-1"
        >
          &larr; Back
        </button>
        {isAdmin && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-md text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            {isEditing ? "Cancel Edit" : "Edit Event"}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {/* Header Image / Gradient */}
        <div className="h-48 bg-zinc-100 dark:bg-zinc-800 relative">
          <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            {!isEditing ? (
              <h1 className="text-3xl font-bold text-white mb-2">
                {event.title}
              </h1>
            ) : (
              <input
                type="text"
                value={editFormData.title}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, title: e.target.value })
                }
                className="w-full px-3 py-2 bg-black/50 backdrop-blur-sm border border-white/20 text-white text-2xl font-bold rounded focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            )}

            <div className="flex items-center gap-4 text-zinc-200 text-sm mt-2">
              <span className="flex items-center gap-1">
                📍{" "}
                {!isEditing ? (
                  event.location
                ) : (
                  <input
                    type="text"
                    value={editFormData.location}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        location: e.target.value,
                      })
                    }
                    className="px-2 py-1 bg-black/50 backdrop-blur-sm border border-white/20 text-white rounded text-xs focus:outline-none focus:ring-1 focus:ring-white/50"
                  />
                )}
              </span>
              <span className="flex items-center gap-1">
                📅{" "}
                {!isEditing ? (
                  new Date(event.date).toLocaleString()
                ) : (
                  <input
                    type="datetime-local"
                    value={editFormData.date}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, date: e.target.value })
                    }
                    className="px-2 py-1 bg-black/50 backdrop-blur-sm border border-white/20 text-white rounded text-xs focus:outline-none focus:ring-1 focus:ring-white/50"
                  />
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Content: Description */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                About Event
              </h2>
              {isEditing ? (
                <textarea
                  rows={6}
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      description: e.target.value,
                    })
                  }
                  className="w-full p-3 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent text-zinc-800 dark:text-zinc-200"
                />
              ) : (
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </p>
              )}
            </div>

            {isEditing && (
              <button
                onClick={handleUpdate}
                className="px-6 py-2 bg-[#DD1D25] text-white font-medium rounded-md hover:bg-[#C41920]"
              >
                Save Changes
              </button>
            )}
          </div>

          {/* Right Sidebar: Actions */}
          <div className="space-y-6">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                Registration
              </h3>

              {event.slug ? (
                <Link
                  to={`/form/${event.slug}`}
                  className="block w-full py-2.5 px-4 bg-[#DD1D25] text-white text-center font-semibold rounded-lg hover:bg-[#C41920] transition-transform active:scale-95"
                >
                  Register Now
                </Link>
              ) : (
                <div className="text-center p-3 bg-zinc-200 dark:bg-zinc-700 rounded text-zinc-500 text-sm">
                  Registration Closed / Not Available
                </div>
              )}

              <p className="mt-4 text-xs text-center text-zinc-500">
                Clicking register will take you to the official registration
                form.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
