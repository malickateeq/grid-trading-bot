const { exchanges } = require('../../../bootstrap/ccxt');
const UserThirdparty = require('../../models/UserThirdparty');
const OHLCV = require('../../models/OHLCV');
var Bottleneck = require('bottleneck');

class DataStream {
    constructor() {
        if (DataStream.instance instanceof DataStream) {
            console.log('>>> Returning DataStream old instnce');
            return DataStream.instance;
        }
        this.status = false;
        this.listedExchanges = [];
        DataStream.instance = this;
        this.lastCandle = null;
        this.userThirdparties = [];

        this.limiter = new Bottleneck({
            maxConcurrent: 1,
            minTime: 10000,
        });

        console.log('>>> Initiating DataStream library...');
    }

    async setMarkets() {
        this.markets = [
            {
                name: 'kucoin:ETH/USDT',
                symbol: 'ETH/USDT',
                exchange: 'kucoin',
                status: 1,
            },
            // {
            //     name: 'kucoin:ADA/USDT',
            //     symbol: 'ADA/USDT',
            //     exchange: 'kucoin',
            //     status: 1,
            // },
        ];
    }

    async setThirdparties() {
        const userThirdpartiesRegs = await UserThirdparty.find({}).populate('thirdparty');
        for (const userThirdparty of userThirdpartiesRegs)
            this.userThirdparties[userThirdparty.thirdparty.slug] = userThirdparty;
    }

    async setWrapper() {
        this.fetchOhlcvLimit = this.limiter.wrap(async (options = {}) => {
            console.log('fetchOHLCV called!');
            return await exchanges[this.userThirdparties[options.market.exchange]._id].fetchOHLCV(
                options.symbol,
                options.timeframe,
                options.since,
                options.limit,
                options.params
            );
        });
    }

    async streamOHLCV() {
        (this.markets ?? []).forEach(async (market) => {
            if (this.userThirdparties[market.exchange]) {
                this.lastCandle = await OHLCV.findOne({
                    symbol: market.symbol,
                    exchange: market.exchange,
                }).sort('-timestamp');
                // let lastCandle = await OHLCV.findOne({
                //     symbol: market.symbol,
                //     exchange: market.exchange,
                // }).sort('-timestamp');

                // Fetch OHLCV since beginning
                if (!this.lastCandle) {
                    const candles = await this.fetchOhlcvLimit({
                        symbol: market.symbol,
                        timeframe: '1m',
                        since: undefined,
                        limit: 1000,
                        params: { price: 'mark' },
                        market: market,
                    });

                    for (const candle of candles) {
                        await OHLCV.create({
                            name: market.name,
                            symbol: market.symbol,
                            exchange: market.exchange,
                            timeframe: '1m',
                            timestamp: candle[0],
                            open: candle[1],
                            high: candle[2],
                            low: candle[3],
                            close: candle[4],
                            volume: candle[5],
                        });
                    }
                }

                // Start watching OHLCV
                while (true) {
                    try {
                        let watchCandles = await exchanges[this.userThirdparties[market.exchange]._id].watchOHLCV(
                            market.symbol,
                            '1m',
                            undefined,
                            undefined,
                            { price: 'mark' }
                        );
                        this.lastCandle = await OHLCV.findOne({
                            name: market.name,
                        }).sort('-timestamp');

                        let watchCandle = watchCandles[watchCandles.length - 1] ?? null;
                        if (!watchCandle) return;

                        console.log(`Candle count: ${watchCandles.length}`);
                        // console.log('New candle received: ', watchCandle);
                        // console.log('Last Candle: ' + this.lastCandle.timestamp);
                        console.log('Difference: ', parseInt(watchCandle[0]) - this.lastCandle.timestamp);
                        if (
                            parseInt(watchCandle[0]) - this.lastCandle.timestamp === 0 &&
                            this.lastCandle.name === market.name
                        ) {
                            console.log('Update existing:');
                            await OHLCV.findOneAndUpdate(
                                {
                                    // _id: this.lastCandle._id,
                                    name: market.name,
                                    timestamp: watchCandle[0],
                                },
                                {
                                    symbol: market.symbol,
                                    exchange: market.exchange,
                                    timestamp: watchCandle[0],
                                    open: watchCandle[1],
                                    high: watchCandle[2],
                                    low: watchCandle[3],
                                    close: watchCandle[4],
                                    volume: watchCandle[5],
                                },
                                { upsert: true }
                            );
                            console.log('Updated;');
                        }
                        // Insert new candles
                        else if (parseInt(watchCandle[0]) - this.lastCandle.timestamp === 60 * 1000) {
                            console.log('Insert new:');
                            await OHLCV.findOneAndUpdate(
                                {
                                    // _id: this.lastCandle._id,
                                    name: market.name,
                                    timestamp: watchCandle[0],
                                },
                                {
                                    symbol: market.symbol,
                                    exchange: market.exchange,
                                    timestamp: watchCandle[0],
                                    open: watchCandle[1],
                                    high: watchCandle[2],
                                    low: watchCandle[3],
                                    close: watchCandle[4],
                                    volume: watchCandle[5],
                                },
                                { upsert: true }
                            );
                            console.log('inserted;');
                        }
                        // Get missing candles
                        else if (parseInt(watchCandle[0]) - this.lastCandle.timestamp > 60 * 1000) {
                            console.log('Fetching missing:', this.lastCandle.timestamp);
                            // TODO: Wait for 0.5 minutes

                            const fetchMissingCaldles = await this.fetchOhlcvLimit({
                                symbol: market.symbol,
                                timeframe: '1m',
                                since: this.lastCandle.timestamp,
                                limit: undefined,
                                params: { price: 'mark' },
                                market: market,
                            });

                            (fetchMissingCaldles ?? []).forEach(async (fetchMissingCaldle) => {
                                await OHLCV.findOneAndUpdate(
                                    {
                                        name: market.name,
                                        timestamp: fetchMissingCaldle[0],
                                    },
                                    {
                                        symbol: market.symbol,
                                        exchange: market.exchange,
                                        timeframe: '1m',
                                        timestamp: fetchMissingCaldle[0],
                                        open: fetchMissingCaldle[1],
                                        high: fetchMissingCaldle[2],
                                        low: fetchMissingCaldle[3],
                                        close: fetchMissingCaldle[4],
                                        volume: fetchMissingCaldle[5],
                                    },
                                    { upsert: true }
                                );
                            });
                            console.log('Fetced;');
                        }
                    } catch (error) {
                        console.log(error);
                    }
                }
            }
        });
    }

    async init() {
        await this.setMarkets();
        await this.setThirdparties();
        await this.setWrapper();
        await this.streamOHLCV();

        // // Optional
        // Object.freeze(this);
        // Object.freeze(DataStream.instance);
    }
}

module.exports = new DataStream();
