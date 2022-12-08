const { Schema } = require('mongoose');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

const schema = new Schema(
    {
        thirdparty: {
            type: mongoose.ObjectId,
            ref: 'Thirdparty',
        },
        username: {
            type: String,
            required: true,
        },
        configurations: {
            type: Object,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = schema;
