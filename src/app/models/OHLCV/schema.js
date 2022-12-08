const { Schema } = require('mongoose');

const schema = new Schema({
    name: { type: String }, // kucoin:ADA/USDT
    symbol: { type: String }, // ADA/USDT
    exchange: { type: String }, // kucoin
    timeframe: {
        type: String,
        default: '1m', // 1m, 15m, 30m, 1h, 4h, 6h, 12h , 1d, 4d, 1w, 14d, 1M etc.
    },
    open: { type: Number },
    high: { type: Number },
    low: { type: Number },
    close: { type: Number },
    volume: { type: Number },
    timestamp: { type: Number },
});

module.exports = schema;
