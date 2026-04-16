import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authController } from "../controllers/authController";

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
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData) {
        // If it's a validation error object (common in DRF)
        if (typeof errorData === "object") {
          // Drill down if the error is nested under an 'error' key
          const actualError = errorData.error || errorData;
          
          if (typeof actualError === "object") {
            const firstKey = Object.keys(actualError)[0];
            const firstError = actualError[firstKey];
            const message = Array.isArray(firstError) ? firstError[0] : firstError;
            
            // If the message is STILL an object, stringify it as a last resort
            const finalMessage = typeof message === "object" ? JSON.stringify(message) : message;
            setError(`${firstKey}: ${finalMessage}`);
          } else {
            setError(String(actualError));
          }
        } else {
          setError(errorData.error || errorData.message || "Registration failed");
        }
      } else {
        setError("Registration failed. Please check your connection.");
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
