# 部署指南 (DEPLOYMENT.md)

本题库系统由两个仓库组成：

| 仓库 | 作用 | 构建产物 |
|---|---|---|
| `Question_DB/` | Rust 后端 API (axum + PostgreSQL) | 镜像 `qb_api:latest` |
| `Question_DB_Dashboard/` | React 前端 SPA (Vite + nginx) | 镜像 `qb_dashboard:latest` |

生产环境由三个服务组成：**db** (PostgreSQL) + **api** (qb_api) + **web** (nginx SPA)。完整的编排文件是 `Question_DB_Dashboard/docker-compose.prod.yml`（含 db+api+web），从本仓库部署。

> `Question_DB/docker-compose.prod.yml` 只含 db+api，用于单独构建/测试后端镜像。

---

## 0. 前置条件

- Docker ≥ 24 与 Docker Compose v2
- 两个仓库都需 checkout 到本地（构建镜像时需要）
- （可选）一个反向代理（nginx / Caddy）用于子路径部署与 HTTPS

---

## 1. 构建镜像

### 后端镜像（一次）

```bash
cd Question_DB
docker build -t qb_api:latest .
```

多阶段构建：`rust:1-bookworm` 编译 release 二进制 → `postgres:16-bookworm` 运行时（含 `psql`/`pg_dump`）。入口脚本会在启动时自动应用 `migrations/*.sql`。

### 前端镜像（每次发布）

```bash
cd Question_DB_Dashboard
docker build -t qb_dashboard:latest .
```

`VITE_API_BASE` 与 `QB_BASE_PATH` **在容器启动时**通过 `docker-entrypoint.sh` 占位符替换注入，因此同一镜像可部署到不同地址（无需为每个环境重新构建）。运行时传入对应环境变量即可。

---

## 2. 配置 `.env`

```bash
cd Question_DB_Dashboard
cp .env.example .env
```

**必须修改的密钥**（生成随机串，例如 `openssl rand -hex 32`）：

| 变量 | 说明 |
|---|---|
| `POSTGRES_PASSWORD` | 数据库密码 |
| `QB_DATABASE_URL` | 必须 = `postgres://<POSTGRES_USER>:<POSTGRES_PASSWORD>@db:5432/<POSTGRES_DB>`，密码要和 `POSTGRES_PASSWORD` 完全一致 |
| `QB_JWT_SECRET` | JWT 签名密钥，泄露等于全部 token 可伪造 |

完整变量说明见文末[环境变量参考](#5-环境变量参考)。

---

## 3. 部署拓扑

根据前端访问 API 的方式，选一种：

### 拓扑 A — 子路径 + 反向代理（生产推荐，即 cphos.cn 的做法）

浏览器统一从 `https://cphos.cn/question_db/...` 访问：静态资源走 `/question_db/`，API 走 `/question_db/api/`。前端容器内的 nginx 只负责吐 SPA，`/question_db/api/*` 由**外部反向代理**转发到 api 容器。

`.env` 关键项：
```ini
VITE_API_BASE=/question_db/api
QB_BASE_PATH=/question_db
QB_WEB_PORT=8080          # 内部端口，由反向代理访问；可不映射到主机
QB_CORS_ORIGINS=          # 同源，留空
```

外部 nginx 反向代理示例：
```nginx
server {
    listen 443 ssl http2;
    server_name cphos.cn;

    # API：剥离 /question_db/api 前缀后转发到 api 容器
    location /question_db/api/ {
        rewrite ^/question_db/api(/.*)$ $1 break;
        proxy_pass http://127.0.0.1:8080;   # api 容器映射的主机端口（QB_API_PORT）
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 32m;           # 题目上传限制
    }

    # 前端 SPA 与静态资源
    location /question_db/ {
        proxy_pass http://127.0.0.1:8088/;  # web 容器映射的主机端口（QB_WEB_PORT）
        proxy_set_header Host              $host;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    }
}
```

> 注意：审计日志依赖 `X-Forwarded-For` 记录真实客户端 IP，请务必传递该头（如上）。

### 拓扑 B — 直连 / 本地开发

前端和 API 分别暴露不同主机端口，浏览器跨端口调用 API（CORS）。

`.env` 关键项：
```ini
VITE_API_BASE=http://localhost:8080
QB_BASE_PATH=
QB_API_PORT=8080
QB_WEB_PORT=8088
QB_CORS_ORIGINS=http://localhost:8088
```

---

## 4. 启动与运维

### 启动完整栈

```bash
cd Question_DB_Dashboard
docker compose -f docker-compose.prod.yml up -d
```

数据持久化在三个命名卷：`qb_postgres_data`、`qb_object_store`、`qb_exports`。

### 验证

```bash
docker compose -f docker-compose.prod.yml ps        # 三个服务应 healthy
curl -fsS http://localhost:8080/health              # {"status":"ok","service":"qb_api_rust"}
```

首次启动会在 `users` 表为空时自动创建管理员 `admin / changeme`，**登录后立即在「个人资料」改密码**。

### 更新版本

```bash
# 后端
cd Question_DB && docker build -t qb_api:latest . && cd ../Question_DB_Dashboard
# 前端
docker build -t qb_dashboard:latest .
# 重启（数据库卷保留）
docker compose -f docker-compose.prod.yml up -d
```

### 备份与恢复

管理后台「运维操作」页提供：
- 数据库备份下载（`pg_dump` tar.gz）
- 数据库恢复上传
- 题库导出（JSONL / CSV）
- API 审计日志查询与 CSV 导出（管理员可见）

命令行备份示例：
```bash
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U qb -d qb -Fc -f /tmp/qb.dump
docker compose -f docker-compose.prod.yml cp db:/tmp/qb.dump ./qb.dump
```

### 本地原生开发（不走 Docker）

后端：`cd Question_DB && cargo run`（参考 `Question_DB/.env.example`，连本地 Postgres）。
前端：`cd Question_DB_Dashboard && pnpm install && pnpm dev`（Vite 默认 5173，API 指向本地后端）。

---

## 5. 环境变量参考

| 变量 | 默认 | 说明 |
|---|---|---|
| `POSTGRES_DB` | — | 数据库名 |
| `POSTGRES_USER` | — | 数据库用户 |
| `POSTGRES_PASSWORD` | — | 数据库密码（必改） |
| `QB_POSTGRES_MAJOR` | `16` | PostgreSQL 大版本 |
| `QB_DATABASE_URL` | — | API 连接串，密码须与上者一致（必改） |
| `QB_JWT_SECRET` | — | JWT 签名密钥（必改） |
| `QB_API_PORT` | `8080` | api 容器映射到的主机端口 |
| `QB_MAX_DB_CONNECTIONS` | `20` | 连接池上限 |
| `QB_EXPORT_DIR` | `/var/lib/qb/exports` | 导出/备份目录（容器内） |
| `QB_OBJECT_STORE_DIR` | `/var/lib/qb/objects` | 题目文件存储目录（容器内） |
| `QB_CORS_ORIGINS` | 空 | 逗号分隔的允许源；同源留空 |
| `VITE_API_BASE` | — | 浏览器访问 API 的基地址（运行时注入） |
| `QB_BASE_PATH` | 空 | SPA 部署子路径，如 `/question_db` |
| `QB_WEB_PORT` | `80` | web 容器映射到的主机端口 |
| `QB_API_IMAGE` / `QB_API_TAG` | `qb_api` / `latest` | 后端镜像 |
| `QB_WEB_IMAGE` / `QB_WEB_TAG` | `qb_dashboard` / `latest` | 前端镜像 |

### 仅本地原生开发（`cargo run`，非 compose）

| 变量 | 说明 |
|---|---|
| `QB_BIND_ADDR` | 监听地址，默认 `127.0.0.1:8080` |
| `QB_SKIP_MIGRATIONS` | =1 时跳过迁移（compose 入口脚本读取） |

---

## 常见问题

- **前端能打开但 API 报 401/CORS**：检查 `VITE_API_BASE` 是否与浏览器实际请求地址一致；跨端口时 `QB_CORS_ORIGINS` 必须包含前端源。
- **API 启动报数据库认证失败**：`QB_DATABASE_URL` 里的密码与 `POSTGRES_PASSWORD` 不一致，或旧卷里残留了不同密码的旧数据（删卷重来：`docker compose down -v`，**会清空数据**）。
- **子路径下刷新 404**：外部反向代理没有把 `/question_db/` 全部转发到 web 容器（SPA fallback 需要）。
- **审计日志里 IP 都是同一个**：反向代理没传 `X-Forwarded-For`；中间件会优先读该头。
