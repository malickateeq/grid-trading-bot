const { Schema } = require('mongoose');
const mongoose = require('mongoose');

const schame = new Schema(
    {
        trade_strategy: {
            type: mongoose.ObjectId,
            ref: 'TradeStrategy',
        },
        user_thirdparty: {
            type: mongoose.ObjectId,
            ref: 'UserThirdparty',
        },
        current_order: {
            type: mongoose.ObjectId,
            ref: 'Order',
        },
        username: {
            type: String,
        },
        symbol: {
            type: String,
        },
        buy_spending: {
            type: { type: String, default: 'carry' },
            value: { type: Number, default: 0 },
        },
        sell_spending: {
            type: { type: String, default: 'percentage' },
            value: { type: Number, default: 100 },
        },
        ohlcv: {
            high_avg: { type: Number },
            low_avg: { type: Number },
            last_update: { type: Number },
        },
        rsi: {
            mark: { type: Number },
            last_update: { type: Number },
        },
        current_order_side: {
            type: String,
        },
        buy_price: {
            type: Number,
        },
        sell_price: {
            type: Number,
        },
        time: {
            type: Number,
        },
        logs: {
            type: [{ type: Object }],
        },
        status: {
            type: Number,
            default: 0,
            // 0: Pending, 1: Running, 2: Terminated, 3: Failed
        },
    },
    {
        timestamps: true,
    }
);

module.exports = schame;
