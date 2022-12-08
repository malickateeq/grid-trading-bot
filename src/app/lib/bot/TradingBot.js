const tulind = require('tulind');
const BotOrder = require('../../models/BotOrder');
const Order = require('../../models/Order');
const ccxt = require('../../../bootstrap/ccxt');
const { num } = require('../../helpers/NumHelper');
const { getIntervalToUnixTimestamp } = require('./helpers');

class TradingBot {
    constructor(options = {}) {
        this.botOrderId = options.botOrderId;
    }

    async init() {
        await this.setOrder();
        await this.setExchangeDetails();
    }

    async exec() {
        if (this.botOrder.status === 0) await this.openNewOrderPosition();
        else if (this.botOrder.status === 1) await this.watchRunningOrderBot();
    }

    async watchRunningOrderBot() {
        if (!this.currentOrder) {
            await this.openNewOrderPosition();
        } else {
            await this.fetchSingleOpenOrder();
            if (this.openOrderStatus.status === 'closed') {
                this.logOrderDetails({ message: 'Order closed in reintrospection' });
                this.closeOrder();
            }
            this.intervalInMs = getIntervalToUnixTimestamp(this.tradeStrategy.hold_position_for);
            if (this.currentOrder.time + this.intervalInMs <= Date.now()) {
                await this.fetchSingleOpenOrder();
                if (this.openOrderStatus.status === 'closed') {
                    this.logOrderDetails({ message: 'Order closed in reintrospection' });
                    this.closeOrder();
                } else if (this.openOrderStatus.status === 'open') {
                    if (this.currentOrder.order_side === 'buy') {
                        const cancelStatus = await this.cancelOrder();
                        this.logOrderDetails({
                            message: 'Readjusting buy order in reintrospection.',
                        });
                    } else {
                        const cancelStatus = await this.cancelOrder();
                        this.logOrderDetails({
                            message: 'Readjusting sell order in reintrospection.',
                        });
                        // this.logOrderDetails({
                        //     message: 'Holding onto sell order in reintrospection.',
                        // });
                    }
                }
            } else {
                const waitInMinutes = this.currentOrder.time + this.intervalInMs - Date.now() / 1000 / 60;
                console.log('Wait for: ' + num(waitInMinutes, 2) + ' minutes');
            }
        }
    }

    /**
     * Get Assets of Cuurent Market
     */
    async setAccounts() {
        try {
            this.accounts = await this.exchange.fetchBalance();
            this.tradeCoinAccount = this.accounts[this.tradeCoin];
            this.baseCoinAccount = this.accounts[this.baseCoin];
        } catch (error) {}
    }

    /**
     * Set Order
     * Set Trade Strategy
     */
    async setOrder() {
        this.botOrder = await BotOrder.findOne({ _id: this.botOrderId })
            .populate('trade_strategy')
            .populate('current_order')
            .populate({
                path: 'user_thirdparty',
                populate: {
                    path: 'thirdparty',
                    model: 'Thirdparty',
                },
            });
        this.tradeStrategy = this.botOrder.trade_strategy;
        this.userThirdparty = this.botOrder.user_thirdparty;
        this.currentOrder = this.botOrder?.current_order;
        this.thirdparty = this.botOrder.user_thirdparty.thirdparty;
    }

    /**
     * Set Order Exchange
     */
    async setExchangeDetails() {
        // Market DEtails
        this.symbol = this.botOrder.symbol ?? 'ETH/USDT';
        this.market = this.symbol.split('/');
        this.baseCoin = this.market[0];
        this.tradeCoin = this.market[1];

        // CCXT Socket
        this.exchange = ccxt.exchanges[this.userThirdparty._id];
    }

    /**
     * All Open Orders in this Exchange
     */
    async fetchOpenOrders() {
        try {
            this.openOrders = await this.exchange.fetchOpenOrders(this.symbol);
            this.isOpenOrder = this.openOrders.length ?? 0;
        } catch (error) {}
    }

    /**
     * All existing Order
     */
    async fetchSingleOpenOrder() {
        try {
            this.openOrderStatus = await this.exchange.fetchOrder(
                this.botOrder.current_order.references.id,
                this.symbol
            );
            await Order.findOneAndUpdate(
                { _id: this.botOrder.current_order._id },
                { references: this.openOrderStatus }
            );
        } catch (error) {}
    }

    /**
     * Cancel an order
     */
    async cancelOrder() {
        try {
            this.cancelOrderStatus = await this.exchange.cancelOrder(this.currentOrder.references.id, this.symbol);
            await Order.findOneAndUpdate(
                { _id: this.currentOrder._id },
                { cancel_references: this.cancelOrderStatus, status: 4 }
            );
            await BotOrder.findOneAndUpdate({ _id: this.botOrder._id }, { current_order: null });
            this.currentOrder = null;
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Mark an order as complete
     */
    async closeOrder() {
        try {
            await Order.findOneAndUpdate(
                { _id: this.botOrder.current_order._id },
                { references: this.openOrderStatus, status: 1 }
            );
            await BotOrder.findOneAndUpdate(
                { _id: this.botOrder._id },
                {
                    current_order: null,
                    current_order_side: this.currentOrder.order_side === 'buy' ? 'sell' : 'buy',
                    buy_price:
                        this.currentOrder.order_side === 'buy' ? this.currentOrder.price : this.botOrder.buy_price,
                    sell_price:
                        this.currentOrder.order_side === 'sell' ? this.currentOrder.price : this.botOrder.sell_price,
                }
            );
            if (this.botOrder?.sell_spending.type === 'carry' && this.currentOrder.order_side === 'buy') {
                await BotOrder.findOneAndUpdate(
                    { _id: this.botOrder._id },
                    {
                        sell_spending: {
                            ...this.botOrder.sell_spending,
                            value: this.currentOrder.amount,
                        },
                    }
                );
            } else if (this.botOrder?.buy_spending.type === 'carry' && this.currentOrder.order_side === 'sell') {
                await BotOrder.findOneAndUpdate(
                    { _id: this.botOrder._id },
                    {
                        buy_spending: {
                            ...this.botOrder.buy_spending,
                            value: this.currentOrder.amount * this.currentOrder.price,
                        },
                    }
                );
            }
            this.currentOrder = null;
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * RSI Algorithm
     */
    async setRSIValue() {
        // No need to update RSI Mark for the same timeinterval if already calculated
        // And we have averaeg Price
        const timeframeInMS = getIntervalToUnixTimestamp(this.tradeStrategy?.ohlcv.timeframe, 'combined');
        if (this.botOrder?.rsi.last_update + timeframeInMS > Date.now() && this.avgPrice) {
            return true;
        }

        try {
            if (this.exchange.has['fetchOHLCV']) {
                this.candles = await this.exchange.fetchOHLCV(
                    this.symbol,
                    this.tradeStrategy?.ohlcv.timeframe ?? '1d',
                    this.tradeStrategy?.ohlcv.since,
                    this.tradeStrategy?.ohlcv.limit ?? 3,
                    this.tradeStrategy?.ohlcv.params ?? { price: 'mark' }
                );

                this.avgPrice =
                    (this.candles[this.candles.length - 1][2] + this.candles[this.candles.length - 1][3]) / 2;

                const close = this.candles.map((d) => d[4]);
                let rsiMark = 0;
                tulind.indicators.rsi.indicator([close], [this.tradeStrategy?.ohlcv.limit - 1], (err, res) => {
                    if (err) {
                        console.log(err);
                    } else {
                        rsiMark = res[0][0];
                    }
                });
                this.botOrder.rsi.mark = rsiMark;
                console.log(rsiMark);
                await BotOrder.findOneAndUpdate(
                    { _id: this.botOrder._id },
                    { 'rsi.mark': rsiMark, 'rsi.last_update': Date.now() }
                );
            }
        } catch (error) {
            console.log(error);
        }
    }

    /**
     * Set amounts
     */
    setAmounts() {
        if (this.botOrder.current_order_side === 'buy') {
            if (this.botOrder.buy_spending.type === 'fixed') {
                this.amount = this.botOrder.buy_spending.value;
            } else if (this.botOrder.buy_spending.type === 'percentage') {
                this.amount = this.tradeCoinAccount.free * (this.botOrder.buy_spending.value / 100);
            } else if (this.botOrder.buy_spending.type === 'carry') {
                this.amount = this.botOrder.buy_spending.value; // This division will be in open buy order / this.avgPrice;
            }
        } else if (this.botOrder.current_order_side === 'sell') {
            if (this.botOrder.sell_spending.type === 'fixed') {
                this.amount = this.botOrder.sell_spending.value;
            } else if (this.botOrder.sell_spending.type === 'percentage') {
                this.amount = this.baseCoinAccount.free * (this.botOrder.sell_spending.value / 100);
            } else if (this.botOrder.sell_spending.type === 'carry') {
                this.amount = this.botOrder.sell_spending.value;
            }
        }
    }

    /**
     * Check if we have availalbe balance to open this order
     */
    checkBalance() {
        console.log('Base Account: ', this.baseCoinAccount);
        console.log('Trade Account: ', this.tradeCoinAccount);
        console.log('amount needed: ', this.amount);
        if (
            (this.botOrder.current_order_side === 'buy' && this.amount > this.tradeCoinAccount.free) ||
            this.tradeCoinAccount.free <= 0
        ) {
            return false;
        } else if (
            (this.botOrder.current_order_side === 'sell' && this.amount > this.baseCoinAccount.free) ||
            this.tradeCoinAccount.free <= 0
        ) {
            return false;
        } else {
            return true;
        }
    }

    async openNewOrderPosition() {
        try {
            await this.setRSIValue();
            await this.setAccounts();
            this.setAmounts();
            if (!this.checkBalance()) {
                await BotOrder.findOneAndUpdate({ _id: this.botOrder._id }, { status: 3 });
                await this.logOrderDetails({ message: 'Failed BotOrder due to insufficient funds!' });
                return false;
            }
            if (this.botOrder.current_order_side === 'buy') await this.openBuyOrder();
            else if (this.botOrder.current_order_side === 'sell') await this.openSellOrder();
        } catch (error) {
            console.log(error);
        }
    }

    async openBuyOrder() {
        if (this.botOrder.rsi.mark <= this.tradeStrategy.rsi.low_mark) {
            const order = await this.createNewOrder({
                order_side: 'buy',
                amount: this.amount / this.avgPrice,
                price: this.avgPrice,
            });
            const orderReference = await this.exchange.createOrder(
                this.symbol,
                'limit',
                'buy',
                order.amount,
                order.price,
                {
                    clientOrderId: order._id,
                }
            );
            await Order.findOneAndUpdate(
                { _id: order._id },
                { references: orderReference, time: Date.now(), status: 2 }
            );
            await this.logOrderDetails({
                message: 'Buy position opened at RSI: ' + this.botOrder.rsi.mark,
            });
        } else {
            console.log('Waiting for a minimum mark!');
        }
    }

    async openSellOrder() {
        if (this.botOrder.rsi.mark >= this.tradeStrategy.rsi.high_mark) {
            if (this.botOrder.buy_price && this.avgPrice && this.botOrder.buy_price >= this.avgPrice) {
                await this.logOrderDetails({
                    message: 'Prevented Sell low at price: ' + this.avgPrice,
                });
                console.log('Prevented Sell low!');
                return;
            }
            const order = await this.createNewOrder({
                order_side: 'sell',
                amount: this.amount,
                price: this.avgPrice,
            });
            const orderReference = await this.exchange.createOrder(
                this.symbol,
                'limit',
                'sell',
                order.amount,
                order.price,
                {
                    clientOrderId: order._id,
                }
            );
            await Order.findOneAndUpdate(
                { _id: order._id },
                { references: orderReference, time: Date.now(), status: 2 }
            );
            await this.logOrderDetails({
                message: 'Sell position opened at RSI: ' + this.botOrder.rsi.mark,
            });
        } else {
            console.log('Waiting for a maximum mark!');
        }
    }

    async createNewOrder(options = {}) {
        const order = new Order();
        order.bot_order = this.botOrder._id;
        order.username = this.botOrder.username;
        order.symbol = options.symbol ?? this.symbol;
        order.amount = options.amount ?? this.amount;
        order.price = options.price ?? this.price;
        order.order_side = options.order_side ?? 'sell';
        await order.save();
        await BotOrder.findOneAndUpdate({ _id: this.botOrder._id }, { current_order: order._id, status: 1 });
        return order;
    }

    async logOrderDetails(log = {}) {
        await BotOrder.findOneAndUpdate({ _id: this.botOrder._id }, { $push: { logs: log } });
    }
}

module.exports = TradingBot;
