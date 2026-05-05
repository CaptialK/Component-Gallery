import * as React from "react";

export type FieldErrorProps = {
  id?: string;
  children: React.ReactNode | null;
};

/**
 * Field-level error line. Server-render compatible — purely structural;
 * mounts only when `children` is truthy. Used to coordinate with
 * `aria-invalid` + `aria-describedby` on inputs.
 */
export function FieldError({ id, children }: FieldErrorProps) {
  if (!children) return null;
  return (
    <p
      id={id}
      role="alert"
      className="font-mono text-[11px] tracking-[0.04em] text-[var(--color-accent)] mt-1"
    >
      {children}
    </p>
  );
}
