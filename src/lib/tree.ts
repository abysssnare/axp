/** 纯函数：把相对路径列表转成缩进树形文本（客户端安全） */
export function buildTree(files: string[], rootLabel: string): string {
  type TreeNode = { name: string; children: Map<string, TreeNode>; isFile: boolean };
  const root: TreeNode = { name: rootLabel, children: new Map(), isFile: false };
  for (const f of [...files].sort()) {
    const parts = f.split("/");
    let cur = root;
    parts.forEach((part, i) => {
      if (!cur.children.has(part)) {
        cur.children.set(part, { name: part, children: new Map(), isFile: i === parts.length - 1 });
      }
      cur = cur.children.get(part)!;
    });
  }
  const lines: string[] = [rootLabel + "/"];
  const emit = (node: TreeNode, prefix: string) => {
    const kids = [...node.children.values()].sort((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
    kids.forEach((kid, i) => {
      const last = i === kids.length - 1;
      lines.push(`${prefix}${last ? "└── " : "├── "}${kid.name}${kid.isFile ? "" : "/"}`);
      if (!kid.isFile) emit(kid, prefix + (last ? "    " : "│   "));
    });
  };
  emit(root, "");
  return lines.join("\n");
}
