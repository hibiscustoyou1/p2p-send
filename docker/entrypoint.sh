#!/bin/sh
set -e

# ── 步骤 1：解密 .env.enc → /app/.env（单一配置源） ────────────────────────
echo "[Entrypoint] 正在解密配置..."
node /app/vault.js decrypt

# ── 步骤 2：将 .env 中所有变量导出到当前 shell 环境 ─────────────────────────
# set -a 使后续赋值自动 export；. 读取文件；set +a 恢复默认
set -a
# shellcheck disable=SC1091
. /app/.env
set +a

# ── 步骤 3：DATABASE_URL 路径规范化 ─────────────────────────────────────────
# .env 中可保留 file:./db/dev.db（本地开发适用的相对路径）
# 生产容器中，prisma CLI 与 PrismaClient 对相对路径解析基准不同，统一映射为绝对路径
case "$DATABASE_URL" in
  file:./*)
    DB_REL="${DATABASE_URL#file:./}"
    mkdir -p "/app/data/$(dirname "$DB_REL")"
    export DATABASE_URL="file:/app/data/$DB_REL"
    echo "[Entrypoint] DATABASE_URL 已规范化 → ${DATABASE_URL}"
    ;;
esac

# ── 步骤 4：数据库迁移（DATABASE_URL 已就绪） ───────────────────────────────
echo "[Entrypoint] 正在执行数据库迁移..."
prisma migrate deploy --schema=/app/server/schema.prisma
echo "[Entrypoint] 数据库迁移完成"

# ── 步骤 5：生成 nginx.conf 并启动 Nginx ────────────────────────────────────
NODE_PORT="${PORT:-3030}"
export NODE_PORT
echo "[Entrypoint] 启动 Nginx (upstream: ${NODE_PORT})..."
envsubst '${NODE_PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
nginx -g 'daemon off;' &

# ── 步骤 6：启动 Node.js 服务 ───────────────────────────────────────────────
echo "[Entrypoint] 启动 Node.js Server..."
cd /app
exec node server/index.js
