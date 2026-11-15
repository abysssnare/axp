import { readFileSync } from 'fs'
import { join } from 'path'
import { AxpApp } from '@/components/axp/app'
import type { CodeFile } from '@/components/axp/infrastructure'

export const dynamic = 'force-dynamic'

/** 从磁盘读取真实的内核源码，交给源码浏览器展示 */
function loadKernelFiles(): CodeFile[] {
  const dir = join(process.cwd(), 'src/lib/axp')
  const wanted: { file: string; desc: string }[] = [
    { file: 'types.ts', desc: '规范契约的类型化投影：标识 / 扩展点 / 权限 / 生命周期 / 消息封皮' },
    { file: 'event-bus.ts', desc: '事件总线：保留主题校验、审计轨迹落库（§7-§8）' },
    { file: 'permissions.ts', desc: '权限代理：12 项目录、三态裁决、敏感级标注（§6）' },
    { file: 'registry.ts', desc: '注册表：清单静态校验、Kahn 拓扑排序、状态机迁移表（§3-§4-§8）' },
    { file: 'kernel.ts', desc: '内核：install / transition / uninstall / 心跳 / 故障注入（§5-§9）' },
    { file: 'memory-plugin.ts', desc: 'agent.memory 参考实现：write / recall / forget / sweep（§10）' },
    { file: 'seed.ts', desc: '官方默认插件集与市场目录（五个扩展点全覆盖）' },
  ]
  return wanted.map((w) => {
    try {
      return {
        path: w.file,
        desc: w.desc,
        code: readFileSync(join(dir, w.file), 'utf-8'),
      }
    } catch {
      return { path: w.file, desc: w.desc, code: '// 源文件不可读' }
    }
  })
}

export default function Home() {
  const files = loadKernelFiles()
  return <AxpApp files={files} />
}
