const mongoose = require('mongoose');
const schema = require('./schema');

const Order = mongoose.model('Order', schema);
module.exports = Order;
