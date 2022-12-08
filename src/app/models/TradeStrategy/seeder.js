const TradeStrategy = require('./index');

class Seeder {
    static async run() {
        const tradeStrategy = await TradeStrategy.find({}).exec();
        if (tradeStrategy.length === 0) {
            await TradeStrategy.insertMany([
                {
                    hold_position_for: '20-m',
                    ohlcv: {
                        timeframe: '15m',
                        limit: 3,
                    },
                },
            ]);
        }
    }
}

module.exports = Seeder;
