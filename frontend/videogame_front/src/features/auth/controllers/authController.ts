import axios from "axios";
import { BASE_URL } from "../../../common/utils/url";

export const authController = {
  login: async (formData: any) => {
    const response = await axios.post(`${BASE_URL}/api/login`, formData);
    return response.data;
  },
  register: async (formData: any) => {
    const response = await axios.post(`${BASE_URL}/api/register`, formData);
    return response.data;
  },
};
