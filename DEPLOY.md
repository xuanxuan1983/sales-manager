# 部署指南

## 1. 前端部署（Vercel）

### 方式 A：Vercel CLI（推荐）

```bash
# 1. 登录 Vercel
vercel login

# 2. 部署
vercel --prod
```

### 方式 B：GitHub 自动部署

1. 将代码推送到 GitHub
2. 访问 https://vercel.com/new
3. 导入 GitHub 仓库
4. 框架选择 "Vite"
5. 构建命令：`npm run build`
6. 输出目录：`dist`
7. 添加环境变量：`VITE_API_BASE_URL`
8. 点击 Deploy

### 方式 C：手动上传

1. 运行 `npm run build`
2. 将 `dist/` 目录内容上传到任何静态托管服务

## 2. API Server 部署

### 方式 A：Railway（推荐，免费）

1. 访问 https://railway.app
2. 新建项目，选择 "Deploy from GitHub repo"
3. 选择仓库
4. 设置启动命令：`npm run api`
5. 环境变量：PORT=3001
6. 部署后会获得 `https://xxx.railway.app` 地址

### 方式 B：Render（免费）

1. 访问 https://render.com
2. 新建 Web Service
3. 选择 GitHub 仓库
4. 构建命令：`npm install`
5. 启动命令：`npm run api`
6. 环境变量：PORT=10000（Render 默认）

### 方式 C：本地运行

```bash
npm run api
# 或
node server/index.cjs
```

默认 SQLite 数据库位于 `data/sales-manager.db`。如果部署平台文件系统不持久化，重启后数据可能丢失；生产环境建议配置持久化磁盘，或后续迁移到托管数据库。

## 3. 环境变量配置

部署后需要更新前端 API 地址：

| 环境 | 变量名 | 值 |
|-----|--------|-----|
| 开发 | VITE_API_BASE_URL | http://localhost:3001/api |
| 生产 | VITE_API_BASE_URL | https://your-api.example.com/api |

可参考 `.env.example`。生产环境请优先在 Vercel / Railway / Render 的环境变量面板中配置真实后端地址，不要把临时占位地址写入仓库。

如果前端和 API 不在同一个域名，必须配置 `VITE_API_BASE_URL`。未配置时，生产前端会默认请求同源 `/api`。

Vercel 的 SPA 兜底路由已排除 `/api/*`，所以同域部署或反向代理 API 时，`/api/health`、`/api/collagen-projects` 等接口不会被重写成前端页面。如果 API 部署在 Railway / Render 等独立域名，请继续在 Vercel 中配置 `VITE_API_BASE_URL` 指向真实后端。

## 4. 快速验证

部署完成后访问：
- 前端：https://你的前端地址
- 后端：https://你的后端地址/api/health

## 5. 替换真实数据

本地开发可通过以下方式维护数据：

- 胶原项目：在前端「数据导入」选择「胶原项目」批量导入 Excel。
- 产品/UDI 种子：编辑 `server/database.cjs` 中的初始数据。
- 回归验证：运行 `npm run test:collagen-api`。
