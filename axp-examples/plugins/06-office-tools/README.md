# 06 · PDF / Excel 制作（无 UI）

纯功能插件：清单里**没有 `ui{}`**，只有 `tools[]`。`impl.js` 真实生成 CSV 与最小合法 PDF 文本，
通过 `ctx.storage` 持久化（`fs.write:shared`）。真机上把 `impl` 换成 `bin`/`proc` 指向随包的办公二进制即可（架构写进 `abis`）。

`axp validate .` 通过；`axp invoke com.example.office excel.make '{"rows":[["a",1],["b",2]]}'` 可直接跑。
