"use client";

import React from "react";

export function Panel({
  title,
  subtitle,
  right,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-line bg-panel/80 backdrop-blur ${className}`}
    >
      {(title || right) && (
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            {title && (
              <h2 className="text-sm font-semibold tracking-tight text-zinc-100">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                {subtitle}
              </p>
            )}
          </div>
          {right}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Label({
  children,
  hint,
  htmlFor,
}: {
  children: React.ReactNode;
  hint?: string;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 flex items-baseline gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400"
    >
      {children}
      {hint && (
        <span className="font-normal normal-case tracking-normal text-zinc-600">
          {hint}
        </span>
      )}
    </label>
  );
}

const fieldBase =
  "w-full rounded-xl border border-line bg-ink px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-banana/60 focus:ring-2 focus:ring-banana/15 disabled:opacity-50";

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      className={`${fieldBase} resize-y leading-relaxed ${props.className ?? ""}`}
    />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldBase} ${props.className ?? ""}`} />;
}

export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & {
    children: React.ReactNode;
  }
) {
  return (
    <select
      {...props}
      className={`${fieldBase} cursor-pointer appearance-none bg-[length:16px] bg-[right_0.85rem_center] bg-no-repeat pr-10 ${props.className ?? ""}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2.5'><path d='M6 9l6 6 6-6'/></svg>\")",
        ...props.style,
      }}
    />
  );
}

export function Button({
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
}) {
  const variants: Record<string, string> = {
    primary:
      "bg-banana text-ink hover:bg-amber-300 disabled:bg-zinc-700 disabled:text-zinc-500 font-semibold",
    outline:
      "border border-line bg-panel2 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800",
    ghost: "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
    danger:
      "border border-red-900/60 bg-red-950/40 text-red-300 hover:bg-red-900/40",
  };
  const sizes: Record<string, string> = {
    sm: "px-2.5 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2.5 text-sm rounded-xl",
    lg: "px-5 py-3 text-sm rounded-xl",
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 transition disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${props.className ?? ""}`}
    />
  );
}

export function Chip({
  active,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-banana bg-banana/15 text-banana"
          : "border-line bg-panel2 text-zinc-400 enabled:hover:border-zinc-600 enabled:hover:text-zinc-200"
      } ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function Note({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn" | "error" | "ok";
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    info: "border-sky-900/50 bg-sky-950/30 text-sky-200",
    warn: "border-amber-900/50 bg-amber-950/30 text-amber-200",
    error: "border-red-900/50 bg-red-950/30 text-red-200",
    ok: "border-emerald-900/50 bg-emerald-950/30 text-emerald-200",
  };
  return (
    <div
      className={`rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${tones[tone]}`}
    >
      {children}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Collapse({
  title,
  count,
  children,
  defaultOpen = false,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 bg-panel2 px-3.5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 transition hover:text-zinc-200"
      >
        <span className="flex items-center gap-2">
          {title}
          {count !== undefined && count > 0 && (
            <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-zinc-400">
              {count}
            </span>
          )}
        </span>
        <span className={`transition ${open ? "rotate-180" : ""}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>
      {open && <div className="space-y-4 p-3.5">{children}</div>}
    </div>
  );
}

export function Code({ value }: { value: unknown }) {
  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <pre className="max-h-96 overflow-auto rounded-xl border border-line bg-ink p-3.5 text-[11px] leading-relaxed text-zinc-400">
      {text}
    </pre>
  );
}
