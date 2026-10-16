import { createApi, type BaseQueryFn } from "@reduxjs/toolkit/query/react";
import type { AxiosError, AxiosRequestConfig } from "axios";
import api from "../services/api";
import type { Draw } from "../lib/tournament";

/**
 * RTK Query cache for events, teams and draws.
 *
 * Every screen that reads this data shares one cache entry, so navigating
 * back to a page renders instantly, concurrent requests are de-duplicated,
 * and mutations invalidate exactly the data they change.
 */

export interface ApiError {
  status?: number;
  message: string;
}

/** Reuses the shared axios instance (base URL, credentials). */
const axiosBaseQuery: BaseQueryFn<
  {
    url: string;
    method?: AxiosRequestConfig["method"];
    data?: unknown;
    params?: AxiosRequestConfig["params"];
  },
  unknown,
  ApiError
> = async ({ url, method = "GET", data, params }) => {
  try {
    const result = await api.request({ url, method, data, params });
    return { data: result.data };
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;
    return {
      error: {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
      },
    };
  }
};

export interface EventSummary {
  _id: string;
  title: string;
  description: string;
  date: string;
  endDate?: string;
  location: string;
  slug?: string;
  participants?: string[];
}

export interface EventDetail extends EventSummary {
  organizer: string;
  form?: { _id: string; isActive: boolean; formId: string };
}

export interface TeamMember {
  _id?: string;
  name: string;
  email: string;
  phone: string;
}

export interface Team {
  _id: string;
  name: string;
  sport: string;
  teamType: string;
  members: TeamMember[];
  executive?: { _id: string; name: string; email: string };
  event?: string | { _id: string };
  coach?: string;
  createdAt: string;
}

export type MyTeam = Omit<Team, "event"> & {
  event?: { _id: string; title: string; date: string; endDate?: string } | null;
};

/** A draw from GET /draws, where `event` is populated. */
export type DrawWithEvent = Omit<Draw, "event"> & {
  event?: string | { _id: string; title: string; date: string };
};

/** Lightweight draw row from GET /draws?view=summary (no teams). */
export interface DrawSummary {
  _id: string;
  sport: string;
  format: Draw["format"];
  stage?: string;
  parentDraw?: string;
  createdAt: string;
  event?: string | { _id: string; title: string; date: string } | null;
}

export type RequestWindowMode = "scheduled" | "open" | "closed";

export interface RequestWindow {
  mode: RequestWindowMode;
  openHour: number;
  closeHour: number;
  note: string;
  timezone: string;
  isOpen: boolean;
  /** Why requests are refused right now, or null when open. */
  message: string | null;
  updatedAt: string | null;
  updatedBy: { _id: string; name: string; role: string } | null;
}

export type EventUpdate = Pick<
  EventDetail,
  "title" | "description" | "date" | "endDate" | "location"
>;

export interface CreateDrawBody {
  event: string;
  format: Draw["format"];
  sport: string;
  teamSize?: number;
  scoring?: Draw["scoring"];
  drawnTeams: string[];
  groupings?: { name: string; teams: string[] }[];
}

export type AdvanceDrawBody =
  | { mode: "groups"; qualifiers: number; groupSize: number }
  | {
      mode: "knockout";
      qualifiers?: number;
      seeding?: "ranked" | "draw";
      perGroup?: number;
      bestPlaced?: number;
    };

const drawTags = (draw: { _id: string }) => [
  { type: "Draw" as const, id: draw._id },
];

export const sportsApi = createApi({
  reducerPath: "sportsApi",
  baseQuery: axiosBaseQuery,
  tagTypes: ["Event", "Team", "Draw", "RequestWindow"],
  // Refetch stale data when the tab regains focus or the network returns.
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: (build) => ({
    /* ── Events ── */
    getEvents: build.query<EventSummary[], void>({
      query: () => ({ url: "/events" }),
      providesTags: (events = []) => [
        { type: "Event", id: "LIST" },
        ...events.map((e) => ({ type: "Event" as const, id: e._id })),
      ],
    }),
    getMyEvents: build.query<EventSummary[], void>({
      query: () => ({ url: "/events/my" }),
      providesTags: [{ type: "Event", id: "MINE" }],
    }),
    getEvent: build.query<EventDetail, string>({
      query: (id) => ({ url: `/events/${id}` }),
      providesTags: (_r, _e, id) => [{ type: "Event", id }],
    }),
    updateEvent: build.mutation<
      EventDetail,
      { id: string; data: Partial<EventUpdate> }
    >({
      query: ({ id, data }) => ({ url: `/events/${id}`, method: "PUT", data }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Event", id },
        { type: "Event", id: "LIST" },
        { type: "Event", id: "MINE" },
      ],
    }),

    /* ── Teams ── */
    getTeams: build.query<Team[], void>({
      query: () => ({ url: "/teams" }),
      providesTags: [{ type: "Team", id: "LIST" }],
    }),
    /** Teams the user belongs to, with their event populated. */
    getMyTeams: build.query<MyTeam[], void>({
      query: () => ({ url: "/teams/my" }),
      providesTags: [{ type: "Team", id: "MINE" }],
    }),

    /* ── Equipment request window ── */
    getRequestWindow: build.query<RequestWindow, void>({
      query: () => ({ url: "/equipment/request-window" }),
      providesTags: ["RequestWindow"],
    }),
    updateRequestWindow: build.mutation<
      RequestWindow,
      Partial<Pick<RequestWindow, "mode" | "openHour" | "closeHour" | "note">>
    >({
      query: (data) => ({
        url: "/equipment/request-window",
        method: "PUT",
        data,
      }),
      // The response is the new state: write it straight into the cache.
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            sportsApi.util.updateQueryData(
              "getRequestWindow",
              undefined,
              () => data,
            ),
          );
        } catch {
          /* handled by the caller */
        }
      },
    }),

    /* ── Draws ── */
    /** Which sport/event pairs have draws — no teams, much smaller. */
    getDrawSummaries: build.query<DrawSummary[], void>({
      query: () => ({ url: "/draws", params: { view: "summary" } }),
      providesTags: (draws = []) => [
        { type: "Draw", id: "LIST" },
        ...draws.flatMap(drawTags),
      ],
    }),
    getDraws: build.query<DrawWithEvent[], void>({
      query: () => ({ url: "/draws" }),
      providesTags: (draws = []) => [
        { type: "Draw", id: "LIST" },
        ...draws.flatMap(drawTags),
      ],
    }),
    getEventDraws: build.query<Draw[], string>({
      query: (eventId) => ({ url: `/draws/event/${eventId}` }),
      providesTags: (draws = [], _e, eventId) => [
        { type: "Draw", id: `EVENT-${eventId}` },
        ...draws.flatMap(drawTags),
      ],
    }),
    createDraw: build.mutation<Draw, CreateDrawBody>({
      query: (data) => ({ url: "/draws", method: "POST", data }),
      invalidatesTags: (_r, _e, { event }) => [
        { type: "Draw", id: "LIST" },
        { type: "Draw", id: `EVENT-${event}` },
      ],
    }),
    advanceDraw: build.mutation<Draw, { id: string; body: AdvanceDrawBody }>({
      query: ({ id, body }) => ({
        url: `/draws/${id}/advance`,
        method: "POST",
        data: body,
      }),
      // Invalidating the source draw refetches its event's phase list (which
      // gains the new phase) and updates the source's qualification zone.
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Draw", id },
        { type: "Draw", id: "LIST" },
      ],
    }),
    updateMatch: build.mutation<
      Draw,
      {
        drawId: string;
        matchId: string;
        score: string;
        /** Winner team id or "DRAW"; omit to only update the live score. */
        result?: string;
      }
    >({
      query: ({ drawId, matchId, score, result }) =>
        result === undefined
          ? {
              url: `/draws/${drawId}/score`,
              method: "PATCH",
              data: { matchScores: { [matchId]: score } },
            }
          : {
              url: `/draws/${drawId}/results`,
              method: "PATCH",
              data: {
                matchScores: { [matchId]: score },
                matchResults: { [matchId]: result },
              },
            },
      // Write the server's copy straight into every cached list holding this
      // draw: the bracket updates instantly with no refetch.
      async onQueryStarted({ drawId }, { dispatch, queryFulfilled, getState }) {
        try {
          const { data: updated } = await queryFulfilled;
          const replace = <T extends { _id: string }>(list: T[]) => {
            const i = list.findIndex((d) => d._id === drawId);
            if (i !== -1) Object.assign(list[i], updated);
          };
          for (const {
            endpointName,
            originalArgs,
          } of sportsApi.util.selectInvalidatedBy(getState(), [
            { type: "Draw", id: drawId },
          ])) {
            if (endpointName === "getEventDraws")
              dispatch(
                sportsApi.util.updateQueryData(
                  "getEventDraws",
                  originalArgs as string,
                  (draft) => replace(draft),
                ),
              );
            if (endpointName === "getDraws")
              dispatch(
                sportsApi.util.updateQueryData("getDraws", undefined, (draft) =>
                  replace(draft as { _id: string }[]),
                ),
              );
          }
        } catch {
          /* handled by the caller */
        }
      },
    }),
  }),
});

export const {
  useGetEventsQuery,
  useGetMyEventsQuery,
  useGetEventQuery,
  useUpdateEventMutation,
  useGetTeamsQuery,
  useGetMyTeamsQuery,
  useGetDrawsQuery,
  useGetDrawSummariesQuery,
  useGetRequestWindowQuery,
  useUpdateRequestWindowMutation,
  useGetEventDrawsQuery,
  useCreateDrawMutation,
  useAdvanceDrawMutation,
  useUpdateMatchMutation,
} = sportsApi;

/** Message from an RTK Query error (ours or a serialized one). */
export const errorMessage = (error: unknown, fallback: string) =>
  (error as ApiError | undefined)?.message || fallback;

/** Id of a reference that may be an id string or a populated document. */
export const refId = (ref?: string | { _id: string } | null) =>
  typeof ref === "string" ? ref : ref?._id;
