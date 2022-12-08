const { Base } = require('@burency/common');
const Order = require('../../models/Order');
const BotOrder = require('../../models/BotOrder');

class BotOrdersRepository extends Base {
    constructor() {
        super();
    }

    async index(args) {
        const botOrders = await BotOrder.find({}).exec();
        return { data: botOrders };
    }
    async get(args) {
        const botOrder = await BotOrder.findOne({
            _id: args.params?.id ?? args.body._id,
        }).exec();
        const orders = await Order.find({
            bot_order: botOrder?._id,
        }).exec();
        return { data: { botOrder, orders } };
    }
    async post(args) {
        const botOrder = new BotOrder();
        botOrder.trade_strategy = args.body.tradeStrategyId;
        botOrder.user_thirdparty = args.body.userThirdpartyId;
        botOrder.username = args.body.username;
        botOrder.symbol = args.body.symbol;
        botOrder.buy_spending = {
            type: args.body.buy_spending.type,
            value: args.body.buy_spending.value,
        };
        botOrder.sell_spending = {
            type: args.body.sell_spending.type,
            value: args.body.sell_spending.value,
        };
        botOrder.current_order_side = args.body.current_order_side;
        await botOrder.save();

        return { data: botOrder };
    }
    async put(args) {
        const botOrder = await BotOrder.findOne({
            _id: args.body._id,
        }).exec();
        if (!botOrder) return { data: 'FAILED' };
        botOrder.trade_strategy = args.body.tradeStrategyId;
        botOrder.user_thirdparty = args.body.userThirdpartyId;
        botOrder.username = args.body.username;
        botOrder.symbol = args.body.symbol;
        botOrder.buy_spending = {
            type: args.body.buy_spending.type,
            value: args.body.buy_spending.value,
        };
        botOrder.sell_spending = {
            type: args.body.sell_spending.type,
            value: args.body.sell_spending.value,
        };
        botOrder.current_order_side = args.body.current_order_side;
        botOrder.status = args.body.status;
        await botOrder.save();
        return { data: botOrder };
    }
    async patch(args) {
        const botOrder = await BotOrder.findOne({
            _id: args.body._id,
        }).exec();
        if (!botOrder) return { data: 'FAILED' };
        botOrder.trade_strategy = args.body.tradeStrategyId ?? botOrder.trade_strategy;
        botOrder.user_thirdparty = args.body.userThirdpartyId ?? botOrder.user_thirdparty;
        botOrder.username = args.body.username ?? botOrder.username;
        botOrder.symbol = args.body.symbol ?? botOrder.symbol;
        botOrder.buy_spending = {
            type: args.body.buy_spending.type ?? botOrder.buy_spending.type,
            value: args.body.buy_spending.value ?? botOrder.buy_spending.value,
        };
        botOrder.sell_spending = {
            type: args.body.sell_spending.type ?? botOrder.sell_spending.type,
            value: args.body.sell_spending.value ?? botOrder.sell_spending.value,
        };
        botOrder.current_order_side = args.body.current_order_side ?? botOrder.current_order_side;
        botOrder.status = args.body.status ?? botOrder.status;
        await botOrder.save();
        return { data: botOrder };
    }
}

module.exports = new BotOrdersRepository();
