const { Schema } = require("mongoose");
const mongoose = require("mongoose");

const userSchema = new Schema(
  {
    first_name: {
      type: String,
      trim: true,
    },
    last_name: {
      type: String,
      trim: true,
    },
    group: {
      type: mongoose.ObjectId,
      ref: "Group",
    },
    user_type: {
      type: Object,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
    },
    country_code: {
      type: String,
      sparse: true,
    },
    phone: {
      type: String,
      sparse: true,
    },
    card_id: {
      type: mongoose.Types.ObjectId,
      ref: "Card",
    },
    avatar: {
      type: String,
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

module.exports = userSchema;
