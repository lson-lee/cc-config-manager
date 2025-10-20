function ensureString(value, fieldName) {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  return value.trim();
}

function validateGroupName(name) {
  const normalized = ensureString(name, 'Group name');
  if (!normalized) {
    throw new Error('Group name is required');
  }
  if (normalized.length > 64) {
    throw new Error('Group name must be 64 characters or less');
  }
  return normalized;
}

function validateUrl(url) {
  const normalized = ensureString(url, 'Base URL');
  const pattern = /^https?:\/\/.+/i;
  if (!pattern.test(normalized)) {
    throw new Error('Invalid Base URL format. Must start with http:// or https://');
  }
  return normalized;
}

function validateApiKey(key) {
  const normalized = ensureString(key, 'API Key');
  if (!/^sk-[a-zA-Z0-9]{8,}/.test(normalized)) {
    throw new Error('Invalid API Key format. Must start with "sk-" and contain alphanumeric characters');
  }
  return normalized;
}

module.exports = {
  validateGroupName,
  validateUrl,
  validateApiKey,
};
