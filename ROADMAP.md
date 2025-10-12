# CC Config Manager - 架构演进规划

## 🎯 目标

打造一个**轻量、跨平台**的 Claude Code 配置管理工具：
- **CLI 优先**：Linux/Mac/Windows 命令行快速操作
- **GUI 辅助**：Mac/Windows 原生桌面应用（Tauri）
- **一套核心代码**：所有平台共享业务逻辑

---

## 🏗️ 最终架构

```
cc-config-manager/
├── core/                      # 核心业务逻辑（跨平台共享）
│   ├── config.js              # 配置 CRUD 操作
│   ├── storage.js             # 文件读写（~/.claude/settings.json）
│   ├── validator.js           # 配置验证
│   └── index.js               # 统一导出
│
├── cli/                       # 命令行工具
│   ├── commands/              # 子命令实现
│   │   ├── list.js            # cc list
│   │   ├── use.js             # cc use <name>
│   │   ├── add.js             # cc add
│   │   ├── edit.js            # cc edit <name>
│   │   ├── delete.js          # cc delete <name>
│   │   ├── current.js         # cc current
│   │   └── gui.js             # cc gui (启动 Tauri App)
│   ├── index.js               # CLI 入口
│   └── package.json           # CLI 包配置
│
├── tauri-app/                 # Tauri 桌面应用
│   ├── src-tauri/             # Rust 后端
│   │   ├── src/
│   │   │   └── main.rs        # 调用 core 逻辑
│   │   ├── Cargo.toml
│   │   └── tauri.conf.json
│   ├── src/                   # 前端（复用现有 Web UI）
│   │   ├── index.html         # 当前 public/index.html
│   │   └── assets/
│   └── package.json
│
├── server.js                  # Web 服务（已废弃/开发用）
├── public/                    # Web UI 资源（迁移到 tauri-app/src）
├── configs.json               # 配置数据存储
├── package.json               # 根项目配置
└── README.md                  # 更新说明文档
```

---

## 📋 技术选型

### 核心层
- **纯 Node.js**：无额外依赖，轻量高效

### CLI 层
- **commander.js**：命令行框架
- **inquirer.js**：交互式问答
- **chalk**：彩色终端输出
- **ora**：加载动画

### GUI 层
- **Tauri v2**：轻量桌面框架（Rust + Web）
- **前端复用**：当前的 HTML/CSS/JavaScript
- **通信方式**：Tauri Commands（前端 ↔ Rust ↔ Node.js core）

---

## 🚀 实施路径

### 阶段 1: 核心逻辑抽离 ✅ **重构**
**目标**：将 `server.js` 中的业务逻辑抽离到 `core/` 模块

**任务清单**：
- [ ] 创建 `core/storage.js` - 封装文件读写操作
  - `readConfigs()` - 读取 configs.json
  - `saveConfigs()` - 保存 configs.json
  - `readClaudeSettings()` - 读取 ~/.claude/settings.json
  - `writeClaudeSettings()` - 写入 ~/.claude/settings.json

- [ ] 创建 `core/config.js` - 配置 CRUD 操作
  - `listGroups()` - 列出所有配置组
  - `getGroup(name)` - 获取指定配置组
  - `addGroup(name, baseUrl, token)` - 添加配置组
  - `updateGroup(oldName, newData)` - 更新配置组
  - `deleteGroup(name)` - 删除配置组
  - `switchGroup(name)` - 切换配置组
  - `getCurrentGroup()` - 获取当前配置组

- [ ] 创建 `core/validator.js` - 配置验证
  - `validateUrl(url)` - 验证 URL 格式
  - `validateApiKey(key)` - 验证 API Key 格式
  - `validateGroupName(name)` - 验证组名格式

- [ ] 重构 `server.js` - 调用 core 模块而非直接操作文件

**预计时间**：2-3 小时

---

### 阶段 2: CLI 工具开发 🛠️ **新增**
**目标**：开发命令行工具，提供快速操作能力

**命令设计**：
```bash
# 安装
npm install -g @lson-lee/cc-config-manager

# 使用
cc list                           # 列出所有配置组（表格形式）
cc current                        # 显示当前配置
cc use <name>                     # 切换到指定配置组
cc add                            # 交互式添加配置组
cc add <name> <url> <key>        # 快速添加配置组
cc edit <name>                    # 交互式编辑配置组
cc delete <name>                  # 删除配置组（需确认）
cc export [file]                  # 导出配置到文件
cc import <file>                  # 从文件导入配置
cc gui                            # 启动 GUI 应用（如果已安装）
cc --version                      # 显示版本
cc --help                         # 帮助信息
```

**任务清单**：
- [ ] 初始化 `cli/` 目录结构
- [ ] 安装依赖：commander, inquirer, chalk, ora, cli-table3
- [ ] 实现各个子命令
- [ ] 添加彩色输出和加载动画
- [ ] 配置 bin 使其可全局安装
- [ ] 编写 CLI 文档

**CLI 效果示例**：
```bash
$ cc list

┌─────┬─────────────┬───────────────────────────────────┬────────┐
│ ID  │ Name        │ Base URL                          │ Status │
├─────┼─────────────┼───────────────────────────────────┼────────┤
│ 1   │ anyrouter   │ https://pmpjfbhq.cn-nb1...       │ ✓ 当前 │
│ 2   │ production  │ https://api.anthropic.com        │        │
└─────┴─────────────┴───────────────────────────────────┴────────┘

$ cc use production
✔ 成功切换到: production

$ cc add
? 配置组名称: development
? Base URL: https://dev-api.example.com
? API Key: sk-ant-***
✔ 配置组 "development" 添加成功
```

**预计时间**：4-6 小时

---

### 阶段 3: Tauri 桌面应用开发 🖥️ **新增**
**目标**：将 Web UI 打包为原生桌面应用

**技术架构**：
```
前端（Web UI）
    ↓ invoke()
Tauri Commands (Rust)
    ↓ 调用 Node.js
Core 模块 (JavaScript)
    ↓
文件系统
```

**任务清单**：
- [ ] 安装 Tauri 开发环境
  - Rust 工具链
  - Tauri CLI

- [ ] 初始化 Tauri 项目
  ```bash
  npm create tauri-app@latest
  ```

- [ ] 迁移前端代码
  - 将 `public/index.html` 移动到 `tauri-app/src/`
  - 适配 Tauri API（替换 fetch 为 invoke）

- [ ] Rust 后端开发
  - 创建 Tauri Commands 调用 Node.js core 模块
  - 配置权限（文件系统访问）

- [ ] 打包和分发
  - macOS: .dmg
  - Windows: .msi / .exe
  - Linux: .AppImage / .deb

- [ ] 应用图标和启动配置

**前端 API 适配示例**：
```javascript
// 原来（Web）
const res = await fetch('/api/groups');
const data = await res.json();

// 改为（Tauri）
import { invoke } from '@tauri-apps/api/core';
const data = await invoke('get_groups');
```

**Rust Command 示例**：
```rust
#[tauri::command]
async fn get_groups() -> Result<String, String> {
    // 调用 Node.js core 模块
    let output = Command::new("node")
        .arg("core/cli-bridge.js")
        .arg("listGroups")
        .output()
        .expect("Failed to execute");

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}
```

**预计时间**：6-8 小时

---

### 阶段 4: 集成和优化 🔧 **完善**
**目标**：整合 CLI 和 GUI，优化体验

**任务清单**：
- [ ] `cc gui` 命令自动检测并启动 Tauri App
- [ ] 统一配置文件路径（确保 CLI 和 GUI 共享数据）
- [ ] 添加自动更新功能（Tauri Updater）
- [ ] 性能优化（启动速度、内存占用）
- [ ] 编写完整文档
  - 安装指南
  - 使用教程
  - 开发指南

- [ ] 设置 GitHub Actions 自动构建
  - CLI 发布到 npm
  - Tauri App 发布到 GitHub Releases

**预计时间**：3-4 小时

---

## 📊 资源占用预估

### CLI 工具
- 安装大小：~5MB
- 运行内存：~20MB
- 启动速度：<100ms

### Tauri 桌面应用
- 安装包大小：3-5MB（比 Electron 小 95%）
- 运行内存：~50MB（比 Electron 少 70%）
- 启动速度：<1s

---

## 🎯 里程碑

| 阶段 | 目标 | 预计时间 | 交付物 |
|------|------|----------|--------|
| 1️⃣ 核心重构 | 代码模块化 | 2-3h | `core/` 模块 |
| 2️⃣ CLI 开发 | 命令行工具 | 4-6h | `cc` 命令 |
| 3️⃣ GUI 开发 | Tauri 应用 | 6-8h | 桌面安装包 |
| 4️⃣ 集成优化 | 完善体验 | 3-4h | 完整产品 |
| **总计** | | **15-21h** | 跨平台工具 |

---

## 📝 待决策问题

1. **CLI npm 包名**
   - `@lson-lee/cc-config-manager` (scoped)
   - `cc-config-manager` (global)
   - `ccm` (简短)

2. **Tauri App 名称**
   - "CC Config Manager"
   - "Claude Config Manager"
   - "Claude Code Switcher"

3. **发布策略**
   - CLI 先行 → GUI 跟进
   - 同步开发同步发布

4. **Rust ↔ Node.js 通信方式**
   - 方案 A: Rust 直接调用 Node.js 脚本（简单）
   - 方案 B: Rust 重写核心逻辑（性能最优，但增加维护成本）
   - **推荐**：方案 A，先快速实现，未来可选方案 B

---

## 🔗 参考资料

- [Tauri 官方文档](https://tauri.app/)
- [Commander.js 文档](https://github.com/tj/commander.js)
- [Inquirer.js 文档](https://github.com/SBoudrias/Inquirer.js)
- [Node.js 调用 Rust](https://tauri.app/v1/guides/building/sidecar/)

---

## 📌 当前状态

- ✅ Web UI + Express Server（已完成）
- ✅ PM2 进程管理（已配置）
- ⏳ 核心逻辑抽离（待开始）
- ⏳ CLI 工具开发（待开始）
- ⏳ Tauri 桌面应用（待开始）

---

**最后更新**：2025-10-12
**作者**：lson-lee + Claude Code
