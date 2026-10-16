import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { authService } from "../../services/auth.service";

import type { AuthResponse } from "../../types";
import type { LoginCredentials } from "../../types";
import type { RegisterData } from "../../types";
import type { User } from "../../types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isCheckingAuth: boolean; // For initial profile check
  loading: boolean; // For login/register actions
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isCheckingAuth: true,
  loading: false,
  error: null,
};

// Async thunks
export const logout = createAsyncThunk("auth/logout", async () => {
  await authService.logout();
});

export const login = createAsyncThunk(
  "auth/login",
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Login failed");
    }
  },
);

export const googleLogin = createAsyncThunk(
  "auth/googleLogin",
  async (
    params: { tokenId?: string; accessToken?: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await authService.googleLogin(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Google Login failed",
      );
    }
  },
);

export const register = createAsyncThunk(
  "auth/register",
  async (data: RegisterData, { rejectWithValue }) => {
    try {
      const response = await authService.register(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Registration failed",
      );
    }
  },
);

export const fetchProfile = createAsyncThunk(
  "auth/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getProfile();
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch profile",
      );
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    });
    // Login
    builder.addCase(login.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(
      login.fulfilled,
      (state, action: PayloadAction<AuthResponse>) => {
        state.loading = false;
        state.user = action.payload;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      },
    );
    builder.addCase(login.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Google Login
    builder.addCase(googleLogin.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(
      googleLogin.fulfilled,
      (state, action: PayloadAction<AuthResponse>) => {
        state.loading = false;
        state.user = action.payload;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      },
    );
    builder.addCase(googleLogin.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Register
    builder.addCase(register.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(
      register.fulfilled,
      (state, action: PayloadAction<AuthResponse>) => {
        state.loading = false;
        state.user = action.payload;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      },
    );
    builder.addCase(register.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch Profile
    builder.addCase(fetchProfile.pending, (state) => {
      // Only the initial session check blocks protected routes; refreshing an
      // already-signed-in profile (e.g. from the Profile page) must not.
      if (!state.isAuthenticated) state.isCheckingAuth = true;
    });
    builder.addCase(
      fetchProfile.fulfilled,
      (state, action: PayloadAction<User>) => {
        state.isCheckingAuth = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      },
    );
    builder.addCase(fetchProfile.rejected, (state) => {
      state.isCheckingAuth = false;
      state.isAuthenticated = false;
      state.user = null;
    });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
