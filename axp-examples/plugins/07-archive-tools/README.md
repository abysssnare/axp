# 07 · 压缩解压（无 UI）

`archive.pack` 把文件列表封装成 `AXPACK1:` 字符串并落盘，`archive.unpack` 还原条目——**在本仓 CLI 宿主里真实可跑**。
真机上把 `impl` 换成 `bin`（随包 zip 可执行文件）+ `abis`，或用 `proc` 调系统 zip，JS 版作为降级路径。
