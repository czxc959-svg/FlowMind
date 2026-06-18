<div align="center">
  <img src="favicon.png" width="120" alt="Logo">
  <h1>心流专注助手 (FlowMind)</h1>
  <p><b>一个全栈架构的 AI 驱动智能任务管家与沉浸式番茄钟</b></p>
  <p>
    <img src="https://img.shields.io/badge/Node.js-Express-success.svg" alt="Node.js">
    <img src="https://img.shields.io/badge/Frontend-HTML/CSS/JS-blue.svg" alt="Vanilla JS">
    <img src="https://img.shields.io/badge/Audio-Web_Audio_API-orange.svg" alt="Web Audio API">
    <img src="https://img.shields.io/badge/Architecture-Fullstack-purple.svg" alt="Fullstack">
  </p>
</div>

## ✨ 项目简介

**心流专注助手** 是一个旨在帮助用户进入“心流状态”的端到端（End-to-End）全栈项目。本项目不仅拥有极具现代感的 Glassmorphism（毛玻璃）UI 设计，还深度整合了全栈服务架构与前端底层 API 交互。

本项目完全摒弃了传统的第三方组件库堆砌，从零开始手工打造了高性能的前后端分离架构，非常适合用来展示对原生 Web 技术底层的掌控力。

## 🚀 核心功能亮点

### 1. 🤖 AI 意图识别与任务生成 (NLP)
- 告别机械的下拉框！内置基于正则表达式匹配的本地 NLP 意图解析引擎。
- 支持自然语言交互（例如输入：“帮我写一份锻炼计划”），系统会自动解析意图类别，并动态生成相关的场景化细分任务。

### 2. 🍅 高级番茄专注系统 (Pomodoro)
- 支持完全自定义的专注、短休、长休时长，并带有直观的 SVG 环形进度动画。
- **纯底层 Web Audio API 环境音效**：摒弃加载体积庞大的 MP3 文件，手写数字信号处理算法（如使用低通滤波器与粉红噪音模拟真实雨声和海浪），实现了零网络依赖、零延迟的极速白噪音体验。

### 3. 💡 闪念笔记 (Distraction Log)
- 创新性的专注力保护机制。在倒计时专注期间大脑中突然弹出的杂念（如“记得拿快递”），可一键记录在右下角的闪念笔记中。
- 基于防抖（Debounce）技术的本地实时自动保存，保护心流不被打断。

### 4. 📊 数据持久化与后端 API (Fullstack)
- 完整的 RESTful API 路由设计，清晰划分 `/api/tasks` 和 `/api/pomodoro` 等核心业务逻辑。
- 轻量级无编译本地 JSON 数据库方案，提供完美跨平台的开箱即用体验。
- 前端全面采用现代 `fetch` API 与乐观 UI 更新策略，保证极致交互体验。

---

## 🛠️ 技术栈

- **前端 (Frontend):** 原生 HTML5, Vanilla JavaScript (ES6+), 原生 CSS3 (CSS Variables, Flexbox/Grid 现代布局)
- **后端 (Backend):** Node.js, Express.js框架
- **数据层 (Data Layer):** 基于文件系统的本地 JSON 轻量数据库 (持久化)
- **核心 API:** Web Audio API, LocalStorage, Fetch API

---

## 📦 如何在本地运行

只需两步，即可在你的电脑上跑起这个全栈项目：

### 前置要求
- 确保你的电脑上安装了 [Node.js](https://nodejs.org/) (推荐 18.x 或以上版本)

### 1. 安装依赖
下载代码后，在项目根目录下打开终端（命令行），运行：
```bash
npm install
```

### 2. 一键启动服务
接着在同一个终端中运行：
```bash
npm run dev
```
终端会出现炫酷的启动日志，随后在浏览器中访问 [http://localhost:3000](http://localhost:3000) 即可开始体验！

---

## 🎨 界面预览

*具有呼吸感的高级深色系 UI 设计、平滑的微交互动画，完美适配各类现代浏览器。*

> **开发者留言**：此项目是我通过 Vibe Coding 模式独立设计与开发的全栈作品，展示了对前后端分离架构、原生 JS 性能优化以及 UI/UX 设计的综合把控能力。
