import React from "react";

interface HeadingProps {
  children: React.ReactNode;
  level?: 1 | 2 | 3 | 4;
  className?: string;
}

export const Heading: React.FC<HeadingProps> = ({
  children,
  level = 2,
  className = "",
}) => {
  const Tag = `h${level}` as any;

  const baseStyles: Record<number, string> = {
    1: "text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500",
    2: "text-3xl font-extrabold text-white",
    3: "text-xl font-bold text-slate-100",
    4: "text-lg font-semibold text-slate-200",
  };

  return (
    <Tag className={`${baseStyles[level]} ${className}`.trim()}>
      {children}
    </Tag>
  );
};
