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
    page: "w-full flex-grow flex flex-col justify-center items-center px-4",
    card: "w-full max-w-lg p-8 space-y-6 bg-surface-container-low beveled-border shadow-[24px_24px_0px_0px_rgba(0,0,0,0.5)] relative overflow-hidden",
  };

  return (
    <div className={`${variants[variant]} ${className}`.trim()}>{children}</div>
  );
};
