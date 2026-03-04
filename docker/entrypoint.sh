#!/bin/sh

# 1. 根据环境变量 PORT 动态生成 nginx.conf（避免端口硬编码不同步）
#    NODE_PORT 独立命名，防止与 nginx 内置变量冲突
NODE_PORT=${PORT:-3030}
export NODE_PORT
echo "Starting Nginx (upstream port: ${NODE_PORT})..."
envsubst '${NODE_PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
# daemon off：让 nginx 不 fork 到后台，直接将日志输出到 stdout/stderr，与 docker logs 对接
nginx -g 'daemon off;' &

# 2. 启动 Node.js 服务（内部在 loadSecureEnv 后自动执行 prisma migrate deploy）
echo "Starting Node.js Server..."
cd /app
node server/index.js
