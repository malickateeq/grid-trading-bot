/**
 * OHLCV Algorithm
 * @returns
 */
const setOHLCVPrices = async () => {
    if (this.exchange.has['fetchOHLCV']) {
        // No need to update candles for the same timeinterval if already calculated
        const timeframeInMS = this.getIntervalToUnixTimestamp(this.tradeStrategy?.ohlcv.timeframe, 'combined');
        if (this.tradeStrategy?.ohlcv.last_update + timeframeInMS > Date.now()) {
            return true;
        }

        try {
            var candles = await this.exchange.fetchOHLCV(
                this.symbol,
                this.tradeStrategy?.ohlcv.timeframe ?? '1d',
                this.tradeStrategy?.ohlcv.since,
                this.tradeStrategy?.ohlcv.limit ?? 3,
                this.tradeStrategy?.ohlcv.params ?? { price: 'mark' }
            );

            // Calculate new prices
            let high = 0;
            let low = 0;
            for (let i = 1; i <= (this.tradeStrategy.ohlcv.limit ?? 3); i++) {
                if (candles.length - i >= 0) {
                    high += candles[candles.length - i][2];
                    low += candles[candles.length - i][3];
                }
            }
            high /= this.tradeStrategy.ohlcv.limit ?? 3;
            low /= this.tradeStrategy.ohlcv.limit ?? 3;
            await TradeStrategy.findOneAndUpdate(
                { _id: this.tradeStrategy._id },
                { 'ohlcv.high_avg': high, 'ohlcv.low_avg': low, 'ohlcv.last_update': Date.now() }
            );
            this.tradeStrategy.ohlcv = { ...this.tradeStrategy.ohlcv, high_avg: high, low_avg: low };
            console.log(`High: ${this.tradeStrategy.ohlcv.high_avg} Low ${this.tradeStrategy.ohlcv.low_avg}`);
        } catch (e) {
            console.log(e.message);
            throw new ApiError({ ...e, status: 500 });
        }
    }
};

const openOrderUsingOHLCVPrices = async () => {
    // Buy Low
    try {
        if (this.order.order_side === 'buy') {
            const order = await this.exchange.createOrder(
                this.symbol,
                'limit',
                'buy',
                this.amount / this.tradeStrategy.ohlcv.low_avg,
                this.tradeStrategy.ohlcv.low_avg,
                {
                    clientOrderId: this.order._id,
                }
            );
            await Order.findOneAndUpdate(
                { _id: this.order._id },
                {
                    order_side: 'buy',
                    references: order,
                    time: Date.now(),
                    status: 2,
                    amount: this.tradeCoinAccount.free / this.tradeStrategy.ohlcv.low_avg,
                    price: this.tradeStrategy.ohlcv.low_avg,
                }
            );
        }
        // Sell high
        else if (this.order.order_side === 'sell') {
            // Prevent loss sell
            const order = await this.exchange.createOrder(
                this.symbol,
                'limit',
                'sell',
                this.baseCoinAccount.free,
                this.tradeStrategy.ohlcv.high_avg,
                {
                    clientOrderId: this.order._id,
                }
            );
            await Order.findOneAndUpdate(
                { _id: this.order._id },
                {
                    order_side: 'sell',
                    references: order,
                    time: Date.now(),
                    status: 2,
                    amount: this.baseCoinAccount.free,
                    price: this.tradeStrategy.ohlcv.high_avg,
                }
            );
        }
    } catch (error) {}
};
