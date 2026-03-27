# 🚀 部署指南

## 凭证信息

- **Cloudflare Account ID**: `f5f3956578d118a6398a891c3aca26053`
- **Cloudflare API Token**: `cfat_fxwNEtxjAIDVUeeX0pzgfofaXDlpwHlVKwGDz489c6740bda`

---

## 步骤一：添加 GitHub Secrets

Worker 的自动部署依赖 GitHub Secrets。

1. 进入仓库 **Settings → Secrets and variables → Actions → New repository secret**
2. 添加以下 Secret：

| Name | Value |
|------|-------|
| `CLOUDFLARE_API_TOKEN` | `cfat_fxwNEtxjAIDVUeeX0pzgfofaXDlpwHlVKwGDz489c6740bda` |

---

## 步骤二：连接 Cloudflare Pages（原生 GitHub 集成）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Pages**
2. 点击 **Create a project** → **Connect to Git**
3. 选择仓库 `liumc123/image-background-remover`
4. 配置构建：

| 设置项 | 值 |
|--------|----|
| **Production branch** | `main` |
| **Build command** | `npm run build` |
| **Build output directory** | `.next` |
| **Environment variables** | `NODE_VERSION = 20` |

5. 点击 **Save and Deploy**

> 以后 push 到 `main` 分支的前端代码会自动部署。

---

## 步骤三：验证 Worker 部署

Worker 代码在 `/worker` 目录，push 到 main 时 GitHub Actions 会自动部署。

手动验证：
```bash
cd worker
npx wrangler deploy --dry-run
```

---

## 架构

```
GitHub push (main)
    │
    ├── frontend/  ──→ Cloudflare Pages (原生 GitHub 集成)
    │
    └── worker/   ──→ GitHub Actions → Cloudflare Workers
```

- **前端**：使用 `@imgly/background-removal` 在浏览器内完成背景移除（纯客户端，无服务器依赖）
- **Worker**：`/worker` 目录，可选，用于需要服务端处理的场景
