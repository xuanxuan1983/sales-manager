# 运维手册

这份手册用于日常运行胶原项目管理系统，重点覆盖本地启动、数据保护、验证和部署前检查。

## 1. 本地启动

安装依赖：

```bash
npm install
```

启动真实 API 和前端：

```bash
npm run dev:full
```

常用访问地址：

| 页面 | 地址 |
|---|---|
| 胶原项目总看板 | http://127.0.0.1:5173/collagen-projects |
| 胶原跟进清单 | http://127.0.0.1:5173/collagen-projects/follow-ups |
| 胶原月度复盘 | http://127.0.0.1:5173/collagen-projects/monthly-review |
| API 健康检查 | http://127.0.0.1:3001/api/health |

如果端口被占用，Vite 可能会自动切到 `5174`、`5175` 等端口。以终端输出的实际地址为准。

## 2. 连通性检查

前端和 API 启动后运行：

```bash
npm run check:local
```

如果前端端口不是默认的 `5173`：

```bash
FRONTEND_URL=http://127.0.0.1:5175 API_BASE_URL=http://127.0.0.1:3001/api npm run check:local
```

如果浏览器出现 `127.0.0.1 拒绝建立连接`，优先检查：

1. 是否已经运行 `npm run dev:full`
2. 当前 Vite 实际端口是否仍是 `5173`
3. `npm run check:local` 是否能通过
4. `http://127.0.0.1:3001/api/health` 是否返回 OK

## 3. 数据库与备份

默认数据库路径：

```text
data/sales-manager.db
```

生成本地数据库备份：

```bash
npm run backup:db
```

查看可恢复的备份：

```bash
npm run list:db-backups
```

恢复备份前先停止 API 服务，然后运行：

```bash
npm run restore:db -- backups/sales-manager-YYYYMMDD-HHMMSS.db
```

恢复脚本会先自动生成一份 `before-restore-*` 安全备份，再替换当前数据库。

## 4. 数据导入前后流程

导入或清空胶原项目数据前：

```bash
npm run backup:db
npm run list:db-backups
```

导入完成后：

```bash
npm run check:local
```

然后打开：

```text
http://127.0.0.1:5173/collagen-projects
```

确认机构数量、阶段分布、风险结构和跟进清单是否符合预期。

## 5. 完整验证

本地改动提交前运行：

```bash
npm run verify
```

该命令会依次执行：

```bash
npm run test:collagen-api
npm run test:local-stack
npm run test:db-backup-restore
npm run build
npm run check:deploy
```

如果只改文档，也建议至少运行：

```bash
npm run check:deploy
```

## 6. 部署前检查

生产部署前运行：

```bash
npm run build
npm run check:deploy
```

`check:deploy` 会检查：

- 关键 npm 脚本是否存在
- Vercel 构建命令和输出目录是否正确
- SPA fallback 是否排除 `/api/*`
- `.env.production` 是否没有提交激活的生产 API 地址
- `dist/` 产物是否没有打入占位 API 地址

## 7. GitHub 流程

推荐流程：

```bash
git status
npm run verify
git add .
git commit -m "说明这次改动"
git push
```

GitHub Actions 会自动运行完整 CI。只有 CI 通过后再合并 PR。

## 8. 常见问题

### 前端打不开

先运行：

```bash
npm run check:local
```

如果前端失败，检查 Vite 端口。如果 API 失败，检查 `npm run api` 或 `npm run dev:full` 是否仍在运行。

### 胶原项目数据不对

先不要继续导入，立即备份当前状态：

```bash
npm run backup:db
```

然后查看可恢复备份：

```bash
npm run list:db-backups
```

确认目标备份后，停止 API，再运行 `restore:db`。

### 部署后 API 返回前端页面

检查 `vercel.json` 中的 rewrite 是否仍排除 `/api/*`，并运行：

```bash
npm run check:deploy
```

### 生产 API 地址不对

不要把真实或临时生产 API 地址写进 `.env.production`。在 Vercel / Railway / Render 的环境变量面板中配置 `VITE_API_BASE_URL`。
