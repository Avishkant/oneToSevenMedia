import React from "react";

export default function Button({
  as: Component = "button",
  children,
  variant = "primary",
  size = "md",
  className = "",
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  iconOnly = false,
  iconClassName = "w-4 h-4 mr-2",
  ...rest
}) {
  const base =
    "inline-flex items-center justify-center rounded-md font-medium transition-transform transform focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variants = {
    primary:
      "bg-sky-600 text-white hover:bg-sky-500 shadow-sm focus:ring-sky-400",
    success:
      "bg-emerald-500 text-white hover:bg-emerald-400 shadow-sm focus:ring-emerald-300",
    danger:
      "bg-rose-600 text-white hover:bg-rose-500 shadow-sm focus:ring-rose-300",
    ghost:
      "bg-transparent text-slate-200 hover:bg-white/6 focus:ring-slate-400",
    gradient:
      "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg hover:opacity-95 focus:ring-indigo-400",
  };

  const sizes = {
    sm: "px-2.5 py-1.5 text-sm",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const classes = `${base} ${variants[variant] || variants.primary} ${
    sizes[size] || sizes.md
  } ${className}`;

  // If iconOnly, reduce padding and center the icon
  const iconOnlyClasses = iconOnly ? "p-2 w-10 h-10 justify-center" : "";

  const Tag = Component || "button";
  // ensure default button does not act as a submit button unless explicitly requested
  const finalProps = { ...rest };

  // Remove framer-motion props when rendering a non-motion DOM/component to
  // avoid React warnings like "React does not recognize the `whileHover` prop on a DOM element"
  const motionProps = [
    "whileHover",
    "whileTap",
    "whileFocus",
    "whileDrag",
    "whileInView",
    "animate",
    "initial",
    "exit",
    "variants",
    "transition",
    "onAnimationComplete",
    "viewport",
  ];
  motionProps.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(finalProps, k)) {
      delete finalProps[k];
    }
  });

  // ensure default button does not act as a submit button unless explicitly requested
  if (
    typeof Tag === "string" &&
    Tag === "button" &&
    !Object.prototype.hasOwnProperty.call(finalProps, "type")
  ) {
    finalProps.type = "button";
  }

  // compute disabled appearance
  const isDisabled = Boolean(finalProps.disabled);
  const disabledClasses = isDisabled
    ? "opacity-50 cursor-not-allowed pointer-events-none"
    : "";
  if (isDisabled) finalProps["aria-disabled"] = true;

  return (
    <Tag
      className={`${classes} ${iconOnlyClasses} ${disabledClasses}`}
      {...finalProps}
    >
      {LeftIcon ? (
        <span className={iconClassName} aria-hidden>
          {typeof LeftIcon === "function" ? <LeftIcon /> : LeftIcon}
        </span>
      ) : null}
      {children}
      {RightIcon ? (
        <span className={iconClassName} aria-hidden>
          {typeof RightIcon === "function" ? <RightIcon /> : RightIcon}
        </span>
      ) : null}
    </Tag>
  );
}
