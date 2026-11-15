import { NextRequest, NextResponse } from "next/server";
import { readDocContent } from "@/lib/axp-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/doc?path=docs/faq.md
 * 返回 axp/ 规范项目中某个白名单文档的原始内容。
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get("path");
  if (!p) {
    return NextResponse.json({ error: "missing ?path" }, { status: 400 });
  }
  const content = readDocContent(p);
  if (content === null) {
    return NextResponse.json({ error: "doc not found or not allowed" }, { status: 404 });
  }
  return NextResponse.json({ path: p, content });
}
