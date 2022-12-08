const mongoose = require('mongoose');
const schema = require('./schema');

const UserThirdparty = mongoose.model('UserThirdparty', schema);
module.exports = UserThirdparty;
