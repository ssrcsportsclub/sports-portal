import api from "./api";
import type {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  User,
} from "../types";

export const authService = {
  // Login
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/login", credentials);
    return response.data;
  },

  // Google Login
  googleLogin: async (params: {
    tokenId?: string;
    accessToken?: string;
  }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/google", params);
    return response.data;
  },

  // Register
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/register", data);
    return response.data;
  },

  // Get current user profile
  getProfile: async (): Promise<User> => {
    const response = await api.get<User>("/auth/profile");
    return response.data;
  },

  // Logout
  logout: async () => {
    await api.post("/auth/logout");
  },
};
