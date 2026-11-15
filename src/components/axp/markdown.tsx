"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SyntaxHighlighter from "react-syntax-highlighter";
import oneDark from "react-syntax-highlighter/dist/esm/styles/prism/one-dark";
import { FileText, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TOKEN_MAP: Record<string, string> = {
  jsonc: "json",
  bash: "bash",
  sh: "bash",
  shell: "bash",
  js: "javascript",
  mjs: "javascript",
  ts: "typescript",
  kotlin: "kotlin",
  yaml: "yaml",
  py: "python",
  text: "text",
  "": "text",
};

/** 把 Markdown 内的相对链接解析为文档库路径（相对 axp/ 根） */
function resolveDocPath(href: string, fromPath: string, known: Set<string>): string | null {
  if (/^(https?:|mailto:|#|axp:)/.test(href)) return null;
  let p = href.split("#")[0];
  if (!p) return null;
  const baseDir = fromPath.includes("/") ? fromPath.slice(0, fromPath.lastIndexOf("/")) : "";
  const parts = (baseDir ? `${baseDir}/${p}` : p).split("/");
  const stack: string[] = [];
  for (const part of parts) {
    if (part === "." || part === "") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  const resolved = stack.join("/");
  return known.has(resolved) ? resolved : null;
}

export interface MarkdownProps {
  content: string;
  /** 当前文档相对 axp/ 的路径，用于解析相对链接 */
  fromPath: string;
  /** 已知文档路径集合（相对 axp/） */
  knownDocs: Set<string>;
  /** 点击文档内链接时打开文档库对应文档 */
  onOpenDoc?: (path: string) => void;
  className?: string;
}

export const Markdown = memo(function Markdown({
  content,
  fromPath,
  knownDocs,
  onOpenDoc,
  className,
}: MarkdownProps) {
  return (
    <div
      className={cn(
        "axp-prose prose prose-sm max-w-none dark:prose-invert",
        "prose-headings:scroll-mt-24 prose-headings:tracking-tight",
        "prose-a:text-emerald-700 prose-a:no-underline hover:prose-a:underline dark:prose-a:text-emerald-400",
        "prose-code:before:hidden prose-code:after:hidden",
        "prose-th:text-left prose-td:align-top",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children }) {
            if (!href) return <>{children}</>;
            const docPath = resolveDocPath(href, fromPath, knownDocs);
            if (docPath && onOpenDoc) {
              return (
                <button
                  type="button"
                  onClick={() => onOpenDoc(docPath)}
                  className="inline-flex items-center gap-0.5 font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  {children}
                  <Link2 className="inline h-3 w-3 shrink-0 opacity-60" aria-hidden />
                </button>
              );
            }
            return (
              <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                {children}
              </a>
            );
          },
          pre({ children }) {
            return <>{children}</>;
          },
          code({ className: cls, children, ...props }) {
            const raw = String(children ?? "");
            const m = /language-(\w+)/.exec(cls ?? "");
            if (!m) {
              return (
                <code
                  className="rounded-md border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-[0.8em] text-foreground"
                  {...props}
                >
                  {raw}
                </code>
              );
            }
            return (
              <span className="not-prose block overflow-hidden rounded-lg border">
                <span className="axp-scroll block overflow-x-auto">
                  <SyntaxHighlighter
                    language={TOKEN_MAP[m[1]] ?? "text"}
                    style={oneDark}
                    customStyle={{
                      margin: 0,
                      padding: "0.85rem 1rem",
                      background: "#0c0c0f",
                      fontSize: "0.78rem",
                      lineHeight: 1.65,
                    }}
                    codeTagProps={{ style: { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" } }}
                  >
                    {raw.replace(/\n$/, "")}
                  </SyntaxHighlighter>
                </span>
              </span>
            );
          },
          blockquote({ children }) {
            return (
              <div className="not-prose my-4 flex gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-muted-foreground [&>div>p]:m-0">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <div className="space-y-2 [&>p]:m-0">{children}</div>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

export function RawJsonViewer({ content }: { content: string }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="axp-scroll block overflow-x-auto">
        <SyntaxHighlighter
          language="json"
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: "0.85rem 1rem",
            background: "#0c0c0f",
            fontSize: "0.78rem",
            lineHeight: 1.65,
          }}
          codeTagProps={{ style: { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" } }}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
