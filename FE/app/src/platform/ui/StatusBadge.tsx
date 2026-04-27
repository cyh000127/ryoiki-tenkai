import { type ReactNode } from "react";

type StatusBadgeProps = {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning";
};

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span className="status-badge" data-tone={tone}>
      {children}
    </span>
  );
}
