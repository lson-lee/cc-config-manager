const express = require('express');
const fs = require('fs');
const net = require('net');
const os = require('os');

const {
  CONFIG_FILE,
  CLAUDE_SETTINGS_PATH,
  readConfigs,
  saveConfigs,
  readClaudeSettings,
} = require('./core/storage');
const configService = require('./core/config');
const { validateUrl, validateApiKey } = require('./core/validator');

const app = express();
const DEFAULT_PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

function handleError(res, error) {
  console.error(error);

  if (error.message === 'Group not found') {
    return res.status(404).json({ error: error.message });
  }

  const validationPrefixes = ['Invalid', 'Group', 'API Key', 'Base URL'];
  const isValidationError =
    validationPrefixes.some((prefix) => error.message.startsWith(prefix)) ||
    error.message.includes('required') ||
    error.message.includes('exists');

  if (isValidationError) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(500).json({ error: error.message });
}

// 获取所有配置组
app.get('/api/groups', (req, res) => {
  try {
    const data = readConfigs();
    res.json(data);
  } catch (error) {
    handleError(res, error);
  }
});

// 获取指定配置组信息
app.get('/api/groups/:name', (req, res) => {
  try {
    const groupName = req.params.name;
    const group = configService.getGroup(groupName);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json(group);
  } catch (error) {
    handleError(res, error);
  }
});

// 保存配置组
app.post('/api/groups', (req, res) => {
  try {
    const { groups, currentGroup } = req.body;
    saveConfigs({ groups, currentGroup });
    res.json({ success: true });
  } catch (error) {
    handleError(res, error);
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

    configService.updateGroup(oldName, { name, baseUrl, token });
    res.json({ success: true, message: 'Group updated successfully' });
  } catch (error) {
    handleError(res, error);
  }
});

// 切换配置组
app.post('/api/switch', (req, res) => {
  try {
    const { groupName } = req.body;
    const group = configService.switchGroup(groupName);

    res.json({
      success: true,
      message: `Switched to ${groupName}. Configuration updated in ${CLAUDE_SETTINGS_PATH}`,
      settingsPath: CLAUDE_SETTINGS_PATH,
      group,
    });
  } catch (error) {
    handleError(res, error);
  }
});

// 导出配置
app.get('/api/export', (req, res) => {
  try {
    const data = readConfigs();
    res.json(data);
  } catch (error) {
    handleError(res, error);
  }
});

// 导入配置
app.post('/api/import', (req, res) => {
  try {
    const data = req.body;
    saveConfigs(data);
    res.json({ success: true, message: 'Configuration imported successfully' });
  } catch (error) {
    handleError(res, error);
  }
});

// 获取当前 Claude 配置
app.get('/api/current', (req, res) => {
  try {
    const settings = configService.getClaudeSettings();
    res.json(settings || { baseUrl: '', apiKey: '' });
  } catch (error) {
    handleError(res, error);
  }
});

// 验证配置（测试连接）
app.post('/api/validate', async (req, res) => {
  try {
    const { baseUrl, apiKey } = req.body;

    if (!baseUrl || !apiKey) {
      return res.status(400).json({ error: 'baseUrl and apiKey are required' });
    }

    try {
      validateUrl(baseUrl);
      validateApiKey(apiKey);
    } catch (validationError) {
      return res.json({
        valid: false,
        error: validationError.message
      });
    }

    res.json({
      valid: true,
      message: 'Configuration format is valid',
    });
  } catch (error) {
    handleError(res, error);
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
    handleError(res, error);
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
