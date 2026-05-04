# Ship System

<div align="center">

**船舶运动控制与导航系统** — 船舶运动控制和导航系统的相关代码和资源

[![HTML5](https://img.shields.io/badge/HTML5-CSS3-blue.svg)](https://developer.mozilla.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-TypeScript-yellow.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green.svg)](https://nodejs.org/)
[![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4.svg)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## Features

- **船舶运动建模** — 船舶运动仿真和建模
- **控制系统设计** — 船舶控制系统实现
- **导航算法** — 导航算法实现和优化
- **AI 集成** — 集成 Google Gemini API
- **现代前端** — 使用 Vite 构建的现代化前端

## Project Structure

```
ship_system/
├── src/                              # 源代码目录
│   ├── ship-system/                  # 基础版本
│   ├── ship-system-latest/           # 最新版本 (AI Studio 应用)
│   └── ship-system-new/              # 新版本
├── ship-motion-control-&-navigation.zip      # 船舶运动控制与导航代码包
├── ship-motion-control-&-navigation (1).zip  # 版本 1
├── ship-motion-control-&-navigation (2).zip  # 版本 2
├── ship-motion-control-&-navigation (3).zip  # 版本 3
├── ship-motion-control-&-navigation (4).zip  # 版本 4
├── LICENSE                           # MIT 许可证
└── README.md                         # 项目说明文档
```

## Quick Start

### ship-system-latest (AI Studio 应用)

1. 进入 `src/ship-system-latest/` 目录
2. 安装依赖：
```bash
npm install
```
3. 配置环境变量：
   - 复制 `.env.example` 为 `.env.local`
   - 设置 `GEMINI_API_KEY` 为你的 Gemini API 密钥
4. 运行应用：
```bash
npm run dev
```

### 其他版本

解压对应的 zip 文件，按照各版本的说明进行安装和使用。

## Technical Stack

- **前端**: HTML5, CSS3, JavaScript/TypeScript
- **后端**: Node.js
- **AI**: Google Gemini API
- **构建工具**: Vite

## License

[MIT](LICENSE)
