import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "quiet";

const CLASS: Record<Variant, string> = {
  primary: "primary-button",
  secondary: "secondary-button",
  quiet: "quiet-button",
};

/** The primary and secondary buttons are laid out as label-plus-affordance, so
 *  the trailing glyph is part of the component rather than every call site. */
function content(children: ReactNode, variant: Variant, trailing?: ReactNode) {
  if (variant === "quiet") return children;
  const glyph = trailing === undefined ? "→" : trailing;
  return (
    <>
      <span>{children}</span>
      {glyph === null ? null : <span aria-hidden="true">{glyph}</span>}
    </>
  );
}

function classes(variant: Variant, wide?: boolean, className?: string) {
  return [CLASS[variant], wide ? "wide" : "", className ?? ""].filter(Boolean).join(" ");
}

type ButtonProps = Omit<ComponentProps<"button">, "className"> & {
  variant?: Variant;
  trailing?: ReactNode;
  wide?: boolean;
  className?: string;
};

export function Button({ variant = "primary", trailing, wide, className, children, type = "button", ...rest }: ButtonProps) {
  return (
    <button className={classes(variant, wide, className)} type={type} {...rest}>
      {content(children, variant, trailing)}
    </button>
  );
}

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: Variant;
  trailing?: ReactNode;
  wide?: boolean;
  className?: string;
};

export function ButtonLink({ variant = "primary", trailing, wide, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={classes(variant, wide, className)} {...rest}>
      {content(children, variant, trailing)}
    </Link>
  );
}
