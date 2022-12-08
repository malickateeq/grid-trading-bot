const mongoose = require('mongoose');
const schema = require('./schema');

const TradeStrategy = mongoose.model('TradeStrategy', schema);
module.exports = TradeStrategy;
