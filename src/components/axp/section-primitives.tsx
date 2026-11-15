"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({
  id,
  kicker,
  title,
  lead,
  children,
  className,
}: {
  id: string;
  kicker?: string;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-28 border-b border-border/60 py-12 md:py-16", className)}>
      <div className="mb-8">
        {kicker && (
          <p className="mb-2 font-mono text-xs font-medium uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
            {kicker}
          </p>
        )}
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
        {lead && <div className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-[15px]">{lead}</div>}
      </div>
      {children}
    </section>
  );
}

export function FieldTable({
  headers,
  rows,
  monoFirst = true,
}: {
  headers: string[];
  rows: (string | ReactNode)[][];
  monoFirst?: boolean;
}) {
  return (
    <div className="axp-scroll overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[560px] text-left text-[13px]">
        <thead>
          <tr className="border-b bg-muted/50">
            {headers.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-3 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={cn(
                    "px-3 py-2.5 align-top",
                    j === 0 && monoFirst && "whitespace-nowrap font-mono text-[12px] font-medium text-foreground",
                    j > 0 && "text-muted-foreground"
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pill({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "emerald" | "amber" | "rose" | "zinc" }) {
  const tones: Record<string, string> = {
    default: "border-border bg-muted text-muted-foreground",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
    zinc: "border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", tones[tone])}>
      {children}
    </span>
  );
}
