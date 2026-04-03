import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export const BackButton = () => {
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: -5, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
      onClick={() => navigate("/")}
      className="fixed top-8 left-8 z-50 p-3 bg-neutral-900 border border-white/10 rounded-full text-white/50 hover:text-white transition-all backdrop-blur-md"
    >
      <ArrowLeft size={20} />
    </motion.button>
  );
};
