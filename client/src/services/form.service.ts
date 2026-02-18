import api from "./api";
import type { Form, FormSubmission, SubmissionStatus } from "../types";

export const formService = {
  getForms: async (includeInactive?: boolean) => {
    const response = await api.get<Form[]>(
      `/forms${includeInactive ? "?includeInactive=true" : ""}`,
    );
    return response.data;
  },

  getFormById: async (formId: string) => {
    const response = await api.get<Form>(`/forms/${formId}`);
    return response.data;
  },

  createForm: async (formData: Partial<Form>) => {
    const response = await api.post<Form>("/forms", formData);
    return response.data;
  },

  updateForm: async (formId: string, formData: Partial<Form>) => {
    const response = await api.put<Form>(`/forms/${formId}`, formData);
    return response.data;
  },

  deleteForm: async (formId: string) => {
    const response = await api.delete(`/forms/${formId}`);
    return response.data;
  },

  hardDeleteForm: async (formId: string) => {
    const response = await api.delete(`/forms/${formId}/hard`);
    return response.data;
  },

  submitForm: async (formId: string, data: any) => {
    const response = await api.post<FormSubmission>(
      `/forms/${formId}/submit`,
      data,
    );
    return response.data;
  },

  getFormSubmissions: async (formId: string, status?: SubmissionStatus) => {
    const response = await api.get<FormSubmission[]>(
      `/forms/${formId}/submissions`,
      { params: { status } },
    );
    return response.data;
  },

  updateSubmissionStatus: async (
    id: string,
    status: SubmissionStatus,
    reviewNotes?: string,
    createTeam?: boolean,
  ) => {
    const response = await api.patch<FormSubmission>(
      `/forms/submissions/${id}/status`,
      { status, reviewNotes, createTeam },
    );
    return response.data;
  },
};
