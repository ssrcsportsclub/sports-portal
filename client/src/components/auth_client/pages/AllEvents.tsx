import { useState, useEffect } from "react";
import api from "../../../services/api";
import { Link } from "react-router-dom";

const AllEvents = () => {
  interface Event {
    _id: string;
    title: string;
    description: string;
    date: string;
    location: string;
    time?: string;
    participants: string[];
  }

  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data } = await api.get("/events");
        setEvents(data);
      } catch (err: any) {
        console.error("Error fetching events:", err);
        setError("Failed to load events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const upcomingEvents = events.filter(
    (event) => new Date(event.date) > new Date(),
  );
  const pastEvents = events.filter(
    (event) => new Date(event.date) <= new Date(),
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          All Events
        </h1>
        {/* Only Admin/Superuser/Moderator should see create button? Assuming logic handled elsewhere or hidden */}
        {/* <button className="px-4 py-2 bg-[#DD1D25] text-white rounded-md text-sm font-medium hover:bg-[#C41920] transition-colors">
          Create Event
        </button> */}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "upcoming"
              ? "border-[#DD1D25] text-[#DD1D25]"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "past"
              ? "border-[#DD1D25] text-[#DD1D25]"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Past
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-zinc-500">Loading events...</div>
        </div>
      ) : error ? (
        <div className="text-center text-red-500 py-10">{error}</div>
      ) : (activeTab === "upcoming" ? upcomingEvents : pastEvents).length ===
        0 ? (
        <div className="text-center py-10 text-zinc-500">
          No {activeTab} events found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(activeTab === "upcoming" ? upcomingEvents : pastEvents).map(
            (event) => (
              <div
                key={event._id}
                className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden hover:shadow-md transition-all"
              >
                <div className="h-32 bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-lg font-bold text-white truncate">
                      {event.title}
                    </h3>
                    <p className="text-zinc-200 text-xs truncate">
                      {event.location}
                    </p>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-[#DD1D25] uppercase tracking-wide">
                        {new Date(event.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        {new Date(event.date).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-zinc-600 dark:text-zinc-300 line-clamp-2">
                    {event.description}
                  </p>

                  <Link
                    to={`/dashboard/events/${event._id}`}
                    className="block text-center w-full py-2 px-4 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium text-sm hover:bg-[#DD1D25] hover:text-white transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
};

export default AllEvents;
