const { Base } = require('@burency/common');
const Thirdparty = require('../../models/Thirdparty');

class ThirdpartyRepository extends Base {
    constructor() {
        super();
    }

    async index(args) {
        const tradeStrategy = await Thirdparty.find({}).exec();
        return { data: tradeStrategy };
    }
    async get(args) {
        const tradeStrategy = await Thirdparty.findOne({}).exec();
        return { data: tradeStrategy };
    }
    async post(args) {
        const order = new Thirdparty();
        order.trade_strategy = args.body.trade_strategy;
        order.payment_method = args.body.payment_method;
        order.symbol = args.body.symbol;
        order.amount = args.body.amount;
        order.price = args.body.price;
        order.order_side = args.body.order_side;
        await order.save();

        return { data: 'OK1' };
    }
    async put(args) {
        const tradeStrategy = await Thirdparty.findOne({}).exec();
        if (!tradeStrategy) return { data: 'FAILED' };
        tradeStrategy.interval = args.body.interval;
        tradeStrategy.timeframe = args.body.timeframe;
        tradeStrategy.sample_count = args.body.sample_count;
        tradeStrategy.symbol = args.body.symbol;
        tradeStrategy.high_avg = args.body.high_avg;
        tradeStrategy.low_avg = args.body.low_avg;
        tradeStrategy.position = args.body.position;
        tradeStrategy.status = args.body.status;
        await tradeStrategy.save();
        return { data: 'OK' };
    }
    async patch(args) {
        const tradeStrategy = await Thirdparty.findOne({}).exec();
        if (!tradeStrategy) return { data: 'FAILED' };
        tradeStrategy.interval = args.body.interval ?? tradeStrategy.interval;
        tradeStrategy.timeframe = args.body.timeframe ?? tradeStrategy.timeframe;
        tradeStrategy.sample_count = args.body.sample_count ?? tradeStrategy.sample_count;
        tradeStrategy.symbol = args.body.symbol ?? tradeStrategy.symbol;
        tradeStrategy.high_avg = args.body.high_avg ?? tradeStrategy.high_avg;
        tradeStrategy.low_avg = args.body.low_avg ?? tradeStrategy.low_avg;
        tradeStrategy.position = args.body.position ?? tradeStrategy.position;
        tradeStrategy.status = args.body.status ?? tradeStrategy.status;
        await tradeStrategy.save();
        return { data: 'OK' };
    }
}

module.exports = new ThirdpartyRepository();
