const { Schema } = require('mongoose');
const mongoose = require('mongoose');

const schame = new Schema(
    {
        bot_order: {
            type: mongoose.ObjectId,
            ref: 'BotOrder',
        },
        username: {
            type: String,
        },
        symbol: {
            type: String,
        },
        amount: {
            type: Number,
        },
        price: {
            type: Number,
        },
        order_side: {
            type: String,
        },
        time: {
            type: Number,
        },
        references: {
            type: Object,
        },
        cancel_references: {
            type: Object,
        },
        status: {
            type: Number,
            default: 0,
            // 0: Pending, 1: Closed , 2: Open, 3: Failed, 4: Cancel
        },
    },
    {
        timestamps: true,
    }
);

module.exports = schame;
