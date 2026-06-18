# Trace · 个人记录与 AI 复盘（Web / PWA）

本地优先的灵感 / 趣事 / 复盘记录工具。记录存于浏览器本地（IndexedDB），AI 复盘 / 周报 / 转写经 Vercel Serverless 代理调用，API Key 不暴露在前端。技术栈：Next.js（App Router）+ React + TypeScript。

## 功能

- 卡片流首页：分类筛选（复盘 / 灵感 / 趣事）+ 关键词搜索
- 快速记录：文字 / 语音录音（MediaRecorder），音频与文本都本地保留
- 图片记录：拍照或从相册选图，**本地压缩后存入 IndexedDB（不上传）**，单条最多 4 张、可删、详情可全屏查看
- 语音转写：浏览器自带 **Web Speech API**，边说边出字，本地实时、零服务器成本（iOS Safari 支持有限，自动降级为手动输入）
- 优化表达：记录框「✨ 优化表达」按钮，用 AI 把口语化 / 零散文字梳理通顺
- AI 结构化复盘：单条 / 多条合并，模板 A（成长型）/ B（目标型）
- 发送前预览：明确展示本次发送的文本，确认才发
- 每周总结：本周灵感 / 复盘要点 / 做了哪些事 / 情绪状态
- 自定义提醒时间、数据导出（Markdown / JSON）
- PWA：可「添加到主屏幕」，类原生体验

---

## 更新日志

### v1.1（图片记录 + 语音转写落字修复）

- **新增｜图片记录**：记录页可拍照或从相册选图，单条最多 4 张。
  - 图片在浏览器**本地压缩**（最长边 1600px、JPEG 质量 0.82）后存入 IndexedDB，**全程不上传**，与文本 / 音频一致的本地优先策略。
  - 压缩时读取 EXIF 方向（`imageOrientation: "from-image"`），避免手机竖拍图被旋转。
  - 缩略图网格可单张删除；记录详情点击图片可**全屏查看**。
  - 首页卡片展示「🖼 N」角标，导出 JSON 记录 `imageCount`（二进制图片不入导出文件）。
- **修复｜语音转写不落入文本框**：旧逻辑在点击「停止」的瞬间读取 `speech.finalText`，而 Web Speech 的最后一段识别结果是在 `stop()` 之后**异步**返回的，导致读到旧值、尾段丢字。
  - 改为用 `useEffect` 持续监听 `speech.finalText` 变化，**增量同步**新识别出的文本（用 `syncedLenRef` 记录已同步长度，避免重复追加），无论结果何时异步回来都不丢字。
  - 语音方案保持不变（仍用浏览器自带 Web Speech，零服务器成本），仅修正落字时机问题。
- **零数据迁移**：图片以数组字段挂在记录对象上，旧记录无需升级 IndexedDB 版本即可兼容。

---

## 一、本地运行（在你自己的 Mac / 电脑上）

> 需要 Node.js 18+。

```bash
# 1. 进入项目
cd trace-app

# 2. 安装依赖
npm install

# 3. 配置环境变量（复制示例并填入你的 Key）
cp .env.example .env.local
#   编辑 .env.local，填入：
#   LLM_API_KEY=sk-xxxx
#   LLM_BASE_URL=https://api.openai.com/v1   （或你的兼容网关）
#   LLM_MODEL=gpt-4o-mini

# 4. 启动开发服务器
npm run dev
#   浏览器打开 http://localhost:3000
```

> 录音和麦克风权限在 `localhost` 与 `https` 下才可用，符合浏览器安全策略。

---

## 二、推送到 GitHub

```bash
cd trace-app
git init
git add .
git commit -m "feat: Trace web app v1"
# 在 GitHub 新建一个空仓库（建议名 trace-app），然后：
git branch -M main
git remote add origin https://github.com/<你的用户名>/trace-app.git
git push -u origin main
```

---

## 三、部署到 Vercel

1. 打开 https://vercel.com ，用 GitHub 登录。
2. 点 **Add New → Project**，选择刚 push 的 `trace-app` 仓库，点 **Import**。
3. 框架会自动识别为 **Next.js**，保持默认即可。
4. 展开 **Environment Variables**，添加：
   | Name | Value |
   |---|---|
   | `LLM_API_KEY` | 你的 Key（如 sk-...） |
   | `LLM_BASE_URL` | `https://api.openai.com/v1`（或你的网关） |
   | `LLM_MODEL` | `gpt-4o-mini`（或其他） |
   > 语音转写用浏览器自带能力，无需任何转写服务的环境变量。
5. 点 **Deploy**，等待构建完成，得到 `https://<项目名>.vercel.app`。
6. 以后每次 `git push`，Vercel 会自动重新部署。

---

## 四、装到 iPhone（类原生）

1. iPhone Safari 打开你的 Vercel 网址。
2. 点底部分享按钮 → **添加到主屏幕**。
3. 主屏会出现 Trace 图标，点开后无地址栏，体验接近原生 App。

---

## 五、隐私说明

- 所有记录（文本 / 音频 / 转写）默认仅存浏览器本地 IndexedDB，不上传。
- 语音转写在浏览器本地用 Web Speech 完成，音频不会上传到任何服务器。
- AI 优化表达 / 复盘 / 周报仅在你手动点击时调用，发送前预览会展示要发送的文本。
- AI 模型 / 接口 / API Key 可两种方式配置：① 在 App「设置」中自填，仅存于本机浏览器（IndexedDB），经 Vercel 代理转发、不直连厂商、不上传第三方；② 留空则使用 Vercel 环境变量兜底，前端不接触。

---

## 目录结构

```
trace-app/
├─ app/
│  ├─ page.tsx                  记录流首页（卡片流 · 图片角标 🖼）
│  ├─ record/page.tsx           快速记录（文字/语音/图片速记）
│  ├─ record/[id]/page.tsx      记录详情（播放/编辑/摘要/转写/图片全屏查看）
│  ├─ ai/page.tsx               AI 整理（复盘/周报/预览）
│  ├─ ai/reflection/[id]/...    复盘详情 + 导出
│  ├─ ai/weekly/[id]/...        周报详情 + 导出
│  ├─ settings/page.tsx         设置（隐私/提醒/导出）
│  ├─ api/llm/route.ts          LLM 代理（优化表达 / 复盘 / 周报 / 摘要）
├─ lib/                         types / store(IndexedDB) / llm / templates
├─ components/                  TabBar / useRecorder / useSpeech / PolishSheet / util
│  └─ image.ts                  图片本地压缩（1600px/0.82）+ 数量限制
└─ public/                      manifest.json + 图标
```
