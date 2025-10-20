const config = require('./config');
const storage = require('./storage');
const validator = require('./validator');

module.exports = {
  ...config,
  ...storage,
  validator,
};
