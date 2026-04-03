import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "gradient" | "outline" | "ghost";
  children: ReactNode;
  icon?: string;
  iconPosition?: "left" | "right";
  className?: string;
}

export function Button({
  variant = "primary",
  children,
  icon,
  iconPosition = "right",
  className = "",
  ...props
}: ButtonProps) {
  let baseStyle = "flex items-center justify-center gap-2 rounded-xl font-bold transition-all px-6 py-3 ";
  
  switch (variant) {
    case "primary":
      baseStyle += "bg-primary text-white hover:opacity-90 active:scale-[0.98] shadow-lg shadow-primary/20 ";
      break;
    case "gradient":
      baseStyle += "editorial-gradient text-white hover:opacity-90 active:scale-[0.98] shadow-lg shadow-primary/20 ";
      break;
    case "outline":
      baseStyle += "bg-surface-container-lowest text-on-surface border border-outline-variant/30 hover:bg-surface-container-low ";
      break;
    case "ghost":
      baseStyle += "text-primary hover:bg-primary-container/10 ";
      break;
  }

  return (
    <button className={`${baseStyle} ${className}`} {...props}>
      {icon && iconPosition === "right" && <span className="material-symbols-outlined text-sm">{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === "left" && <span className="material-symbols-outlined text-sm">{icon}</span>}
    </button>
  );
}
