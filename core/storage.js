const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_FILE = path.join(__dirname, '..', 'configs.json');
const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

function ensureConfigDefaults(data = {}) {
  return {
    groups: Array.isArray(data.groups) ? data.groups : [],
    currentGroup: typeof data.currentGroup === 'string' ? data.currentGroup : null,
  };
}

function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.trim()) {
      return null;
    }

    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read JSON file at ${filePath}: ${error.message}`);
  }
}

function writeJsonFile(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    throw new Error(`Failed to write JSON file at ${filePath}: ${error.message}`);
  }
}

function readConfigs() {
  const data = readJsonFile(CONFIG_FILE);
  return ensureConfigDefaults(data || undefined);
}

function saveConfigs(data) {
  const normalized = ensureConfigDefaults(data);
  writeJsonFile(CONFIG_FILE, normalized);
}

function readClaudeSettings() {
  const settings = readJsonFile(CLAUDE_SETTINGS_PATH);
  return settings || null;
}

function writeClaudeSettings(baseUrl, apiKey) {
  const currentSettings = readClaudeSettings() || {};
  const nextSettings = {
    ...currentSettings,
    baseUrl,
    apiKey,
  };

  writeJsonFile(CLAUDE_SETTINGS_PATH, nextSettings);
  console.log(`Updated Claude settings: ${CLAUDE_SETTINGS_PATH}`);
  return nextSettings;
}

module.exports = {
  CONFIG_FILE,
  CLAUDE_SETTINGS_PATH,
  readConfigs,
  saveConfigs,
  readClaudeSettings,
  writeClaudeSettings,
};
