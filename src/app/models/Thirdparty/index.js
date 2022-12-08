const mongoose = require('mongoose');
const schema = require('./schema');

const Thirdparty = mongoose.model('Thirdparty', schema);
module.exports = Thirdparty;
