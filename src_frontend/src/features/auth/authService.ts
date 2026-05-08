import { api } from "@/libs/axios";

export interface LoginPayload {
  login: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export const authService = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>("/auth/login", payload);
    return data;
  },
};
