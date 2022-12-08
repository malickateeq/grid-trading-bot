const { Base } = require('@burency/common');
const Order = require('../../models/Order');

class OrdersRepository extends Base {
    constructor() {
        super();
    }

    async index(args) {
        const order = await Order.find({}).exec();
        return { data: order };
    }
    async get(args) {
        const order = await Order.findOne({
            _id: args.params.id,
        }).exec();
        return { data: order };
    }
    async post(args) {
        const order = new Order();
        order.trade_strategy = args.body.tradeStrategyId;
        order.user_thirdparty = args.body.userThirdpartyId;
        order.username = args.body.username;
        order.symbol = args.body.symbol;
        order.spending = {
            type: args.body.spending.type,
            value: args.body.spending.value,
        };
        order.order_side = args.body.order_side;
        await order.save();

        return { data: order };
    }
    async put(args) {
        const order = await Order.findOne({
            _id: args.body._id,
        }).exec();
        if (!order) return { data: 'FAILED' };
        order.trade_strategy = args.body.tradeStrategyId;
        order.user_thirdparty = args.body.userThirdpartyId;
        order.username = args.body.username;
        order.symbol = args.body.symbol;
        order.spending = {
            type: args.body.spending.type,
            value: args.body.spending.value,
        };
        order.order_side = args.body.order_side;
        order.status = args.body.status;
        await order.save();
        return { data: order };
    }
    async patch(args) {
        const order = await Order.findOne({
            _id: args.body._id,
        }).exec();
        if (!order) return { data: 'FAILED' };
        order.trade_strategy = args.body.tradeStrategyId ?? order.trade_strategy;
        order.user_thirdparty = args.body.userThirdpartyId ?? order.user_thirdparty;
        order.username = args.body.username ?? order.username;
        order.symbol = args.body.symbol ?? order.symbol;
        order.spending = {
            type: args.body.spending.type ?? order.spending.type,
            value: args.body.spending.value ?? order.spending.value,
        };
        order.order_side = args.body.order_side ?? order.order_side;
        order.status = args.body.status ?? order.status;
        await order.save();
        return { data: order };
    }
}

module.exports = new OrdersRepository();
