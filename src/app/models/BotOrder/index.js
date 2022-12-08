const mongoose = require('mongoose');
const schema = require('./schema');

const BotOrder = mongoose.model('BotOrder', schema);
module.exports = BotOrder;
