# Claude Code Config Manager

轻量级的 Claude Code 配置管理工具，通过直接修改 `~/.claude/settings.json` 实现配置的快速切换。

## ✨ 特性

- 🔧 **分组管理**: 创建多个配置组，每组包含独立的 Base URL 和 API Key
- ✏️ **可视化编辑**: 使用模态框编辑配置，实时显示当前值
- 🔄 **快速切换**: 一键切换不同的配置组，即时生效
- ✅ **配置验证**: 在添加配置前验证格式是否正确
- 🔍 **系统诊断**: 查看当前 Claude 配置状态
- 💾 **导入导出**: 支持 JSON 格式的配置导入导出
- 🎨 **美观界面**: 简洁现代的 UI 设计，带动画效果的模态框
- 🚀 **超轻量**: 无需构建步骤，仅依赖 Express
- 📁 **直接修改配置文件**: 不使用环境变量，直接操作 `~/.claude/settings.json`

## 🎯 工作原理

本工具通过**直接修改 `~/.claude/settings.json` 文件**来实现配置切换，避免了环境变量的冲突问题。切换配置后**立即生效**，无需重启终端或重新加载环境变量。

## 📦 安装

1. 克隆或下载项目到本地

2. 进入项目目录：
```bash
cd cc-config-manager
```

3. 安装依赖：
```bash
npm install
```

## 🚀 使用

1. 启动服务器：
```bash
npm start
```

2. 打开浏览器访问：
```
http://localhost:3000
```

3. 在页面中操作：
   - **添加配置组**：输入名称、Base URL 和 API Key
   - **验证配置**：点击"验证配置"按钮检查格式
   - **切换配置**：点击"切换"按钮应用配置（立即生效）
   - **编辑配置**：点击"编辑"按钮在模态框中修改，可以看到当前值
   - **删除配置**：点击"删除"按钮移除配置组
   - **系统诊断**：查看当前 Claude 配置状态
   - **导入/导出**：备份或迁移配置数据

## 📂 文件结构

```
cc-config-manager/
├── server.js           # 后端服务器
├── package.json        # 项目配置
├── configs.json        # 配置组数据（自动生成）
└── public/
    └── index.html      # 前端页面
```

## 🔧 配置文件位置

- **配置组数据**: `./configs.json`（项目目录）
- **Claude 配置**: `~/.claude/settings.json`（用户主目录）

切换配置时，工具会直接修改 `~/.claude/settings.json` 中的 `baseUrl` 和 `apiKey` 字段。

## 🌍 部署到服务器

可以将此应用部署到任何支持 Node.js 的服务器：

```bash
# 使用 PM2 保持运行
npm install -g pm2
pm2 start server.js --name cc-config-manager

# 或使用 nohup
nohup npm start &
```

## 📋 API 接口

- `GET /api/groups` - 获取所有配置组
- `GET /api/groups/:name` - 获取指定配置组信息
- `POST /api/groups` - 保存配置组
- `PUT /api/groups/:name` - 编辑配置组
- `POST /api/switch` - 切换配置组
- `GET /api/export` - 导出配置
- `POST /api/import` - 导入配置
- `GET /api/current` - 获取当前 Claude 配置
- `POST /api/validate` - 验证配置格式
- `GET /api/diagnose` - 获取系统诊断信息

## 📝 配置文件格式

### 项目配置 (configs.json)

```json
{
  "groups": [
    {
      "name": "Production",
      "baseUrl": "https://api.anthropic.com",
      "token": "sk-ant-..."
    },
    {
      "name": "Development",
      "baseUrl": "https://dev-api.example.com",
      "token": "sk-ant-..."
    }
  ],
  "currentGroup": "Production"
}
```

### Claude 配置 (~/.claude/settings.json)

```json
{
  "baseUrl": "https://api.anthropic.com",
  "apiKey": "sk-ant-...",
  "alwaysThinkingEnabled": true
}
```

## 🔒 安全提示

- Token 在前端列表显示时会被部分隐藏（只显示后8位）
- 编辑时可以看到完整的 Token
- 建议在服务器上使用反向代理和 HTTPS
- 可以添加身份验证层来保护配置管理

## 💡 使用建议

1. **多环境管理**: 为不同的 API 提供商创建不同的配置组
2. **快速测试**: 在多个 API 之间快速切换进行测试
3. **配置备份**: 定期导出配置进行备份
4. **团队共享**: 可以将配置文件分享给团队成员导入

## 🛠️ 自定义端口

通过环境变量设置端口：

```bash
PORT=8080 npm start
```

## 🆚 与环境变量方式的对比

| 特性 | settings.json 方式 (本工具) | 环境变量方式 |
|------|--------------------------|------------|
| 切换生效时间 | 立即生效 | 需要重启终端或 source |
| 配置冲突 | 无冲突 | 可能有 AUTH_TOKEN vs API_KEY 冲突 |
| 配置持久化 | 自动持久化 | 需要修改 .bashrc 等文件 |
| 跨终端生效 | 所有终端立即生效 | 需要在每个终端重新加载 |
| 维护复杂度 | 简单 | 需要管理多个文件 |

## 📄 许可证

MIT

---

**注意**: 本工具专为 Claude Code CLI 设计，通过直接修改配置文件实现更简洁、可靠的配置管理。
