# API Documentation (Merged)

This file merges all API docs under src/api without omission.

---

## Source: src/api/admin/API.md

# Admin API

管理员接口用于查看软删除数据、恢复软删除记录、执行最终垃圾回收，以及用户管理。

说明：

- 所有 `/admin/*` 接口需要 `admin` 角色的 JWT access token
- 通过 `Authorization: Bearer <token>` 头传递认证信息
- `deleted_by` 返回执行删除操作的用户 UUID（鉴权上线前创建的记录该字段为 `null`）

## Endpoints

### `GET /admin/questions`

按条件分页查询题目，支持查看活跃、已删除或全部记录。

支持的 query 参数：

- `state`
  - `active` | `deleted` | `all`
  - 默认 `all`
- `paper_id`
- `category`
- `tag`
- `score_min`
- `score_max`
- `difficulty_tag`
- `difficulty_min`
- `difficulty_max`
- `q`
- `limit`（默认 20，最大 100）
- `offset`（默认 0）

响应格式（分页包裹）：

```json
{
  "items": [ ... ],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

`items` 中每个元素在普通题目摘要字段之外追加：

- `deleted_at`
- `deleted_by`
- `is_deleted`

### `GET /admin/questions/{question_id}`

返回单个题目的完整详情，不区分是否已软删除。

返回值会在普通题目详情字段之外追加：

- `deleted_at`
- `deleted_by`
- `is_deleted`

### `POST /admin/questions/{question_id}/restore`

恢复一个已软删除的题目。

- 如果题目不存在，返回 `404`
- 如果题目未被软删除，返回 `409`

成功时返回恢复后的管理员题目详情。

### `GET /admin/papers`

按条件分页查询试卷，支持查看活跃、已删除或全部记录。

支持的 query 参数：

- `state`
  - `active` | `deleted` | `all`
  - 默认 `all`
- `question_id`
- `category`
- `tag`
- `q`
- `limit`（默认 20，最大 100）
- `offset`（默认 0）

响应格式（分页包裹）：

```json
{
  "items": [ ... ],
  "total": 12,
  "limit": 20,
  "offset": 0
}
```

`items` 中每个元素在普通试卷摘要字段之外追加：

- `deleted_at`
- `deleted_by`
- `is_deleted`

### `GET /admin/papers/{paper_id}`

返回单个试卷的完整详情，不区分是否已软删除。

返回值会在普通试卷详情字段之外追加：

- `deleted_at`
- `deleted_by`
- `is_deleted`

### `POST /admin/papers/{paper_id}/restore`

恢复一个已软删除的试卷。

- 如果试卷不存在，返回 `404`
- 如果试卷未被软删除，返回 `409`
- 如果试卷引用了已删除题目，或这些题目当前不再满足试卷创建约束，返回 `409`

成功时返回恢复后的管理员试卷详情。

### `POST /admin/garbage-collections/preview`

预演垃圾回收，但不会真正提交删除。

请求体：

```json
{}
```

返回值：

```json
{
  "dry_run": true,
  "deleted_questions": 13,
  "deleted_papers": 4,
  "deleted_objects": 45,
  "freed_bytes": 1711558
}
```

语义：

- 会统计当前所有可安全硬删除的软删除题目
- 会统计当前所有软删除试卷
- 会统计这些硬删除后会变成无引用的 `objects`，以及已经存在的孤儿 `objects`
- 整个流程在事务里回滚，因此只提供精确预览，不会改数据

### `POST /admin/garbage-collections/run`

真正执行垃圾回收。

请求体与返回值格式和 `preview` 相同，只是 `dry_run = false`。

执行顺序：

1. 硬删除已软删除试卷
2. 硬删除不再被未删除试卷引用的已软删除题目
3. 删除所有无任何引用的 `objects`

---

## 用户管理

### `GET /admin/users`

分页列出所有用户。

支持的 query 参数：

- `limit`（默认 20，最大 100）
- `offset`（默认 0）

响应格式（分页包裹）：

```json
{
  "items": [
    {
      "user_id": "...",
      "username": "admin",
      "display_name": "Administrator",
      "role": "admin",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

### `POST /admin/users`

创建新用户。

请求体：

```json
{
  "username": "alice",
  "password": "secure-password",
  "display_name": "Alice",
  "role": "editor"
}
```

- `username`: 必填，唯一
- `password`: 必填，至少 6 个字符
- `display_name`: 可选，默认空字符串
- `role`: 可选，默认 `viewer`，可选值 `viewer` / `editor` / `admin`

成功返回用户信息（同列表中的 item 格式）。

错误：

- `400`: 参数校验失败
- `409`: 用户名已存在

### `PATCH /admin/users/{user_id}`

更新用户信息。至少提供一个字段。

请求体（均为可选）：

```json
{
  "display_name": "New Name",
  "role": "admin",
  "is_active": false
}
```

错误：

- `400`: 无可更新字段 / 角色值无效 / 尝试停用自己
- `404`: 用户不存在

### `DELETE /admin/users/{user_id}`

停用用户（软删除），同时撤销其所有 refresh token。

- 不允许停用自己
- 返回 `{ "message": "user deactivated" }`

错误：

- `400`: 尝试删除自己
- `404`: 用户不存在

---

## Source: src/api/auth/API.md

# Auth API

认证和授权接口，基于 JWT access token + 不透明 refresh token。

## 概述

- **Access Token**: JWT (HS256)，有效期 30 分钟，通过 `Authorization: Bearer <token>` 头传递
- **Refresh Token**: 不透明 UUID 字符串，有效期 7 天，支持一次性消费（轮换）
- **密码存储**: Argon2id
- **角色**: `viewer`（只读）、`editor`（读写+ops）、`admin`（全部权限+用户管理）

## 权限矩阵

| 端点分组 | 公开 | viewer | editor | admin |
|---|:---:|:---:|:---:|:---:|
| `GET /health` | ✅ | ✅ | ✅ | ✅ |
| `POST /auth/login` | ✅ | - | - | - |
| `POST /auth/refresh` | ✅ | - | - | - |
| `GET /auth/me` | - | ✅ | ✅ | ✅ |
| `PATCH /auth/me/password` | - | ✅ | ✅ | ✅ |
| `POST /auth/logout` | - | ✅ | ✅ | ✅ |
| `GET /questions`, `GET /papers` | - | ✅ | ✅ | ✅ |
| `GET /questions/:id`, `GET /papers/:id` | - | ✅ | ✅ | ✅ |
| `POST/PATCH/DELETE/PUT` questions | - | ❌ | ✅ | ✅ |
| `POST/PATCH/DELETE/PUT` papers | - | ❌ | ✅ | ✅ |
| `POST` ops (bundles/exports/quality) | - | ❌ | ✅ | ✅ |
| `/admin/*` | - | ❌ | ❌ | ✅ |

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `QB_JWT_SECRET` | `qb-dev-secret-change-me-in-production` | JWT 签名密钥，**生产环境必须修改** |

## 初始账号

首次启动时，如果 `users` 表为空，会自动创建一个管理员账号：

- 用户名: `admin`
- 密码: `changeme`
- 角色: `admin`

**首次登录后应立即修改密码。**

## Endpoints

### `POST /auth/login`

用户名密码登录。

请求体：

```json
{
  "username": "admin",
  "password": "changeme"
}
```

成功响应 (`200`)：

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "550e8400-e29b-41d4-a716-446655440000",
  "token_type": "Bearer",
  "expires_in": 1800
}
```

错误：

- `400`: 缺少用户名或密码
- `401`: 用户名或密码错误 / 账号已停用

### `POST /auth/refresh`

使用 refresh token 获取新 token 对。旧 refresh token 在消费后立即作废（轮换）。

请求体：

```json
{
  "refresh_token": "550e8400-e29b-41d4-a716-446655440000"
}
```

成功响应同 login。

错误：

- `400`: 缺少 refresh_token
- `401`: 无效或过期的 refresh token / 账号停用

### `POST /auth/logout`

撤销当前 refresh token。

请求体：

```json
{
  "refresh_token": "550e8400-e29b-41d4-a716-446655440000"
}
```

响应 (`200`)：

```json
{
  "message": "logged out"
}
```

### `GET /auth/me`

获取当前登录用户信息。

需要 `Authorization: Bearer <access_token>`。

响应 (`200`)：

```json
{
  "user_id": "...",
  "username": "admin",
  "display_name": "Administrator",
  "role": "admin",
  "is_active": true,
  "created_at": "2025-01-01T00:00:00.000Z",
  "updated_at": "2025-01-01T00:00:00.000Z"
}
```

### `PATCH /auth/me/password`

修改当前用户密码。

请求体：

```json
{
  "old_password": "changeme",
  "new_password": "new-secure-password"
}
```

响应 (`200`)：

```json
{
  "message": "password changed"
}
```

错误：

- `400`: 新密码少于 6 个字符
- `401`: 旧密码错误

---

## Source: src/api/ops/API.md

# Ops API

鉴权要求：需要 `editor` 及以上角色，所有请求需携带 `Authorization: Bearer <access_token>` 头。

## Endpoints

题目和试卷的批量打包下载接口见：

- [Questions API](../questions/API.md)
- [Papers API](../papers/API.md)
- [Admin API](../admin/API.md)

### `POST /exports/run`

导出题目数据。

说明：

- 只导出未软删除题目
- `output_path` 是相对于 `QB_EXPORT_DIR` 的路径；不传时使用默认路径
- `format` 支持 `jsonl` 和 `csv`
- `public` 为 `true` 时不包含 tex 源码

请求体：

```json
{
  "format": "jsonl",
  "public": false,
  "output_path": "exports/question_bank_internal.jsonl"
}
```

成功响应：

```json
{
  "format": "jsonl",
  "public": false,
  "output_path": "/absolute/path/to/exports/question_bank_internal.jsonl",
  "exported_questions": 42
}
```

### `POST /quality-checks/run`

运行数据质量检查，并把结果写到指定文件。

说明：

- 只检查未软删除题目和未软删除试卷
- `output_path` 是相对于 `QB_EXPORT_DIR` 的路径；不传时使用默认路径

请求体：

```json
{
  "output_path": "exports/quality_report.json"
}
```

成功响应：

```json
{
  "output_path": "/absolute/path/to/exports/quality_report.json",
  "report": { ... }
}
```

---

## Source: src/api/papers/API.md

# Papers API

鉴权要求：
- `GET` 操作：需要 `viewer` 及以上角色
- `POST / PATCH / DELETE / PUT` 操作：需要 `editor` 及以上角色
- 所有请求需携带 `Authorization: Bearer <access_token>` 头

## Endpoints

### `POST /papers`

创建试卷，并按 `question_ids` 的顺序写入题目关联。

请求格式：`multipart/form-data`

字段说明：

- `file`: 必填，试卷附加 zip 文件；服务端会校验它是合法 zip，但暂时不检查内部结构
- `description`: 必填，非空字符串；会参与 bundle 目录命名，因此不能包含 `/ \\ : * ? " < > |`，不能是 `.`、`..`，也不能以 `.` 结尾
- `title`: 必填，非空字符串
- `subtitle`: 必填，非空字符串
- `question_ids`: 必填，JSON 字符串数组，例如 `["uuid-1","uuid-2"]`
  - 这些题目必须全部属于同一类：要么全部是 `T`，要么全部是 `E`
  - 每道题的 `status` 必须是 `reviewed` 或 `used`

说明：

- 命题人（`author`）和审题人（`reviewers`）已移至题目级别，组卷 bundle 时会自动从题目中汇总去重

示例：

```bash
curl -X POST http://127.0.0.1:8080/papers \
  -F 'description=综合训练试卷 A' \
  -F 'title=综合训练 2026 A 卷' \
  -F 'subtitle=校内选拔 初版' \
  -F 'question_ids=["uuid-1","uuid-2"]' \
  -F 'file=@paper_appendix.zip;type=application/zip'
```

### `GET /papers`

按条件分页查询试卷，搜索也统一走这个接口。

说明：

- 只返回未软删除试卷

支持的 query 参数：

- `question_id`
- `category`
- `tag`
- `q`
  关键词会模糊匹配 `description`、`title`、`subtitle`
- `limit`（默认 20，最大 100）
- `offset`（默认 0）

响应格式（分页包裹）：

```json
{
  "items": [ ... ],
  "total": 12,
  "limit": 20,
  "offset": 0
}
```

### `GET /papers/{paper_id}`

返回试卷详情和按顺序展开后的题目摘要。

说明：

- 只返回未软删除试卷

### `PATCH /papers/{paper_id}`

部分更新试卷 metadata 和题目列表。

支持字段：

- `description`
- `title`
- `subtitle`
- `question_ids`

其中：

- `description` 如果出现在更新请求里，必须是非空字符串，并且同样要满足文件名安全限制
- `title` / `subtitle` 如果出现在更新请求里，必须是非空字符串
- `question_ids` 如果出现在更新请求里，必须是非空 UUID 字符串数组；成功后会按数组顺序重排题目
- 更新请求会校验试卷更新后的整套题目：
  - `category` 必须全部同为 `T` 或全部同为 `E`
  - 每道题的 `status` 必须是 `reviewed` 或 `used`
- 已软删除试卷会被视为不存在，返回 `404`

成功时返回更新后的完整试卷详情。

### `PUT /papers/{paper_id}/file`

使用 `multipart/form-data` 覆盖试卷当前的附加 zip 文件，只更新文件，不修改 metadata 或题目列表。

- 字段名：`file`
- 必须是合法 zip
- 大小限制：20 MiB
- 成功后会：
  - 新写入一个 appendix object
  - 更新 `append_object_id`
  - 删除旧的 appendix object
  - 更新 `updated_at`
- 已软删除试卷会被视为不存在，返回 `404`

成功响应：

```json
{
  "paper_id": "uuid",
  "file_name": "paper_appendix_v2.zip",
  "status": "replaced"
}
```

### `DELETE /papers/{paper_id}`

软删除试卷。

语义：

- 只会更新 `deleted_at` / `deleted_by` / `updated_at`
- 不会立刻删除 appendix binary；最终清理由管理员垃圾回收接口处理
- 已软删除试卷会被视为不存在，重复删除返回 `404`

成功响应：

```json
{
  "paper_id": "uuid",
  "status": "deleted"
}
```

### `POST /papers/bundles`

按给定试卷列表批量打包下载。

请求体：

```json
{
  "paper_ids": ["uuid-1", "uuid-2"]
}
```

返回值：

- 响应体是一个 `application/zip`
- zip 根目录包含 `manifest.json`
- 每个试卷使用 `description_uuid前缀/` 目录分组，例如 `热学决赛卷_550e84/`
- 每个试卷目录下包含：
  - `append.zip`
  - `main.tex`
  - 单个合并后的 `assets/` 目录
- `main.tex` 基于内置的 `CPHOS-Latex` 理论/实验 `example-paper.tex` 模板生成
- 题目会按试卷中的顺序依次注入 `main.tex`
- 每道题原始 tex 中的 `\includegraphics` 资源引用会被改写到合并后的 `assets/` 目录
- 每道题内部的 `\label` / `\ref` / `\eqref` 等标签会按 `p1-`、`p2-` 这样的前缀重写，避免跨题冲突
- 命题人（`author`）和审题人（`reviewers`）从试卷包含的题目中自动汇总：
  - 命题人按题目顺序去重
  - 审题人从所有题目中收集去重
- 已软删除试卷不能通过这个接口下载

---

## Source: src/api/questions/API.md

# Questions API

鉴权要求：
- `GET` 操作：需要 `viewer` 及以上角色
- `POST / PATCH / DELETE / PUT` 操作：需要 `editor` 及以上角色
- 所有请求需携带 `Authorization: Bearer <access_token>` 头

## Endpoints

### `POST /questions`

使用 `multipart/form-data` 上传单题 zip 压缩包。

- 字段名：`file`
- 必填字段：`description`
  - 必须是非空字符串
  - 支持中文
  - 不能包含 `/ \\ : * ? " < > |`
  - 不能是 `.`、`..`，也不能以 `.` 结尾
- 必填字段：`difficulty`
  - 传 JSON 字符串
  - 必须至少包含 `human`
  - 每个 tag 的值形如 `{ "score": 7, "notes": "sample" }`
- 可选字段：`category`
  - `none` | `T` | `E`
- 可选字段：`tags`
  - 传 JSON 字符串数组
  - 会去重；`[]` 表示创建时无标签
- 可选字段：`status`
  - `none` | `reviewed` | `used`
- 可选字段：`author`
  - 命题人，字符串
  - 默认空串
- 可选字段：`reviewers`
  - 审题人列表，传 JSON 字符串数组
  - 会去重；默认 `[]`
- 大小限制：20 MiB
- zip 根目录必须包含且只包含：
  - 恰好一个 `.tex` 文件
  - 恰好一个 `assets/` 目录
- 如果未传可选 metadata，则默认：
  - `category = "none"`
  - `tags = []`
  - `status = "none"`
  - `author = ""`
  - `reviewers = []`
- `created_at = NOW()`
- `score` 会自动从 tex 文件中的 `\begin{problem}[<score>]` 标记提取
  - 整数类型
  - 如果 tex 中不包含该标记，则为 `null`
  - 不支持通过 PATCH 手动更新

成功响应：

```json
{
  "question_id": "uuid",
  "file_name": "question.zip",
  "imported_assets": 2,
  "status": "imported"
}
```

### `PATCH /questions/{question_id}`

使用 JSON 请求体更新题目的 metadata，支持部分更新。

- 服务端会先锁定目标题目的主记录；同一题目的 metadata 更新、文件替换和删除会串行执行，避免并发重建 `tags` / `difficulty` 时出现竞态
- 已软删除题目会被视为不存在，返回 `404`

支持字段：

- `category`: `none` | `T` | `E`
- `description`: 非空字符串，不能传 `null` 或空串
  - 同样不能包含 `/ \\ : * ? " < > |`
- `tags`: 字符串数组，会去重；空数组表示清空
- `status`: `none` | `reviewed` | `used`
- `difficulty`: 对象
  - key 是 difficulty tag，例如 `human`、`heuristic`
  - value 形如 `{ "score": 7, "notes": "sample" }`
  - `score` 必须是 `1..=10`
  - `notes` 可选；空串会规范化为 `null`
  - 如果传了 `difficulty`，会整体替换整组 difficulty
  - `difficulty` 必须至少包含 `human`
- `author`: 命题人，字符串
- `reviewers`: 审题人列表，字符串数组，会去重

成功时返回更新后的完整题目详情。

### `PUT /questions/{question_id}/file`

使用 `multipart/form-data` 覆盖题目的当前 zip 文件内容，只更新文件，不修改 metadata。

- 字段名：`file`
- 大小限制：20 MiB
- zip 根目录必须包含且只包含：
  - 恰好一个 `.tex` 文件
  - 恰好一个 `assets/` 目录
- 成功后会：
  - 删除题目当前关联的 tex / asset 文件对象
  - 写入新 zip 中的 tex / asset 文件
  - 更新 `source_tex_path`
  - 重新提取 `score`（从新 tex 文件的 `\begin{problem}[<score>]`）
  - 更新 `updated_at`
- 原有 metadata 会保留：
  - `category`
  - `description`
  - `author`
  - `reviewers`
  - `tags`
  - `status`
  - `difficulty`
- 已软删除题目会被视为不存在，返回 `404`

成功响应：

```json
{
  "question_id": "uuid",
  "file_name": "question_v2.zip",
  "source_tex_path": "main.tex",
  "imported_assets": 3,
  "status": "replaced"
}
```

### `DELETE /questions/{question_id}`

软删除题目。

语义：

- 只会更新 `deleted_at` / `deleted_by` / `updated_at`
- 不会立刻删除题目 binary；最终清理由管理员垃圾回收接口处理
- 已软删除题目会被视为不存在，重复删除返回 `404`
- 如果题目仍被任意未软删除试卷引用，返回 `409`

成功响应：

```json
{
  "question_id": "uuid",
  "status": "deleted"
}
```

### `GET /questions`

按条件分页查询题目，搜索也统一走这个接口。

说明：

- 只返回未软删除题目

支持的 query 参数：

- `paper_id`
- `category`
- `tag`
- `score_min`
- `score_max`
- `difficulty_tag`
- `difficulty_min`
- `difficulty_max`
- `q`
  关键词搜索，只会匹配 `description`
- `limit`（默认 20，最大 100）
- `offset`（默认 0）

说明：

- `score_min` / `score_max` 可单独使用，也可组合使用
- `score_min` 必须 ≤ `score_max`（如同时提供）
- `difficulty_min` / `difficulty_max` 需要和 `difficulty_tag` 一起使用
- difficulty 过滤会匹配指定 tag 上的 score 范围

响应格式（分页包裹）：

```json
{
  "items": [ ... ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

### `GET /questions/{question_id}`

返回单个题目的完整 metadata、文件引用和所属试卷。

说明：

- 只返回未软删除题目
- 返回的 `papers` 只包含未软删除试卷

### `POST /questions/bundles`

按给定题目列表批量打包下载。

请求体：

```json
{
  "question_ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

返回值：

- 响应体是一个 `application/zip`
- zip 根目录包含 `manifest.json`
- 每个题目使用 `description_uuid前缀/` 目录分组，例如 `热学标定 gamma_550e84/`
- 目录内包含原始 `.tex` 和 `assets/` 资源文件
- 已软删除题目不能通过这个接口下载

---

## Source: src/api/system/API.md

# System API

## 错误格式

所有接口在发生业务错误时统一返回 JSON 格式：

```json
{
  "error": "错误描述"
}
```

HTTP 状态码含义：

- `400` 请求参数不合法
- `401` 未认证（缺少或无效的 access token）
- `403` 无权限（角色不满足要求）
- `404` 资源不存在（或已软删除）
- `409` 操作冲突（如删除仍被引用的题目、恢复未被删除的记录等）
- `500` 内部错误
- `503` 服务不可用（数据库不可达）

## Endpoints

### `GET /health`

健康检查接口。会执行一次数据库连通性探测：

- 成功时返回 `200`：

```json
{
  "status": "ok",
  "service": "qb_api_rust"
}
```

- 数据库不可达时返回 `503`：

```json
{
  "error": "database is unreachable"
}
```

