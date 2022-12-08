const Transaction = require('../../models/Transaction');
const PaymentMethod = require('../../models/PaymentMethod');
const { default: mongoose } = require('mongoose');
const ThirdpartyLogs = require('../../models/ThirdpartyLogs');
const ccxt = require('../../../bootstrap/ccxt');
const { env, Stream } = require('@burency/common');
const Reversal = require('./Reversal');

class MatchingEngine {
    /**
     * Get Order Id from Kafka Queue and execute it at exchange
     * @param {*} options
     * @returns
     */
    static async execute(options = {}) {
        const thirdpartyLog = new ThirdpartyLogs();
        let pendingOrder = await Transaction.findOne({
            _id: mongoose.Types.ObjectId(options.transactionId),
            status: 0,
        }).exec();
        if (!pendingOrder) {
            return { message: options.orderId + ' order not found' };
        }

        try {
            // 2. Execute order at CCXT
            const exchangeMethod = await PaymentMethod.findOne({
                _id: pendingOrder.payment_method._id,
            }).exec();

            const exchange = ccxt.exchanges[pendingOrder.payment_method.slug];
            if (exchangeMethod.mode == 'sandbox') await exchange.setSandboxMode(true);

            thirdpartyLog.transaction_id = pendingOrder._id;
            thirdpartyLog.payment_method_id = exchangeMethod._id;
            thirdpartyLog.api = { function: 'createOrder' };

            thirdpartyLog.request = {
                symbol: pendingOrder.details.symbol,
                order_type: pendingOrder.details.order_type.slug,
                order_side: pendingOrder.details.order_side,
                amount: pendingOrder.amount,
                price: pendingOrder.price,
                others: {
                    clientOrderId: pendingOrder.uuid,
                },
            };
            var order = await exchange.createOrder(
                pendingOrder.details.symbol,
                pendingOrder.details.order_type.slug,
                pendingOrder.details.order_side,
                pendingOrder.amount,
                pendingOrder.price,
                {
                    clientOrderId: pendingOrder.uuid,
                }
            );
            console.log('Order executed: ', order);

            pendingOrder.references = order;
            await pendingOrder.save();
            thirdpartyLog.response = order;
            await thirdpartyLog.save();

            return { status: true, paymentStatus: 'processed', message: 'Order executed successfully!' };
        } catch (error) {
            pendingOrder.status = 3;
            await pendingOrder.save();

            thirdpartyLog.response = error;
            await thirdpartyLog.save();
            console.log('Order Execution Failed ', error);
            return { status: false, paymentStatus: 'failed', message: 'Order execution failed!' };
        }
    }

    /**
     * Watch order for changes in its completion
     * @param {*} req
     * @param {*} res
     * @returns
     */
    static async watch() {
        if (!ccxt.status) {
            await MatchingEngine.sleep(3000);
        }

        // 1. Watch KucCoin Orders
        const exchangeMethod = await PaymentMethod.findOne({
            slug: 'kucoin',
        }).exec();

        if (exchangeMethod?.configurations !== undefined && exchangeMethod.configurations.watch_orders === 'enable') {
            let connectionRetries = 0;
            while (true) {
                try {
                    const exchange = ccxt.exchanges[exchangeMethod.slug];
                    if (!exchange) return;

                    if (exchangeMethod.mode == 'sandbox') await exchange.setSandboxMode(true);

                    console.log('**********************************');
                    console.log('Watch Orders Start: ' + exchangeMethod.name);
                    console.log('**********************************');

                    const orders = await exchange.watchOrders();

                    orders.forEach(async (order) => {
                        console.log('Watching order: ', order);

                        // 1. Update References
                        const pendingOrder = await Transaction.findOne({
                            uuid: order.clientOrderId,
                            status: { $in: [0, 2] },
                        }).exec();
                        pendingOrder.references = order;
                        await pendingOrder.save();

                        // 2. Add Logs
                        const thirdpartyLog = new ThirdpartyLogs();
                        thirdpartyLog.transaction_id = pendingOrder._id;
                        thirdpartyLog.payment_method_id = exchangeMethod._id;
                        thirdpartyLog.api = { function: 'watchOrder' };
                        thirdpartyLog.request = {};
                        thirdpartyLog.response = order;
                        await thirdpartyLog.save();

                        // TODO: Add/Update References and Thirdparty logs
                        if (order.status == 'closed') {
                            await MatchingEngine.fulfilled({ order_uuid: order.clientOrderId });
                        }
                    });
                } catch (error) {
                    connectionRetries++;
                    if (connectionRetries > 30) {
                        //  Shutdown gracefully
                    }
                    console.log('**********************************');
                    console.log('Watch Orders Catch: ' + exchangeMethod.name, error);
                    console.log('**********************************');
                }
                console.log('**********************************');
                console.log('Watch Orders End');
                console.log('**********************************');
            }
        }
    }

    /**
     * Order Fulfilled
     */
    static async fulfilled(options = {}) {
        const pendingOrder = await Transaction.findOne({ uuid: options.order_uuid, status: { $in: [0, 2] } }).exec();
        if (!pendingOrder) return { message: options.order_uuid + ' order not found' };

        try {
            const exchangeMethod = await PaymentMethod.findOne({
                _id: pendingOrder.payment_method._id,
            }).exec();

            const exchange = ccxt.exchanges[pendingOrder.payment_method.slug];
            if (exchangeMethod.mode == 'sandbox') await exchange.setSandboxMode(true);

            console.log('Order Fulfilled#1 ', pendingOrder);
            const order = await exchange.fetchOrder(pendingOrder.references.id, pendingOrder.symbol);
            console.log('Order Fulfilled#2 ', order);
            pendingOrder.references = order;
            await pendingOrder.save();

            if (order.status == 'closed' && [1, 2].includes(pendingOrder.status)) {
                const thirdpartyLog = new ThirdpartyLogs();
                thirdpartyLog.transaction_id = pendingOrder._id;
                thirdpartyLog.payment_method_id = exchangeMethod._id;
                thirdpartyLog.api = { function: 'orderCompleted' };
                thirdpartyLog.request = {};
                thirdpartyLog.response = order;
                await thirdpartyLog.save();

                for (const transaction of pendingOrder.transactions) {
                    if (transaction.status === -1) transaction.status = 0;
                }
                pendingOrder.status = 0;
                await pendingOrder.save();

                const streamServer = new Stream({
                    clientId: env('KAFKA_CLIENT_ID'),
                    brokers: [env('KAFKA_BROKERS')],
                });
                const ackStreamServer = await streamServer.produce(
                    { transaction_id: pendingOrder._id },
                    {
                        topic: 'TRNX.TRANSACTION_CREATED',
                        acks: 1,
                    }
                );
            }
        } catch (error) {
            console.log('Order Fulfilled Failed Processing: ', error);
            console.log(error);
            pendingOrder.status = 3;
            await pendingOrder.save();
        }
    }

    /**
     * Cancel Order
     */
    static async cancelOrder(order) {
        try {
            const exchange = ccxt.exchanges[order.payment_method.slug];
            const cancelOrderResponse = await exchange.cancelOrder(order.references?.id, order.symbol);

            // TODO: Store cancelOrderResponse in Thirdparty Logs
            // Response
            // {
            //     code: '200000',
            //     data: { cancelledOrderIds: [ '6299a33b6648840001cd389e' ] }
            // }
            console.log('***************Cancel Order ccxt response*****************');
            console.log(cancelOrderResponse);
            console.log('***************Cancel Order ccxt response*****************');

            if (
                cancelOrderResponse.status == '200000' ||
                cancelOrderResponse?.data?.cancelledOrderIds?.includes(order.references?.id)
            ) {
                // Perform transaction reversal!
                const orderReversal = await Reversal.run({ transaction_id: order._id });
                return orderReversal;
            }
            return { status: false, message: 'Order not exist or not allow to cancel!' };
        } catch (error) {
            console.log(error);
            return { status: false, message: 'Order not exist or not allow to cancel!' };
        }
    }

    static sleep(time) {
        return new Promise((resolve) => setTimeout(resolve, time));
    }
}

module.exports = MatchingEngine;
