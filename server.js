const express = require('express');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const net = require('net');
const os = require('os');

const app = express();
const DEFAULT_PORT = process.env.PORT || 3000;

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, 'configs.json');
const CC_CONFIG_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.claude.json');
const ENV_FILE_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.cc-env');
const BASHRC_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.bashrc');

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

// 读取 Claude Code 配置
function readClaudeConfig() {
  if (!fs.existsSync(CC_CONFIG_PATH)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(CC_CONFIG_PATH, 'utf8'));
}

// 写入 Claude Code 配置
function writeClaudeConfig(baseUrl, apiKey) {
  const config = readClaudeConfig() || {};
  config.baseUrl = baseUrl;
  config.apiKey = apiKey;
  fs.writeFileSync(CC_CONFIG_PATH, JSON.stringify(config, null, 2));
}

// 清理所有 Claude Code 相关的环境变量
function cleanEnvVariables() {
  const envVars = ['ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_API_KEY', 'ANTHROPIC_BASE_URL'];
  let cleaned = [];

  envVars.forEach(varName => {
    if (process.env[varName]) {
      delete process.env[varName];
      cleaned.push(varName);
    }
  });

  if (cleaned.length > 0) {
    console.log(`Cleaned environment variables: ${cleaned.join(', ')}`);
  }

  return cleaned;
}

// 更新环境变量文件
function updateEnvFile(baseUrl, apiKey) {
  const envContent = `# CC Config Manager - Auto-generated environment variables
# Last updated: ${new Date().toISOString()}
#
# IMPORTANT: This file only sets ANTHROPIC_API_KEY to avoid conflicts
# If you have ANTHROPIC_AUTH_TOKEN set elsewhere, please remove it

# Unset any conflicting variables
unset ANTHROPIC_AUTH_TOKEN 2>/dev/null

# Set the correct variables
export ANTHROPIC_BASE_URL="${baseUrl}"
export ANTHROPIC_API_KEY="${apiKey}"
`;
  fs.writeFileSync(ENV_FILE_PATH, envContent);
  console.log(`Environment variables updated in ${ENV_FILE_PATH}`);
}

// 确保 bashrc 已经 source 环境变量文件
function ensureBashrcSourcesEnv() {
  if (!fs.existsSync(BASHRC_PATH)) {
    console.log('Warning: .bashrc not found');
    return false;
  }

  const bashrcContent = fs.readFileSync(BASHRC_PATH, 'utf8');
  const sourceCommand = `
# CC Config Manager - Source environment variables
if [ -f ~/.cc-env ]; then
    source ~/.cc-env
fi`;

  // 检查是否已经添加了 source 命令
  if (!bashrcContent.includes('source ~/.cc-env') && !bashrcContent.includes('. ~/.cc-env')) {
    fs.appendFileSync(BASHRC_PATH, sourceCommand + '\n');
    console.log('Added environment sourcing to .bashrc');
    return true;
  }

  return false;
}

// 检测环境变量冲突
function detectEnvConflicts() {
  const conflicts = [];

  if (process.env.ANTHROPIC_AUTH_TOKEN && process.env.ANTHROPIC_API_KEY) {
    conflicts.push({
      type: 'auth_conflict',
      message: 'Both ANTHROPIC_AUTH_TOKEN and ANTHROPIC_API_KEY are set',
      vars: ['ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_API_KEY']
    });
  }

  // 检查 .bashrc 中是否有直接设置的环境变量（排除已注释的行）
  if (fs.existsSync(BASHRC_PATH)) {
    const bashrcContent = fs.readFileSync(BASHRC_PATH, 'utf8');
    const lines = bashrcContent.split('\n');

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      // 只检测未被注释的行
      if (trimmedLine.includes('export ANTHROPIC_')
          && !trimmedLine.includes('cc-env')
          && !trimmedLine.startsWith('#')) {
        conflicts.push({
          type: 'bashrc_direct_export',
          message: `Direct ANTHROPIC_* export found in .bashrc at line ${index + 1}`,
          line: trimmedLine,
          lineNumber: index + 1
        });
      }
    });
  }

  return conflicts;
}

// 修复环境变量冲突
function fixEnvConflicts() {
  const results = {
    cleaned: [],
    fixed: [],
    errors: []
  };

  // 清理当前进程的环境变量
  if (process.env.ANTHROPIC_AUTH_TOKEN) {
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    results.cleaned.push('ANTHROPIC_AUTH_TOKEN');
  }

  // 尝试修复 .bashrc
  if (fs.existsSync(BASHRC_PATH)) {
    try {
      let bashrcContent = fs.readFileSync(BASHRC_PATH, 'utf8');
      const lines = bashrcContent.split('\n');
      const newLines = [];

      lines.forEach((line) => {
        // 注释掉直接的 ANTHROPIC_* 环境变量设置（但保留 cc-env 相关的）
        if (line.includes('export ANTHROPIC_') && !line.includes('cc-env') && !line.trim().startsWith('#')) {
          newLines.push(`# ${line} # Commented by CC Config Manager to avoid conflicts`);
          results.fixed.push(`Commented out: ${line.trim()}`);
        } else {
          newLines.push(line);
        }
      });

      if (results.fixed.length > 0) {
        // 备份原文件
        fs.writeFileSync(`${BASHRC_PATH}.backup`, bashrcContent);
        // 写入新内容
        fs.writeFileSync(BASHRC_PATH, newLines.join('\n'));
        results.fixed.push('Created backup: ~/.bashrc.backup');
      }
    } catch (error) {
      results.errors.push(`Failed to fix .bashrc: ${error.message}`);
    }
  }

  return results;
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

    // 如果修改的是当前配置组，更新当前配置组名称
    if (data.currentGroup === oldName) {
      data.currentGroup = name;
      // 同时更新 Claude Code 配置
      writeClaudeConfig(baseUrl, token);
      updateEnvFile(baseUrl, token);
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

    // 更新 Claude Code 配置文件
    writeClaudeConfig(group.baseUrl, group.token);

    // 更新环境变量文件
    updateEnvFile(group.baseUrl, group.token);

    // 更新当前配置组
    data.currentGroup = groupName;
    saveConfigs(data);

    res.json({
      success: true,
      message: `Switched to ${groupName}`,
      envFile: ENV_FILE_PATH,
      sourceCommand: `source ${ENV_FILE_PATH}`
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

// 获取当前 Claude Code 配置
app.get('/api/current', (req, res) => {
  try {
    const config = readClaudeConfig();
    res.json(config || { baseUrl: '', apiKey: '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 检测环境变量冲突
app.get('/api/conflicts', (req, res) => {
  try {
    const conflicts = detectEnvConflicts();
    res.json({
      hasConflicts: conflicts.length > 0,
      conflicts: conflicts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 修复环境变量冲突
app.post('/api/fix-conflicts', (req, res) => {
  try {
    const results = fixEnvConflicts();
    res.json({
      success: true,
      results: results
    });
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

    // 这里可以添加实际的 API 测试逻辑
    // 目前只做基本验证
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
    const conflicts = detectEnvConflicts();
    const envVars = {
      ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN ? '已设置' : '未设置',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? '已设置' : '未设置',
      ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL || '未设置'
    };

    const files = {
      claudeJson: fs.existsSync(CC_CONFIG_PATH),
      ccEnv: fs.existsSync(ENV_FILE_PATH),
      bashrc: fs.existsSync(BASHRC_PATH)
    };

    let bashrcHasSource = false;
    if (files.bashrc) {
      const bashrcContent = fs.readFileSync(BASHRC_PATH, 'utf8');
      bashrcHasSource = bashrcContent.includes('source ~/.cc-env') || bashrcContent.includes('. ~/.cc-env');
    }

    res.json({
      conflicts: conflicts,
      envVars: envVars,
      files: files,
      bashrcHasSource: bashrcHasSource,
      configFile: CONFIG_FILE,
      envFile: ENV_FILE_PATH
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

    // 确保 .bashrc 已经配置了 source 环境变量文件
    const bashrcUpdated = ensureBashrcSourcesEnv();

    app.listen(port, '0.0.0.0', () => {
      console.log('\n=================================');
      console.log('CC Config Manager is running!');
      console.log('=================================');
      console.log(`Local:   http://localhost:${port}`);
      console.log(`Network: http://${localIp}:${port}`);
      console.log('=================================\n');

      if (port !== DEFAULT_PORT) {
        console.log(`Note: Default port ${DEFAULT_PORT} was in use, using port ${port} instead.\n`);
      }

      if (bashrcUpdated) {
        console.log('\x1b[33m%s\x1b[0m', 'Important: .bashrc has been updated!');
        console.log('\x1b[33m%s\x1b[0m', 'Run the following command to reload your shell:');
        console.log('\x1b[36m%s\x1b[0m', '  source ~/.bashrc\n');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
