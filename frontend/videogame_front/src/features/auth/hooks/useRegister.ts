import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { authController } from "../controllers/authController";

function formatRegistrationError(data: unknown): string {
  const payload = data as { error?: unknown };
  const err = payload?.error;
  if (typeof err === "string") {
    return err;
  }
  if (err && typeof err === "object" && !Array.isArray(err)) {
    const lines = Object.entries(err as Record<string, unknown>).map(
      ([field, value]) => {
        const msgs = Array.isArray(value) ? value : [value];
        const text = msgs
          .map((m) => (typeof m === "string" ? m : String(m)))
          .join(" ");
        return `${field}: ${text}`;
      },
    );
    if (lines.length) {
      return lines.join(". ");
    }
  }
  return "Registration failed. Check your details and try again.";
}

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await authController.register(formData);
      navigate("/login");
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data) {
        setError(formatRegistrationError(err.response.data));
      } else if (axios.isAxiosError(err) && !err.response) {
        setError(
          "Unable to reach the server. Check your connection and try again.",
        );
      } else {
        setError("Registration failed. Please try again.");
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
    handleRegister,
    setAvatar,
  };
};
