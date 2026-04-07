# Deployment Guide

本文档给出前端（Dashboard）的生产部署方式：用 Docker 构建前端镜像，再用 `docker compose` 一键编排前端、后端 API 和 PostgreSQL。

## 部署内容

- `Dockerfile`: 多阶段构建前端镜像（Node 构建 + Nginx 静态服务）
- `docker/nginx.conf`: Nginx 站点配置，处理 SPA 路由回退
- `docker/docker-entrypoint.sh`: 容器启动时替换 API 地址占位符，支持运行时注入
- `docker-compose.prod.yml`: 生产编排文件，包含 `web`、`api` 和 `db`
- `compose.prod.env.example`: 生产环境变量示例

## 1. 构建镜像

### 仅构建前端

在仓库根目录执行：

```bash
docker build --pull -t qb_dashboard:latest .
```

如果需要在构建时指定 API 地址（会被 Vite 内联到 JS 中）：

```bash
docker build --pull --build-arg VITE_API_BASE=https://api.example.com -t qb_dashboard:latest .
```

如果你要推到镜像仓库：

```bash
docker build --pull -t registry.example.com/cphos/qb_dashboard:2026-04-07 .
docker push registry.example.com/cphos/qb_dashboard:2026-04-07
```

对应地，把 `compose.prod.env.example` 里的 `QB_WEB_IMAGE` 和 `QB_WEB_TAG` 改成你的仓库地址和版本号。

### API 地址注入机制

前端通过 `VITE_API_BASE` 环境变量指向后端 API。支持两种注入方式：

1. **构建时注入**：传 `--build-arg VITE_API_BASE=...`，Vite 会将地址内联到产物中
2. **运行时注入**：使用默认构建（不传 build arg），在容器启动时通过 `VITE_API_BASE` 环境变量替换占位符

运行时注入更灵活，同一镜像可以在不同环境使用不同的 API 地址。

## 2. 准备环境变量

先复制一份示例文件：

```bash
cp compose.prod.env.example .env
```

至少要修改这些值：

- `POSTGRES_PASSWORD`
- `QB_DATABASE_URL`（必须和 `POSTGRES_DB`、`POSTGRES_USER`、`POSTGRES_PASSWORD` 保持一致）
- `QB_JWT_SECRET`（请使用长随机字符串，不要沿用默认值）
- `QB_CORS_ORIGINS`（设为前端实际域名，如 `https://dashboard.example.com`）
- `VITE_API_BASE`（浏览器访问后端 API 的地址，如 `https://api.example.com`）

注意：

- `VITE_API_BASE` 是浏览器端发起请求的地址，不是容器间内网地址
- 如果前后端部署在同一台服务器上，可以填 `http://your-server-ip:8080`
- 如果数据库密码里包含 `@`、`:`、`/` 等特殊字符，需要做 URL 编码再写进 `QB_DATABASE_URL`

## 3. 启动生产环境

确保后端镜像已构建或可从仓库拉取，然后执行：

```bash
docker compose --env-file .env -f docker-compose.prod.yml up -d
```

如果同时要构建前端镜像：

```bash
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```

启动流程如下：

1. `db` 容器启动并通过健康检查
2. `api` 容器启动，等待 PostgreSQL 可连接，执行 migration
3. `web` 容器启动，替换 API 地址占位符，Nginx 开始提供服务
4. 前端监听 `0.0.0.0:80`，后端监听 `0.0.0.0:8080`
5. 如果 `users` 表为空，后端会自动创建初始管理员 `admin / changeme`

首次上线后请立即登录并修改默认管理员密码。

## 4. 验证部署结果

查看容器状态：

```bash
docker compose --env-file .env -f docker-compose.prod.yml ps
```

查看前端日志：

```bash
docker compose --env-file .env -f docker-compose.prod.yml logs -f web
```

查看后端日志：

```bash
docker compose --env-file .env -f docker-compose.prod.yml logs -f api
```

健康检查：

```bash
# 前端
curl http://127.0.0.1:${QB_WEB_PORT:-80}/

# 后端
curl http://127.0.0.1:${QB_API_PORT:-8080}/health
```

后端正常情况下会返回：

```json
{"status":"ok","service":"qb_api_rust"}
```

## 5. 升级和重启

代码更新后重新部署前端：

```bash
git pull
docker compose --env-file .env -f docker-compose.prod.yml up -d --build web
```

如果后端也要更新，先在后端仓库构建新镜像，再拉起全部服务：

```bash
docker compose --env-file .env -f docker-compose.prod.yml up -d
```

如果镜像来自外部仓库：

```bash
docker compose --env-file .env -f docker-compose.prod.yml pull
docker compose --env-file .env -f docker-compose.prod.yml up -d
```

停止服务：

```bash
docker compose --env-file .env -f docker-compose.prod.yml down
```

如果连数据卷也一起删除（会丢失 PostgreSQL 数据和导出文件，请谨慎）：

```bash
docker compose --env-file .env -f docker-compose.prod.yml down -v
```

## 6. 运维说明

- 前端容器是无状态的，可以随时重建
- 对外提供服务时，建议在前面加 Nginx、Traefik 或云负载均衡，统一处理 HTTPS 和域名
- 如果使用反向代理统一入口，可以把前端和后端都放在同一域名下，通过路径分流
- 数据库备份和恢复请参考后端部署文档
