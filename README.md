# Claude Code Config Manager

轻量级的 Claude Code 配置管理工具，让你可以方便地以分组形式管理和切换 Base URL 和 Token。

## ✨ 特性

- 🔧 **分组管理**: 创建多个配置组，每组包含独立的 Base URL 和 Token
- ✏️ **编辑配置**: 支持编辑已有的配置组信息
- 🔄 **快速切换**: 一键切换不同的配置组
- 🛡️ **冲突检测**: 自动检测环境变量冲突并提供一键修复
- 🔍 **系统诊断**: 查看当前系统配置状态和潜在问题
- ✅ **配置验证**: 在添加配置前验证格式是否正确
- 💾 **导入导出**: 支持 JSON 格式的配置导入导出
- 🌐 **跨平台**: 配置保存在服务器上，可在任何地方访问
- 🎨 **美观界面**: 简洁现代的 UI 设计
- 🚀 **超轻量**: 无需构建步骤，仅依赖 Express

## 📦 安装

1. 进入项目目录：
```bash
cd cc-config-manager
```

2. 安装依赖：
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

3. 在页面中：
   - 添加配置组（输入名称、Base URL 和 Token）
   - 点击"验证配置"按钮验证配置格式
   - 点击"切换"按钮应用配置到 Claude Code
   - 点击"编辑"按钮修改配置组信息
   - 点击"系统诊断"查看环境变量状态
   - 如果检测到冲突，点击"自动修复"解决问题
   - 使用导入/导出功能备份或迁移配置

## 📂 文件结构

```
cc-config-manager/
├── server.js           # 后端服务器
├── package.json        # 项目配置
├── configs.json        # 配置数据存储（自动生成）
└── public/
    └── index.html      # 前端页面
```

## 🔧 配置文件位置

- **配置组数据**: `./configs.json`（在项目目录中）
- **Claude Code 配置**: `~/.claude.json`（用户主目录）

## 🌍 部署到服务器

你可以将此应用部署到任何支持 Node.js 的服务器：

```bash
# 使用 PM2 保持运行
npm install -g pm2
pm2 start server.js --name cc-config-manager

# 或使用 nohup
nohup npm start &
```

## 📋 API 接口

- `GET /api/groups` - 获取所有配置组
- `POST /api/groups` - 保存配置组
- `PUT /api/groups/:name` - 编辑配置组
- `POST /api/switch` - 切换配置组
- `GET /api/export` - 导出配置
- `POST /api/import` - 导入配置
- `GET /api/current` - 获取当前 Claude Code 配置
- `GET /api/conflicts` - 检测环境变量冲突
- `POST /api/fix-conflicts` - 自动修复环境变量冲突
- `POST /api/validate` - 验证配置格式
- `GET /api/diagnose` - 获取系统诊断信息

## 🔒 安全提示

- Token 在前端显示时会被部分隐藏
- 建议在服务器上使用反向代理和 HTTPS
- 可以添加身份验证层来保护配置管理

## ⚠️ 环境变量冲突问题

如果你遇到类似以下的警告：

```
⚠Auth conflict: Both a token (ANTHROPIC_AUTH_TOKEN) and an API key (ANTHROPIC_API_KEY) are set.
```

这是因为同时设置了多个认证环境变量。本工具提供了自动检测和修复功能：

1. 打开 Web 界面，如果检测到冲突会自动显示警告
2. 点击"自动修复"按钮，工具会：
   - 清理冲突的环境变量
   - 注释掉 `.bashrc` 中直接设置的 ANTHROPIC_* 变量
   - 创建 `.bashrc.backup` 备份文件
3. 或者点击"系统诊断"按钮查看详细的系统状态

手动修复方法：
```bash
# 1. 检查并编辑 .bashrc
vim ~/.bashrc

# 2. 注释掉或删除类似以下的行：
# export ANTHROPIC_AUTH_TOKEN=...
# export ANTHROPIC_API_KEY=...

# 3. 重新加载 shell
source ~/.bashrc

# 4. 重新加载 cc-env
source ~/.cc-env
```

## 📝 配置文件格式

导出的 JSON 配置格式：

```json
{
  "groups": [
    {
      "name": "Production",
      "baseUrl": "https://api.anthropic.com",
      "token": "sk-ant-..."
    }
  ],
  "currentGroup": "Production"
}
```

## 🛠️ 自定义端口

通过环境变量设置端口：

```bash
PORT=8080 npm start
```

## 📄 许可证

MIT
