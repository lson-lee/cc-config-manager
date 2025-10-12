const express = require('express');
const fs = require('fs');
const path = require('path');
const net = require('net');
const os = require('os');

const app = express();
const DEFAULT_PORT = process.env.PORT || 3000;

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, 'configs.json');
const CLAUDE_SETTINGS_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.claude', 'settings.json');

app.use(express.json());
app.use(express.static('public'));

// 读取配置文件
function readConfigs() {
  if (!fs.existsSync(CONFIG_FILE)) {
    return { groups: [], currentGroup: null };
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

// 保存配置文件
function saveConfigs(data) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
}

// 读取 Claude settings.json 配置
function readClaudeSettings() {
  if (!fs.existsSync(CLAUDE_SETTINGS_PATH)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf8'));
}

// 写入 Claude settings.json 配置
function writeClaudeSettings(baseUrl, apiKey) {
  // 确保 .claude 目录存在
  const claudeDir = path.dirname(CLAUDE_SETTINGS_PATH);
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  // 读取现有配置
  const settings = readClaudeSettings() || {};

  // 更新配置
  settings.baseUrl = baseUrl;
  settings.apiKey = apiKey;

  // 写入文件
  fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2));
  console.log(`Updated Claude settings: ${CLAUDE_SETTINGS_PATH}`);
}

// 获取所有配置组
app.get('/api/groups', (req, res) => {
  try {
    const data = readConfigs();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取指定配置组信息
app.get('/api/groups/:name', (req, res) => {
  try {
    const groupName = req.params.name;
    const data = readConfigs();
    const group = data.groups.find(g => g.name === groupName);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 保存配置组
app.post('/api/groups', (req, res) => {
  try {
    const { groups, currentGroup } = req.body;
    saveConfigs({ groups, currentGroup });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 编辑配置组
app.put('/api/groups/:name', (req, res) => {
  try {
    const oldName = req.params.name;
    const { name, baseUrl, token } = req.body;

    if (!name || !baseUrl || !token) {
      return res.status(400).json({ error: 'name, baseUrl and token are required' });
    }

    const data = readConfigs();
    const groupIndex = data.groups.findIndex(g => g.name === oldName);

    if (groupIndex === -1) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // 检查新名称是否与其他配置组冲突
    if (name !== oldName && data.groups.some(g => g.name === name)) {
      return res.status(400).json({ error: 'Group name already exists' });
    }

    // 更新配置组
    data.groups[groupIndex] = { name, baseUrl, token };

    // 如果修改的是当前配置组，更新当前配置组名称和 Claude 配置
    if (data.currentGroup === oldName) {
      data.currentGroup = name;
      writeClaudeSettings(baseUrl, token);
    }

    saveConfigs(data);
    res.json({ success: true, message: 'Group updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 切换配置组
app.post('/api/switch', (req, res) => {
  try {
    const { groupName } = req.body;
    const data = readConfigs();
    const group = data.groups.find(g => g.name === groupName);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // 更新 Claude settings.json 配置文件
    writeClaudeSettings(group.baseUrl, group.token);

    // 更新当前配置组
    data.currentGroup = groupName;
    saveConfigs(data);

    res.json({
      success: true,
      message: `Switched to ${groupName}. Configuration updated in ${CLAUDE_SETTINGS_PATH}`,
      settingsPath: CLAUDE_SETTINGS_PATH
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 导出配置
app.get('/api/export', (req, res) => {
  try {
    const data = readConfigs();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 导入配置
app.post('/api/import', (req, res) => {
  try {
    const data = req.body;
    saveConfigs(data);
    res.json({ success: true, message: 'Configuration imported successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取当前 Claude 配置
app.get('/api/current', (req, res) => {
  try {
    const settings = readClaudeSettings();
    res.json(settings || { baseUrl: '', apiKey: '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 验证配置（测试连接）
app.post('/api/validate', async (req, res) => {
  try {
    const { baseUrl, apiKey } = req.body;

    if (!baseUrl || !apiKey) {
      return res.status(400).json({ error: 'baseUrl and apiKey are required' });
    }

    // 基本验证
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(baseUrl)) {
      return res.json({
        valid: false,
        error: 'Invalid Base URL format. Must start with http:// or https://'
      });
    }

    if (!apiKey.startsWith('sk-')) {
      return res.json({
        valid: false,
        error: 'Invalid API Key format. Must start with "sk-"'
      });
    }

    res.json({
      valid: true,
      message: 'Configuration format is valid'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取系统诊断信息
app.get('/api/diagnose', (req, res) => {
  try {
    const files = {
      settingsJson: fs.existsSync(CLAUDE_SETTINGS_PATH)
    };

    const currentSettings = readClaudeSettings();

    res.json({
      files: files,
      configFile: CONFIG_FILE,
      settingsPath: CLAUDE_SETTINGS_PATH,
      currentSettings: currentSettings ? {
        hasBaseUrl: !!currentSettings.baseUrl,
        hasApiKey: !!currentSettings.apiKey,
        baseUrl: currentSettings.baseUrl || '未设置'
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取局域网 IP 地址
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 跳过内部地址和非 IPv4 地址
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// 检查端口是否可用
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

// 查找可用端口
async function findAvailablePort(startPort) {
  let port = startPort;
  const maxAttempts = 100; // 最多尝试100个端口

  for (let i = 0; i < maxAttempts; i++) {
    if (await isPortAvailable(port)) {
      return port;
    }
    console.log(`Port ${port} is in use, trying ${port + 1}...`);
    port++;
  }

  throw new Error(`Could not find an available port after ${maxAttempts} attempts`);
}

// 启动服务器
async function startServer() {
  try {
    const port = await findAvailablePort(DEFAULT_PORT);
    const localIp = getLocalIpAddress();

    app.listen(port, '0.0.0.0', () => {
      console.log('\n=================================');
      console.log('CC Config Manager is running!');
      console.log('=================================');
      console.log(`Local:   http://localhost:${port}`);
      console.log(`Network: http://${localIp}:${port}`);
      console.log('=================================');
      console.log(`Config file: ${CLAUDE_SETTINGS_PATH}`);
      console.log('=================================\n');

      if (port !== DEFAULT_PORT) {
        console.log(`Note: Default port ${DEFAULT_PORT} was in use, using port ${port} instead.\n`);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
