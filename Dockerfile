# AXP 文档站点 · standalone 运行镜像
# 构建前需在本机完成：bun install --frozen-lockfile && bun run build
# 规范依据 axp/spec/10-infrastructure.md §7
FROM node:20-alpine

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /app

# 只搬 standalone 产物；必须包含 axp/（build 脚本已 cp -r axp .next/standalone/）
COPY .next/standalone/ ./

# 数据层自检：axp/ 缺失时镜像构建即失败，而不是等运行时静默 404
RUN test -f server.js \
 && test -f axp/spec/index.json \
 && test -f axp/validator/src/validate.mjs \
 && test -f axp/examples/01-hello/axp.json \
 && echo "standalone data OK"

EXPOSE 3000

# 同时验证进程存活与服务端数据层可用（/api/doc 读 axp/）
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/doc?path=spec/index.json').then(r=>{if(!r.ok)process.exit(1);return r.json()}).then(j=>{if(!j.content||!j.content.includes('specVersion'))process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
