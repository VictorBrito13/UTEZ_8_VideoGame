import React from "react";

interface TextProps {
  children: React.ReactNode;
  variant?: "normal" | "secondary" | "error";
  className?: string;
}

export const Text: React.FC<TextProps> = ({
  children,
  variant = "normal",
  className = "",
}) => {
  const variants = {
    normal: "text-slate-200",
    secondary: "text-sm text-slate-400",
    error:
      "bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center",
  };

  return (
    <p className={`${variants[variant]} ${className}`.trim()}>{children}</p>
  );
};
