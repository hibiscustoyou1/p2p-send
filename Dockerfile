FROM node:20-slim AS builder
ARG VAULT_PASS
ENV VAULT_PASS=${VAULT_PASS}
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/client/package.json apps/client/package.json
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json

RUN pnpm config set registry https://registry.npmmirror.com/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm db:gen

RUN pnpm build

FROM node:20-slim

RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/apps/server/dist ./server
COPY --from=builder /app/.env.enc ./.env.enc

# 拷贝前端产物并立即修改所有权为 www-data
COPY --from=builder /app/apps/client/dist /usr/share/nginx/html
RUN chown -R www-data:www-data /usr/share/nginx/html && chmod -R 755 /usr/share/nginx/html

COPY docker/nginx.conf /etc/nginx/nginx.conf

COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 80

ENTRYPOINT ["/app/entrypoint.sh"]
