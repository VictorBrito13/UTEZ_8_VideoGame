import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authController } from "../controllers/authController";

const parseAuthError = (err: any): string => {
  const errorData = err.response?.data;
  if (!errorData) return "Registration failed. Please check your connection.";
  
  if (typeof errorData !== "object") {
    return errorData.error || errorData.message || "Registration failed";
  }

  const actualError = errorData.error || errorData;
  if (typeof actualError !== "object") return String(actualError);

  const firstKey = Object.keys(actualError)[0];
  const firstError = actualError[firstKey];
  const message = Array.isArray(firstError) ? firstError[0] : firstError;
  
  const finalMessage = typeof message === "object" ? JSON.stringify(message) : message;
  return `${firstKey}: ${finalMessage}`;
};

export const useRegister = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    trainer_sprite: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const setAvatar = (url: string) => {
    setFormData((prev) => ({ ...prev, trainer_sprite: url }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await authController.register(formData);
      navigate("/login");
    } catch (err: any) {
      setError(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    error,
    loading,
    handleChange,
    handleRegister,
    setAvatar,
  };
};
