"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, FileJson, FileText, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DocMeta } from "@/lib/axp-server";
import { Markdown, RawJsonViewer } from "./markdown";
import { Section } from "./section-primitives";

const GROUP_ORDER = ["规范正文 spec/", "教程与指南 docs/", "参考实现", "仓库根文件"];

export function LibrarySection({
  docs,
  initialPath,
  registerOpenDoc,
}: {
  docs: DocMeta[];
  /** URL hash 初始文档（#library&doc=...） */
  initialPath?: string;
  /** 供其他组件触发打开文档的注册器 */
  registerOpenDoc?: (fn: (path: string) => void) => void;
}) {
  const [active, setActive] = useState<string>(initialPath ?? docs[0]?.path ?? "");
  const [query, setQuery] = useState("");
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const knownDocs = useRef(new Set(docs.map((d) => d.path)));

  const fetchDoc = useCallback(
    async (path: string) => {
      if (content[path]) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/doc?path=${encodeURIComponent(path)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { content: string };
        setContent((c) => ({ ...c, [path]: data.content }));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [content]
  );

  const openDoc = useCallback(
    (path: string) => {
      if (!knownDocs.current.has(path)) return;
      setActive(path);
      void fetchDoc(path);
      requestAnimationFrame(() => {
        document.getElementById("library")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [fetchDoc]
  );

  useEffect(() => {
    registerOpenDoc?.(openDoc);
  }, [registerOpenDoc, openDoc]);

  useEffect(() => {
    if (active) void fetchDoc(active);
  }, [active, fetchDoc]);

  const activeDoc = docs.find((d) => d.path === active);
  const filtered = query.trim()
    ? docs.filter(
        (d) =>
          d.title.toLowerCase().includes(query.toLowerCase()) ||
          d.path.toLowerCase().includes(query.toLowerCase()) ||
          d.desc.toLowerCase().includes(query.toLowerCase())
      )
    : docs;

  const groups = GROUP_ORDER.map((g) => ({ group: g, items: filtered.filter((d) => d.group === g) })).filter(
    (g) => g.items.length > 0
  );

  return (
    <Section
      id="library"
      kicker="spec/ + docs/ 全文"
      title="文档库"
      lead="规范正文 9 篇、教程与指南 11 篇、参考实现文档 3 篇与仓库根文件——全部原文渲染。文档内的相对链接已相互打通，点击即可跳转。"
    >
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索文档…"
              className="h-9 pl-8 text-[13px]"
              aria-label="搜索文档"
            />
          </div>
          <nav aria-label="文档列表" className="axp-scroll max-h-[560px] space-y-4 overflow-y-auto rounded-lg border p-3">
            {groups.map((g) => (
              <div key={g.group}>
                <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.group}</p>
                <ul className="space-y-0.5">
                  {g.items.map((d) => (
                    <li key={d.path}>
                      <button
                        onClick={() => openDoc(d.path)}
                        aria-current={active === d.path}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors",
                          active === d.path
                            ? "bg-emerald-500/10 font-medium text-emerald-700 dark:text-emerald-400"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        )}
                      >
                        {d.lang === "json" ? (
                          <FileJson className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                        ) : (
                          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                        )}
                        <span className="min-w-0">
                          {d.title}
                          <span className="block truncate font-mono text-[10.5px] opacity-60">{d.path}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {groups.length === 0 && <p className="px-2 py-4 text-center text-xs text-muted-foreground">没有匹配的文档</p>}
          </nav>
        </div>

        <div ref={contentRef} className="min-w-0">
          {activeDoc && (
            <div className="mb-4 rounded-lg border bg-muted/30 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <h3 className="text-[15px] font-semibold">{activeDoc.title}</h3>
                <code className="rounded border bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                  axp/{activeDoc.path}
                </code>
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">{activeDoc.desc}</p>
            </div>
          )}

          {loading && !content[active] && (
            <div className="flex h-64 items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              正在读取 {active} …
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-400">
              加载失败：{error}
            </div>
          )}
          {content[active] &&
            (activeDoc?.lang === "json" ? (
              <RawJsonViewer content={content[active]} />
            ) : (
              <Markdown
                content={content[active]}
                fromPath={active}
                knownDocs={knownDocs.current}
                onOpenDoc={openDoc}
                className="rounded-lg border bg-card px-5 py-4 md:px-7 md:py-6"
              />
            ))}
        </div>
      </div>
    </Section>
  );
}
