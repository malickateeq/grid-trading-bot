const Order = require('../../models/Order');
const BotOrder = require('../../models/BotOrder');
const ccxt = require('../../../bootstrap/ccxt');
const UserThirdparty = require('../../models/UserThirdparty');
const TradingBot = require('./TradingBot');
const { logWarn, logInfo } = require('../../helpers/chalk');

class WatchOrders {
    /**
     * Watch order for changes in its completion
     * @param {*} req
     * @param {*} res
     * @returns
     */
    static async watch() {
        if (!ccxt.status) {
            await WatchOrders.sleep(3000);
        }

        // 1. Watch KucCoin Orders
        const userThirdparties = await UserThirdparty.find({}).populate('thirdparty').exec();

        (userThirdparties ?? []).forEach(async (userThirdparty) => {
            if (
                userThirdparty?.configurations !== undefined &&
                userThirdparty.configurations.watch_orders === 'enable'
            ) {
                let connectionRetries = 0;
                let whileConncted = true;
                while (whileConncted) {
                    try {
                        const exchange = ccxt.exchanges[userThirdparty._id];
                        if (!exchange) return;

                        if (userThirdparty.configurations.mode == 'sandbox') await exchange.setSandboxMode(true);

                        logInfo('Watch Orders Start: ' + userThirdparty.thirdparty.name);

                        const orders = await exchange.watchOrders();

                        orders.forEach(async (order) => {
                            console.log('Watching order: ', order);
                            // 1. Update References
                            const pendingOrder = await Order.findOne({
                                _id: order.clientOrderId,
                                status: { $in: [2] },
                            }).exec();
                            if (pendingOrder) {
                                pendingOrder.references = order;
                                await pendingOrder.save();
                                if (order.status == 'closed') {
                                    // pendingOrder.status = 1;
                                    // await pendingOrder.save();
                                    // await BotOrder.findOneAndUpdate(
                                    //     { _id: pendingOrder.bot_order },
                                    //     {
                                    //         currenct_order: null,
                                    //         current_order_side: pendingOrder.order_side === 'buy' ? 'sell' : 'buy',
                                    //     }
                                    // );
                                }
                            }
                        });
                    } catch (error) {
                        connectionRetries++;
                        if (connectionRetries > 2) {
                            whileConncted = false;
                        }
                        console.log('**********************************');
                        console.log('Watch Orders Catch: ' + userThirdparties.thirdparty?.name, error);
                        console.log('**********************************');
                    }
                    console.log('**********************************');
                    console.log('Watch Orders End');
                    console.log('**********************************');
                }
            }
        });
    }

    static sleep(time) {
        return new Promise((resolve) => setTimeout(resolve, time));
    }
}

module.exports = WatchOrders;
