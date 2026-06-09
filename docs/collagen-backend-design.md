# 胶原项目后端数据结构设计

## 目标

将胶原项目管理从浏览器 `localStorage` 升级为后端持久化数据，支持多人协作、权限管理、历史追踪和后续移动端/小程序接入。

当前前端已经具备：

- 胶原项目总看板
- 机构详情与状态编辑
- 新增机构
- 跟进清单
- 跟进完成记录
- 归档/恢复
- 月度复盘
- Excel 导入/导出

后端升级的第一阶段建议继续沿用现有 Express + better-sqlite3 架构。

## 数据表设计

### collagen_projects

存储单家机构项目的当前状态。

```sql
CREATE TABLE IF NOT EXISTS collagen_projects (
  id TEXT PRIMARY KEY,
  archived_at DATETIME,
  name TEXT NOT NULL,
  city TEXT,
  owner TEXT NOT NULL,
  source TEXT,
  stage TEXT NOT NULL CHECK(stage IN ('线索', '待资料', '待启动会', '已签约', '已发货', '30天追踪', '复购判断', '样板沉淀', '暂停')),
  decision TEXT NOT NULL CHECK(decision IN ('复购', '续费陪跑', '二次启动', '样板沉淀', '普通维护', '暂停观察')),
  risk TEXT NOT NULL CHECK(risk IN ('低', '中', '高')),
  score INTEGER DEFAULT 0 CHECK(score >= 0 AND score <= 100),
  shipped_at TEXT,
  day30_status TEXT NOT NULL CHECK(day30_status IN ('未开始', '进行中', '已复盘', '暂停')),
  doctor_training TEXT NOT NULL CHECK(doctor_training IN ('未排期', '已排期', '已完成')),
  cases INTEGER DEFAULT 0,
  authorized_cases INTEGER DEFAULT 0,
  content_count INTEGER DEFAULT 0,
  geo_change INTEGER DEFAULT 0,
  next_action TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

建议索引：

```sql
CREATE INDEX IF NOT EXISTS idx_collagen_projects_owner ON collagen_projects(owner);
CREATE INDEX IF NOT EXISTS idx_collagen_projects_stage ON collagen_projects(stage);
CREATE INDEX IF NOT EXISTS idx_collagen_projects_risk ON collagen_projects(risk);
CREATE INDEX IF NOT EXISTS idx_collagen_projects_archived_at ON collagen_projects(archived_at);
```

### collagen_follow_up_logs

存储每次完成跟进后的历史记录。

```sql
CREATE TABLE IF NOT EXISTS collagen_follow_up_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  owner TEXT NOT NULL,
  completed_action TEXT NOT NULL,
  result TEXT NOT NULL,
  next_action TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES collagen_projects(id) ON DELETE CASCADE
);
```

建议索引：

```sql
CREATE INDEX IF NOT EXISTS idx_collagen_follow_up_logs_project_id ON collagen_follow_up_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_collagen_follow_up_logs_completed_at ON collagen_follow_up_logs(completed_at);
CREATE INDEX IF NOT EXISTS idx_collagen_follow_up_logs_owner ON collagen_follow_up_logs(owner);
```

### collagen_project_import_batches

记录每次 Excel 导入批次，便于回溯数据来源。

```sql
CREATE TABLE IF NOT EXISTS collagen_project_import_batches (
  id TEXT PRIMARY KEY,
  filename TEXT,
  imported_by TEXT,
  total_rows INTEGER DEFAULT 0,
  success_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## REST API 设计

统一响应格式沿用现有项目：

```ts
{
  code: number
  message: string
  data: T
}
```

### 项目列表

`GET /api/collagen-projects`

查询参数：

| 参数 | 说明 |
|---|---|
| `stage` | 阶段筛选 |
| `risk` | 风险筛选 |
| `owner` | 负责人筛选 |
| `archiveStatus` | `active` / `archived` / `all` |
| `page` / `pageSize` | 分页 |

返回：

```ts
{
  list: CollagenProjectInstitution[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
```

### 项目详情

`GET /api/collagen-projects/:id`

返回项目详情，并包含 `followUpLogs`。

### 新增项目

`POST /api/collagen-projects`

创建新机构项目。

### 更新项目

`PATCH /api/collagen-projects/:id`

用于详情页编辑阶段、风险、评分、病例、下一步动作等字段。

### 归档与恢复

```http
POST /api/collagen-projects/:id/archive
POST /api/collagen-projects/:id/restore
```

归档只写入 `archived_at`，不删除项目。

### 完成跟进

`POST /api/collagen-projects/:id/follow-ups`

请求体：

```ts
{
  result: string
  nextAction: string
}
```

后端事务逻辑：

1. 读取当前项目 `next_action`。
2. 写入 `collagen_follow_up_logs.completed_action`。
3. 更新项目 `next_action` 为新的下一步。
4. 更新 `updated_at`。

### 跟进清单

`GET /api/collagen-projects/follow-ups`

后端可返回按优先级排序后的清单，也可先返回原始项目，由前端继续排序。第一阶段建议后端直接返回排序结果，便于多人端保持一致。

### 月度复盘

`GET /api/collagen-projects/monthly-review`

返回：

```ts
{
  metrics: CollagenProjectMetrics
  stageSummary: Array<{ stage: string; count: number }>
  ownerSummary: Array<{
    owner: string
    total: number
    highRisk: number
    repurchase: number
    sampleReady: number
    followUpLogs: number
    avgScore: number
  }>
  blockedProjects: CollagenProjectInstitution[]
  opportunityProjects: CollagenProjectInstitution[]
}
```

## 前端迁移步骤

第一阶段保留 `localStorage` 作为兜底，增加 API 模式：

1. 新增 `src/api/collagenProjects.ts`。
2. 在 `useCollagenProjectsStore` 中增加 `loadProjects()`、`saveProject()`、`createProject()` API 调用。
3. 页面初始化时优先请求 API。
4. API 请求失败时回退到当前本地数据，避免页面不可用。
5. Excel 导入后调用批量保存接口。

第二阶段移除本地持久化：

1. 删除 store 中对 `localStorage` 的主路径依赖。
2. 将导入、编辑、跟进完成、归档恢复全部写入 API。
3. 增加接口错误提示和重试。

## 权限建议

第一阶段最小权限：

| 角色 | 权限 |
|---|---|
| `admin` | 全部项目、全部编辑、导入导出、归档恢复 |
| `manager` | 查看全部项目、编辑项目、查看复盘 |
| `sales` | 查看和编辑自己负责的项目、完成跟进 |

后端按 `owner` 或用户 ID 做数据范围控制。当前表里先保留 `owner` 文本字段，后续可增加 `owner_user_id` 外键关联 `users.id`。

## 实施顺序

建议拆成 4 个小 PR：

1. 数据库表与路由骨架  
   新增表结构、基础 CRUD API、健康检查。
2. 前端 store 接 API  
   让总看板、详情页、新增机构从 API 读写。
3. 跟进记录与归档 API  
   完成跟进日志、归档/恢复、跟进清单。
4. 月度复盘与导入导出 API  
   服务端汇总复盘数据，Excel 导入写入数据库。

## 风险与注意事项

- 当前浏览器 `localStorage` 中已有的数据不会自动进入数据库，需要做一次“本地数据迁移/导出再导入”。
- 如果多人同时编辑同一机构，后端需要以 `updated_at` 做乐观锁或最后写入提示。
- Excel 导入应采用 upsert 策略，建议按 `机构名称 + 城市` 或显式 `项目ID` 匹配。
- 跟进记录必须追加写，不应覆盖。
- 归档不等于删除，所有复盘报表默认排除归档项目，但可保留历史查询能力。
