import axios from "axios";
import { BASE_URL } from "../../../common/utils/url";
import type { LoginRequest, AuthResponse, RegisterRequest } from "../types";

export const authController = {
  login: async (formData: LoginRequest): Promise<AuthResponse> => {
    const response = await axios.post<AuthResponse>(`${BASE_URL}/api/login`, formData);
    return response.data;
  },
  register: async (formData: RegisterRequest): Promise<AuthResponse> => {
    const response = await axios.post<AuthResponse>(`${BASE_URL}/api/register`, formData);
    return response.data;
  },
};
