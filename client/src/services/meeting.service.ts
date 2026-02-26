import api from "./api";
import type { Meeting, MeetingCreate } from "../types";

export const meetingService = {
  // Get all meetings (filtered by role server-side)
  getAll: async (): Promise<Meeting[]> => {
    const response = await api.get<Meeting[]>("/meetings");
    return response.data;
  },

  // Get a single meeting by ID
  getById: async (id: string): Promise<Meeting> => {
    const response = await api.get<Meeting>(`/meetings/${id}`);
    return response.data;
  },

  // Create a meeting (Admin only)
  create: async (data: MeetingCreate): Promise<Meeting> => {
    const response = await api.post<Meeting>("/meetings", data);
    return response.data;
  },

  // Delete a meeting (Admin only)
  delete: async (id: string): Promise<void> => {
    await api.delete(`/meetings/${id}`);
  },
};
