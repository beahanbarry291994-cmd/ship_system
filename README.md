# Ship System

船舶运动控制与导航系统

## 项目简介

本项目包含船舶运动控制和导航系统的相关代码和资源，涵盖船舶运动建模、控制系统设计和导航算法实现。

## 项目结构

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

## 快速开始

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

## 功能特性

- 🚢 船舶运动建模与仿真
- 🎮 船舶控制系统设计
- 🧭 导航算法实现
- 📊 数据可视化与分析

## 技术栈

- **前端**: HTML5, CSS3, JavaScript/TypeScript
- **后端**: Node.js
- **AI**: Google Gemini API
- **构建工具**: Vite

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件
