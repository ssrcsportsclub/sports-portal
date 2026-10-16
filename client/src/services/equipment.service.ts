import api from "./api";
import type { Equipment } from "../types";
import type { Responsibility } from "../types";
import type { EquipmentRequest } from "../types";
import type { EquipmentTransfer } from "../types";
import type { RequestStatus } from "../types";

export const equipmentService = {
  // Get all equipment
  getAll: async (): Promise<Equipment[]> => {
    const response = await api.get<Equipment[]>("/equipment");
    return response.data;
  },

  // Add new equipment (Admin/Superuser)
  create: async (
    data: Omit<Equipment, "_id" | "createdAt" | "updatedAt">,
  ): Promise<Equipment> => {
    const response = await api.post<Equipment>("/equipment", data);
    return response.data;
  },

  // Update equipment (Admin/Superuser)
  update: async (id: string, data: Partial<Equipment>): Promise<Equipment> => {
    const response = await api.put<Equipment>(`/equipment/${id}`, data);
    return response.data;
  },

  // Delete equipment (Admin)
  delete: async (id: string): Promise<void> => {
    await api.delete(`/equipment/${id}`);
  },

  // Request equipment
  requestEquipment: async (data: EquipmentRequest): Promise<Responsibility> => {
    const response = await api.post<Responsibility>("/equipment/request", data);
    return response.data;
  },

  // Get responsibilities (filtered by role)
  getResponsibilities: async (): Promise<Responsibility[]> => {
    const response = await api.get<Responsibility[]>(
      "/equipment/responsibilities",
    );
    return response.data;
  },

  // Update responsibility status (Admin/Superuser/Moderator)
  updateResponsibilityStatus: async (
    id: string,
    status: RequestStatus,
  ): Promise<Responsibility> => {
    const response = await api.put<Responsibility>(
      `/equipment/responsibilities/${id}`,
      { status },
    );
    return response.data;
  },

  // Transfer equipment
  transferEquipment: async (
    id: string,
    data: EquipmentTransfer,
  ): Promise<{ message: string; targetResp: Responsibility }> => {
    const response = await api.post(`/equipment/transfer/${id}`, data);
    return response.data;
  },

  // Force Return (Admin)
  forceReturn: async (id: string): Promise<Responsibility> => {
    const response = await api.post<Responsibility>(
      `/equipment/responsibilities/${id}/force-return`,
    );
    return response.data;
  },

  // Reports
  getChainOfCustodyReport: async (): Promise<Responsibility[]> => {
    const response = await api.get<Responsibility[]>(
      "/equipment/report/chain-of-custody",
    );
    return response.data;
  },

  // Get Waitlist
  // Waitlists for several items in a single request, keyed by equipment id.
  getWaitlists: async (
    equipmentIds: string[],
  ): Promise<Record<string, Responsibility[]>> => {
    if (!equipmentIds.length) return {};
    const response = await api.get<Record<string, Responsibility[]>>(
      "/equipment/waitlists",
      { params: { ids: equipmentIds.join(",") } },
    );
    return response.data;
  },

  getWaitlist: async (equipmentId: string): Promise<Responsibility[]> => {
    const response = await api.get<Responsibility[]>(
      `/equipment/waitlist/${equipmentId}`,
    );
    return response.data;
  },
};
