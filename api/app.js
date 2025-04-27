const path = require('path');
require('dotenv').config();

// Point to your backend server
module.exports = require(path.join(__dirname, '../backend/server'));
