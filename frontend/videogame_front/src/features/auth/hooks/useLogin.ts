import { useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { authController } from "../controllers/authController";

export const useLogin = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await authController.login(formData);
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);

      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const isNetwork =
        axios.isAxiosError(err) &&
        (!err.response || err.code === "ERR_NETWORK");
      if (isNetwork) {
        setError(
          "Unable to reach the server. Check your connection and try again.",
        );
      } else if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError("Invalid username or password.");
      } else {
        setError("Sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    error,
    loading,
    handleChange,
    handleLogin,
  };
};
