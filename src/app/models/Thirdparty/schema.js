const { Schema } = require('mongoose');

const thirdpartySchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        type: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        description: {
            type: String,
            trim: true,
        },
        properties: {
            type: [
                {
                    title: { type: String, required: true },
                    name: { type: String, required: true },
                    type: { type: String, required: true },
                    default: { type: String, default: false },
                    values: [{ type: String, required: false }],
                    required: { type: Boolean, default: true },
                },
            ],
        },
        status: {
            type: Number,
            default: 1,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = thirdpartySchema;
