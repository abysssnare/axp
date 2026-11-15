"use client";

import { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";
import SyntaxHighlighter from "react-syntax-highlighter";
import oneDark from "react-syntax-highlighter/dist/esm/styles/prism/one-dark";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const TOKEN_MAP: Record<string, string> = {
  jsonc: "json",
  json: "json",
  bash: "bash",
  sh: "bash",
  shell: "bash",
  js: "javascript",
  mjs: "javascript",
  ts: "typescript",
  kotlin: "kotlin",
  yaml: "yaml",
  md: "markdown",
  text: "text",
  "": "text",
};

export function CodeBlock({
  code,
  lang = "text",
  className,
  showHeader = true,
  maxHeight,
  title,
}: {
  code: string;
  lang?: string;
  className?: string;
  showHeader?: boolean;
  maxHeight?: number;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const prismLang = TOKEN_MAP[lang] ?? "text";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-zinc-950 text-zinc-100",
        className
      )}
    >
      {showHeader && (
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
          <div className="flex items-center gap-2 text-[11px] font-medium tracking-wide text-zinc-400">
            <Terminal className="h-3 w-3" aria-hidden />
            <span className="font-mono">{title ?? prismLang}</span>
          </div>
          <button
            onClick={copy}
            aria-label="复制代码"
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
      <div className="axp-scroll overflow-auto" style={maxHeight ? { maxHeight } : undefined}>
        <SyntaxHighlighter
          language={prismLang}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: "0.85rem 1rem",
            background: "transparent",
            fontSize: "0.8rem",
            lineHeight: 1.65,
          }}
          codeTagProps={{ style: { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" } }}
        >
          {code.replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
      {isDark ? null : null}
    </div>
  );
}
