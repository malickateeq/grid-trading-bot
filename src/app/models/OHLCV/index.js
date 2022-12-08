const mongoose = require('mongoose');
const schema = require('./schema');

const OHLCV = mongoose.model('OHLCV', schema);
module.exports = OHLCV;
