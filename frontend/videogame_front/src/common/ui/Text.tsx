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
    normal: "font-body text-sm text-on-surface",
    secondary: "font-body text-xs text-on-surface-variant uppercase tracking-wider",
    error:
      "bg-error-container/80 border-2 border-on-error text-on-error-container p-3 text-sm text-center font-headline tracking-widest uppercase",
  };

  return (
    <p className={`${variants[variant]} ${className}`.trim()}>{children}</p>
  );
};
