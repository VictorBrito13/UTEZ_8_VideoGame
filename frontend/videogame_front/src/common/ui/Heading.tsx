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
    1: "font-headline text-3xl font-black uppercase tracking-tighter text-white",
    2: "font-headline text-lg font-bold uppercase tracking-[0.2em] text-on-surface terminal-glow",
    3: "font-headline text-base font-bold uppercase tracking-widest text-secondary",
    4: "font-headline text-sm font-semibold uppercase tracking-wider text-on-surface-variant",
  };

  return (
    <Tag className={`${baseStyles[level]} ${className}`.trim()}>{children}</Tag>
  );
};
