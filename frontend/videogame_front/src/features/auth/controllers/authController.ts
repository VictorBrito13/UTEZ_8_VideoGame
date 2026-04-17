import axios from "axios";
import { encryptJson } from "../../../common/utils/payloadCrypto";
import { BASE_URL } from "../../../common/utils/url";
import type { LoginRequest, AuthResponse, RegisterRequest } from "../types";

export const authController = {
  login: async (formData: LoginRequest): Promise<AuthResponse> => {
    const response = await axios.post<AuthResponse>(
      `${BASE_URL}/api/login`,
      formData,
    );
    return response.data;
  },
  register: async (formData: RegisterRequest): Promise<unknown> => {
    const email_encrypted = await encryptJson(formData.email);
    const { email: _plainEmail, ...rest } = formData;
    const response = await axios.post(`${BASE_URL}/api/register`, {
      ...rest,
      email_encrypted,
    });
    return response.data;
  },
};
