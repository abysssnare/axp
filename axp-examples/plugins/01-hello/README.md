# com.example.hello

> AXP v1.0 · privilege L0 · host AXP-0

## 做什么
最小示例：一个 `demo.echo` 工具，原样返回输入文本。无任何 Android 权限。

## 组件
| 类型 | id | 说明 |
|---|---|---|
| tool | `demo.echo` | echo |

## 权限
- privilege: `L0`
- requests: 无

## 热加载
未启用。

## 安装
```bash
node axp-spec/axp/validator/src/validate.mjs axp-examples/plugins/01-hello
node axp-spec/axp/cli/bin/axp.mjs pack axp-examples/plugins/01-hello -o hello.axp
apksigner sign --v3-signing-enabled true --ks release.jks hello.axp
```

## 验证
- [ ] `axp validate` 全绿
- [ ] 宿主调用 `demo.echo` 返回 `{ text, at }`
- [ ] 改成 `sideEffects: "destructive"` 后校验器要求 `confirm: true`
