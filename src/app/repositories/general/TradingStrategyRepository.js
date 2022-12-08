const { Base } = require('@burency/common');
const TradeStrategy = require('../../models/TradeStrategy');

class TradingStrategyRepository extends Base {
    constructor() {
        super();
    }

    async index(args) {
        const tradeStrategy = await TradeStrategy.find({}).exec();
        return { data: tradeStrategy };
    }
    async get(args) {
        const tradeStrategy = await TradeStrategy.findOne({
            _id: args.params.id,
        }).exec();
        return { data: tradeStrategy };
    }
    async post(args) {
        const tradeStrategy = new TradeStrategy();
        tradeStrategy.hold_position_for = args.body.hold_position_for;
        tradeStrategy.ohlcv = args.body.ohlcv;
        tradeStrategy.rsi = args.body.rsi;
        tradeStrategy.status = args.body.status;
        await tradeStrategy.save();

        return { data: tradeStrategy };
    }
    async put(args) {
        const tradeStrategy = await TradeStrategy.findOne({
            _id: args.body._id,
        }).exec();
        if (!tradeStrategy) return { data: 'FAILED' };

        tradeStrategy.hold_position_for = args.body.hold_position_for;
        tradeStrategy.ohlcv = args.body.ohlcv;
        tradeStrategy.rsi = args.body.rsi;
        tradeStrategy.status = args.body.status;
        await tradeStrategy.save();
        return { data: tradeStrategy };
    }
    async patch(args) {
        const tradeStrategy = await TradeStrategy.findOne({
            _id: args.body._id,
        }).exec();
        if (!tradeStrategy) return { data: 'FAILED' };

        tradeStrategy.hold_position_for = args.body.hold_position_for ?? tradeStrategy.hold_position_for;
        tradeStrategy.ohlcv = args.body.ohlcv ?? tradeStrategy.ohlcv;
        tradeStrategy.rsi = args.body.rsi ?? tradeStrategy.rsi;
        tradeStrategy.status = args.body.status ?? tradeStrategy.status;
        await tradeStrategy.save();
        return { data: tradeStrategy };
    }
}

module.exports = new TradingStrategyRepository();
