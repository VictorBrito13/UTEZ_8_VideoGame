import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { authController } from "../controllers/authController";

/**
 * Build a single message from DRF-style bodies, e.g.
 * { error: { username: ["..."] } } or { username: ["..."] }.
 * Must never throw — a throw here skips setError and can blank the page.
 */
function formatRegistrationError(data: unknown): string {
  try {
    if (data == null) {
      return "Registration failed. Check your details and try again.";
    }
    if (typeof data === "string") {
      return data;
    }
    if (typeof data !== "object") {
      return "Registration failed. Check your details and try again.";
    }

    const payload = data as Record<string, unknown>;
    const wrapped = payload.error;
    const source = wrapped ?? payload;

    if (typeof source === "string") {
      return source;
    }
    if (Array.isArray(source)) {
      return source.map(String).join(". ");
    }
    if (source && typeof source === "object" && !Array.isArray(source)) {
      const lines = Object.entries(source as Record<string, unknown>).map(
        ([field, value]) => {
          const msgs = Array.isArray(value) ? value : [value];
          const text = msgs
            .map((m) => {
              if (m == null) return "";
              if (typeof m === "string") return m;
              if (typeof m === "object") return JSON.stringify(m);
              return String(m);
            })
            .join(" ");
          return `${field}: ${text}`;
        },
      );
      if (lines.length) {
        return lines.join(". ");
      }
    }
    return "Registration failed. Check your details and try again.";
  } catch {
    return "Registration failed. Check your details and try again.";
  }
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

  const handleRegister = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await authController.register(formData);
      navigate("/login");
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data !== undefined) {
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
