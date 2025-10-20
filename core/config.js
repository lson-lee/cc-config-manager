const {
  readConfigs,
  saveConfigs,
  readClaudeSettings,
  writeClaudeSettings,
} = require('./storage');
const {
  validateGroupName,
  validateUrl,
  validateApiKey,
} = require('./validator');

function listGroups() {
  const data = readConfigs();
  return data.groups;
}

function getGroup(name) {
  const normalized = validateGroupName(name);
  const data = readConfigs();
  return data.groups.find((group) => group.name === normalized) || null;
}

function addGroup(name, baseUrl, token) {
  const normalizedName = validateGroupName(name);
  const normalizedUrl = validateUrl(baseUrl);
  const normalizedToken = validateApiKey(token);

  const data = readConfigs();
  const exists = data.groups.some((group) => group.name === normalizedName);
  if (exists) {
    throw new Error(`Group "${normalizedName}" already exists`);
  }

  const newGroup = {
    name: normalizedName,
    baseUrl: normalizedUrl,
    token: normalizedToken,
  };

  const nextData = {
    ...data,
    groups: [...data.groups, newGroup],
  };

  saveConfigs(nextData);
  return newGroup;
}

function updateGroup(oldName, newData) {
  const normalizedOldName = validateGroupName(oldName);
  const normalizedName = validateGroupName(newData.name);
  const normalizedUrl = validateUrl(newData.baseUrl);
  const normalizedToken = validateApiKey(newData.token);

  const data = readConfigs();
  const groupIndex = data.groups.findIndex((group) => group.name === normalizedOldName);

  if (groupIndex === -1) {
    throw new Error('Group not found');
  }

  const duplicate = data.groups.some(
    (group, index) => group.name === normalizedName && index !== groupIndex,
  );
  if (duplicate) {
    throw new Error('Group name already exists');
  }

  const updatedGroup = {
    name: normalizedName,
    baseUrl: normalizedUrl,
    token: normalizedToken,
  };

  const nextGroups = [...data.groups];
  nextGroups[groupIndex] = updatedGroup;

  const nextData = {
    ...data,
    groups: nextGroups,
    currentGroup:
      data.currentGroup === normalizedOldName ? normalizedName : data.currentGroup,
  };

  saveConfigs(nextData);

  if (data.currentGroup === normalizedOldName) {
    writeClaudeSettings(normalizedUrl, normalizedToken);
  }

  return updatedGroup;
}

function deleteGroup(name) {
  const normalizedName = validateGroupName(name);
  const data = readConfigs();
  const existing = data.groups.find((group) => group.name === normalizedName);

  if (!existing) {
    throw new Error('Group not found');
  }

  const nextGroups = data.groups.filter((group) => group.name !== normalizedName);
  const nextData = {
    groups: nextGroups,
    currentGroup: data.currentGroup === normalizedName ? null : data.currentGroup,
  };

  saveConfigs(nextData);
  return existing;
}

function switchGroup(name) {
  const normalizedName = validateGroupName(name);
  const data = readConfigs();
  const group = data.groups.find((item) => item.name === normalizedName);

  if (!group) {
    throw new Error('Group not found');
  }

  const nextData = {
    ...data,
    currentGroup: normalizedName,
  };

  saveConfigs(nextData);
  writeClaudeSettings(group.baseUrl, group.token);

  return group;
}

function getCurrentGroup() {
  const data = readConfigs();
  if (!data.currentGroup) {
    return null;
  }

  const group = data.groups.find((item) => item.name === data.currentGroup);
  return group || null;
}

function getClaudeSettings() {
  return readClaudeSettings();
}

module.exports = {
  listGroups,
  getGroup,
  addGroup,
  updateGroup,
  deleteGroup,
  switchGroup,
  getCurrentGroup,
  getClaudeSettings,
};
