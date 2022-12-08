const { Schema } = require('mongoose');

const schame = new Schema(
    {
        hold_position_for: {
            type: String,
            trim: true,
        },
        ohlcv: {
            timeframe: { type: String },
            since: { type: String },
            limit: { type: Number, default: 3 },
            params: { type: Object },
        },
        rsi: {
            low_mark: { type: Number, default: 30 },
            high_mark: { type: Number, default: 60 },
        },
        strategy: { type: String, default: 'rsi' },
        status: {
            type: Number,
            default: 1,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = schame;
