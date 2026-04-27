import { type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "default" | "primary";
};

export function Button({ children, variant = "default", ...props }: ButtonProps) {
  return (
    <button
      className={variant === "primary" ? "button button--primary" : "button"}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
