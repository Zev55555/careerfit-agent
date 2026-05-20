"use client";

import type {
  ButtonHTMLAttributes,
  LabelHTMLAttributes,
  MouseEvent,
  ReactNode,
} from "react";

type LiquidButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type LiquidButtonSize = "sm" | "md" | "lg";

type BaseProps = {
  as?: "button" | "label";
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  loading?: boolean;
  size?: LiquidButtonSize;
  variant?: LiquidButtonVariant;
};

type ButtonProps = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps>;
type LabelProps = BaseProps &
  Omit<LabelHTMLAttributes<HTMLLabelElement>, keyof BaseProps>;

type LiquidButtonProps = ButtonProps | LabelProps;

const sizeClassName: Record<LiquidButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

const radiusClassName: Record<LiquidButtonSize, string> = {
  sm: "rounded-[16px]",
  md: "rounded-[16px]",
  lg: "rounded-[16px]",
};

const edgeClassName: Record<LiquidButtonVariant, string> = {
  primary:
    "bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(186,230,253,0.62),rgba(219,234,254,0.46),rgba(255,255,255,0.92))]",
  secondary:
    "bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(226,232,240,0.5),rgba(219,234,254,0.38),rgba(255,255,255,0.82))]",
  danger:
    "bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(147,197,253,0.58),rgba(219,234,254,0.44),rgba(255,255,255,0.86))]",
  ghost:
    "bg-[linear-gradient(135deg,rgba(255,255,255,0.64),rgba(226,232,240,0.32),rgba(255,255,255,0.5))]",
};

const surfaceClassName: Record<LiquidButtonVariant, string> = {
  primary:
    "bg-white/72 text-slate-900 shadow-[0_8px_24px_rgba(24,39,75,0.10),0_2px_8px_rgba(24,39,75,0.06),inset_0_1px_0_rgba(255,255,255,0.95)] group-hover:bg-white/84 group-hover:shadow-[0_12px_30px_rgba(59,130,246,0.13),0_4px_12px_rgba(24,39,75,0.07),inset_0_1px_0_rgba(255,255,255,0.98)]",
  secondary:
    "bg-white/48 text-slate-800 shadow-[0_5px_18px_rgba(24,39,75,0.055),inset_0_1px_0_rgba(255,255,255,0.88)] group-hover:bg-white/64",
  danger:
    "bg-blue-50/72 text-blue-900 shadow-[0_5px_18px_rgba(30,64,175,0.06),inset_0_1px_0_rgba(255,255,255,0.88)] group-hover:bg-blue-50/86",
  ghost:
    "bg-white/28 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] group-hover:bg-white/48",
};

const shineOpacityClassName: Record<LiquidButtonVariant, string> = {
  primary: "group-hover:opacity-45 group-focus-visible:opacity-45",
  secondary: "group-hover:opacity-20 group-focus-visible:opacity-20",
  danger: "group-hover:opacity-18 group-focus-visible:opacity-18",
  ghost: "opacity-0",
};

export function LiquidButton(props: LiquidButtonProps) {
  const {
    as = "button",
    children,
    className = "",
    disabled = false,
    fullWidth = false,
    loading = false,
    size = "md",
    variant = "primary",
    ...rest
  } = props;
  const isDisabled = disabled || loading;
  const outerClassName = [
    "group relative inline-flex overflow-hidden p-[1px] align-middle transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/35",
    radiusClassName[size],
    fullWidth ? "w-full" : "",
    isDisabled
      ? "cursor-not-allowed opacity-55"
      : "cursor-pointer hover:-translate-y-px active:translate-y-0",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const inner = (
    <>
      <span
        className={`absolute inset-0 ${edgeClassName[variant]}`}
        aria-hidden="true"
      />
      <span
        className={`absolute inset-[-90%] bg-[conic-gradient(from_0deg,rgba(255,255,255,0.92),rgba(186,230,253,0.72),rgba(219,234,254,0.62),rgba(255,255,255,0.92))] opacity-0 ${!isDisabled ? `group-hover:animate-liquid-spin ${shineOpacityClassName[variant]}` : ""}`}
        aria-hidden="true"
      />
      <span
        className={`relative inline-flex w-full items-center justify-center gap-2 rounded-[inherit] font-semibold backdrop-blur-xl transition duration-200 ${sizeClassName[size]} ${surfaceClassName[variant]}`}
      >
        <span
          className="pointer-events-none absolute inset-x-3 top-px h-px rounded-full bg-white/80"
          aria-hidden="true"
        />
        <span className="relative inline-flex items-center justify-center gap-2">
          {children}
        </span>
      </span>
    </>
  );

  if (as === "label") {
    const labelProps = rest as Omit<
      LabelHTMLAttributes<HTMLLabelElement>,
      keyof BaseProps
    >;
    const handleClick = (event: MouseEvent<HTMLLabelElement>) => {
      if (isDisabled) {
        event.preventDefault();
        return;
      }

      labelProps.onClick?.(event);
    };

    return (
      <label
        {...labelProps}
        className={outerClassName}
        aria-disabled={isDisabled || undefined}
        onClick={handleClick}
      >
        {inner}
      </label>
    );
  }

  const buttonProps = rest as Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    keyof BaseProps
  >;

  return (
    <button {...buttonProps} className={outerClassName} disabled={isDisabled}>
      {inner}
    </button>
  );
}

