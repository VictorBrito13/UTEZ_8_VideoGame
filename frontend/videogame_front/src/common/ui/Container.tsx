import React from "react";

interface ContainerProps {
  children: React.ReactNode;
  variant?: "page" | "card";
  className?: string;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  variant = "page",
  className = "",
}) => {
  const variants = {
    page: "flex justify-center items-center min-h-screen bg-slate-900 px-4",
    card: "w-full max-w-md p-8 space-y-6 bg-slate-800 rounded-2xl shadow-xl shadow-cyan-500/10 border border-slate-700",
  };

  return (
    <div className={`${variants[variant]} ${className}`.trim()}>
      {children}
    </div>
  );
};
