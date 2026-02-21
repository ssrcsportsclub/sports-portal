import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { formService } from "../../services/form.service";
import type { Form, FormSubmission, SubmissionStatus } from "../../types";

interface FormState {
  forms: Form[];
  currentForm: Form | null;
  submissions: FormSubmission[];
  loading: boolean;
  error: string | null;
  success: boolean;
}

const initialState: FormState = {
  forms: [],
  currentForm: null,
  submissions: [],
  loading: false,
  error: null,
  success: false,
};

export const getForms = createAsyncThunk(
  "forms/getAll",
  async (
    params: { includeInactive?: boolean } | undefined,
    { rejectWithValue },
  ) => {
    try {
      return await formService.getForms(params?.includeInactive);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

export const getFormById = createAsyncThunk(
  "forms/getById",
  async (formId: string, { rejectWithValue }) => {
    try {
      return await formService.getFormById(formId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

export const createForm = createAsyncThunk(
  "forms/create",
  async (formData: Partial<Form>, { rejectWithValue }) => {
    try {
      return await formService.createForm(formData);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

export const updateForm = createAsyncThunk(
  "forms/update",
  async (
    { formId, data }: { formId: string; data: Partial<Form> },
    { rejectWithValue },
  ) => {
    try {
      return await formService.updateForm(formId, data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

export const deleteForm = createAsyncThunk(
  "forms/delete",
  async (formId: string, { rejectWithValue }) => {
    try {
      await formService.deleteForm(formId);
      return formId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

export const hardDeleteForm = createAsyncThunk(
  "forms/hardDelete",
  async (formId: string, { rejectWithValue }) => {
    try {
      await formService.hardDeleteForm(formId);
      return formId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

export const submitForm = createAsyncThunk(
  "forms/submit",
  async (
    { formId, data }: { formId: string; data: any },
    { rejectWithValue },
  ) => {
    try {
      return await formService.submitForm(formId, data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

export const getFormSubmissions = createAsyncThunk(
  "forms/getSubmissions",
  async (
    { formId, status }: { formId: string; status?: SubmissionStatus },
    { rejectWithValue },
  ) => {
    try {
      return await formService.getFormSubmissions(formId, status);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

export const updateSubmissionStatus = createAsyncThunk(
  "forms/updateSubmissionStatus",
  async (
    {
      id,
      status,
      reviewNotes,
      createTeam,
    }: {
      id: string;
      status: SubmissionStatus;
      reviewNotes?: string;
      createTeam?: boolean;
    },
    { rejectWithValue },
  ) => {
    try {
      return await formService.updateSubmissionStatus(
        id,
        status,
        reviewNotes,
        createTeam,
      );
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

const formSlice = createSlice({
  name: "form",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = false;
    },
    resetCurrentForm: (state) => {
      state.currentForm = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get Forms
      .addCase(getForms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getForms.fulfilled, (state, action: PayloadAction<Form[]>) => {
        state.loading = false;
        state.forms = action.payload;
      })
      .addCase(getForms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get Form By Id
      .addCase(getFormById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getFormById.fulfilled, (state, action: PayloadAction<Form>) => {
        state.loading = false;
        state.currentForm = action.payload;
      })
      .addCase(getFormById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create Form
      .addCase(createForm.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createForm.fulfilled, (state, action: PayloadAction<Form>) => {
        state.loading = false;
        state.success = true;
        state.forms.unshift(action.payload);
      })
      .addCase(createForm.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update Form
      .addCase(updateForm.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateForm.fulfilled, (state, action: PayloadAction<Form>) => {
        state.loading = false;
        state.success = true;
        state.currentForm = action.payload;
        state.forms = state.forms.map((f) =>
          f._id === action.payload._id ? action.payload : f,
        );
      })
      .addCase(updateForm.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete Form
      .addCase(deleteForm.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteForm.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        // Just update the status if we're doing a soft delete
        state.forms = state.forms.map((f) =>
          f.formId === action.payload ? { ...f, isActive: false } : f,
        );
      })
      .addCase(deleteForm.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Hard Delete Form
      .addCase(hardDeleteForm.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        hardDeleteForm.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading = false;
          state.forms = state.forms.filter((f) => f.formId !== action.payload);
        },
      )
      .addCase(hardDeleteForm.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Submit Form
      .addCase(submitForm.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(submitForm.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(submitForm.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get Submissions
      .addCase(getFormSubmissions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        getFormSubmissions.fulfilled,
        (state, action: PayloadAction<FormSubmission[]>) => {
          state.loading = false;
          state.submissions = action.payload;
        },
      )
      .addCase(getFormSubmissions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update Submission Status
      .addCase(updateSubmissionStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        updateSubmissionStatus.fulfilled,
        (state, action: PayloadAction<FormSubmission | any>) => {
          state.loading = false;
          // Handle both standard response and team creation response
          const submission = action.payload.submission || action.payload;

          state.submissions = state.submissions.map((s) =>
            s._id === submission._id ? submission : s,
          );
        },
      )
      .addCase(updateSubmissionStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSuccess, resetCurrentForm } = formSlice.actions;
export default formSlice.reducer;
