FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
ARG VITE_API_BASE=__QB_API_BASE__
ARG VITE_BASE_PATH=/__QB_BASE_PATH__/
RUN pnpm build

FROM nginx:stable-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/docker-entrypoint.sh /docker-entrypoint.d/40-subst-vite-env.sh
RUN chmod +x /docker-entrypoint.d/40-subst-vite-env.sh

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
