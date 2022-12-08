const { Base } = require('@burency/common');
const UserThirdparty = require('../../models/UserThirdparty');

class UserThirdpartyRepository extends Base {
    constructor() {
        super();
    }

    async index(args) {
        const userThirdparty = await UserThirdparty.find({
            username: args.body.username,
        }).exec();
        return { data: userThirdparty };
    }
    async get(args) {
        const userThirdparty = await UserThirdparty.findOne({}).exec();
        return { data: userThirdparty };
    }
    async post(args) {
        const order = new UserThirdparty();
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
        const userThirdparty = await UserThirdparty.findOne({}).exec();
        if (!userThirdparty) return { data: 'FAILED' };
        userThirdparty.interval = args.body.interval;
        userThirdparty.timeframe = args.body.timeframe;
        userThirdparty.sample_count = args.body.sample_count;
        userThirdparty.symbol = args.body.symbol;
        userThirdparty.high_avg = args.body.high_avg;
        userThirdparty.low_avg = args.body.low_avg;
        userThirdparty.position = args.body.position;
        userThirdparty.status = args.body.status;
        await userThirdparty.save();
        return { data: 'OK' };
    }
    async patch(args) {
        const userThirdparty = await UserThirdparty.findOne({}).exec();
        if (!userThirdparty) return { data: 'FAILED' };
        userThirdparty.interval = args.body.interval ?? userThirdparty.interval;
        userThirdparty.timeframe = args.body.timeframe ?? userThirdparty.timeframe;
        userThirdparty.sample_count = args.body.sample_count ?? userThirdparty.sample_count;
        userThirdparty.symbol = args.body.symbol ?? userThirdparty.symbol;
        userThirdparty.high_avg = args.body.high_avg ?? userThirdparty.high_avg;
        userThirdparty.low_avg = args.body.low_avg ?? userThirdparty.low_avg;
        userThirdparty.position = args.body.position ?? userThirdparty.position;
        userThirdparty.status = args.body.status ?? userThirdparty.status;
        await userThirdparty.save();
        return { data: 'OK' };
    }
}

module.exports = new UserThirdpartyRepository();
