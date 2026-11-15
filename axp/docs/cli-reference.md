# `axp` CLI 参考

> 状态：Stable
> 适用：AXP v1.x
> 最后更新：2026-11-14

入口：`node cli/bin/axp.mjs <command> [args]`

## `axp new <id> [-o <dir>]`

生成最小插件骨架。

```bash
node cli/bin/axp.mjs new com.example.hello -o plugins/hello
```

生成 `axp.json` / `tools/hello.js` / `README.md`。`id` 必须为反向域名。

## `axp validate <dir>`

```bash
node validator/src/validate.mjs plugins/hello
# 或
node cli/bin/axp.mjs validate plugins/hello
```

检查项：JSON 解析 → schema → 引用完整性 → `abis` → `requests` 词汇表 → `dangerous ⊆ requests` → `gradient`/`agents` 权限上限 → UI 引用 → 热加载策略 → 组件 id 唯一 → 未声明文件不得作为入口。

退出码 `0` 全绿，非 `0` 输出 `CODE: message`。错误码表见 [`../validator/README.md`](../validator/README.md)。

| 参数 | 说明 |
|---|---|
| `--strict` | 把警告（如 `WARN_DEPRECATED`）也视为失败 |
| `--json` | 机器可读输出，供 CI 解析 |

## `axp pack <dir> -o <file.axp>`

```bash
node cli/bin/axp.mjs pack plugins/hello -o hello.axp
```

校验通过后打成 zip（包根必须含 `axp.json`）。产物**未签名**；发布前执行：

```bash
apksigner sign --v3 --ks release.jks hello.axp
```

## `axp inspect <file.axp | dir>`

打印组件摘要，不执行任何实现体：

```
AXP 1.0  com.example.hello  1.0.0
  tools      1   (demo.echo)
  surfaces   0
  knowledge  0
  agents     0
  events     0
  ui         no
  hotReload  no
  privilege  L0
```

## `axp install <file.axp>`（宿主侧）

调用宿主安装接口（`session-install`）。CLI 只负责把包交给宿主，实际装载由宿主完成；本仓库不含 Android 运行时。

## CI 用法

```yaml
- run: |
    for d in plugins/*/; do node validator/src/validate.mjs "$d"; done
```

## 退出码

| 码 | 含义 |
|---|---|
| 0 | 通过 |
| 1 | 校验失败（见错误码） |
| 2 | 用法错误 / 路径不存在 |
