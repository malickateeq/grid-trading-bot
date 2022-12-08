const TradingBot = require('../app/lib/bot/TradingBot');
const BotOrder = require('../app/models/BotOrder');
const WatchOrders = require('../app/lib/bot/WatchOrders');
var Bottleneck = require('bottleneck');

const botDaemon = async () => {
    // const botOrders = await BotOrder.find({ status: { $in: [0, 1] } });
    // (botOrders ?? []).forEach(async (botOrder) => {
    //     const tradingBot = new TradingBot({
    //         botOrderId: botOrder._id,
    //     });
    //     await tradingBot.init();
    //     await tradingBot.exec();
    // });
    // // WatchOrders.watch();
    // const limiter = new Bottleneck({
    //     maxConcurrent: 10,
    //     minTime: 1000,
    // });
    // const wrapped = limiter.wrap((arg1, arg2) => {
    //     console.log(arg2 + ' ' + arg1);
    // });
    // const result = await limiter.schedule(() => (arg1, arg2) => {
    //     console.log(arg2 + ' ' + arg1);
    // });
    // let count = 0;
    // [0, 1, 2, 3, 4].forEach(async (element) => {
    //     count++;
    //     const result = await wrapped(count, 'SHIB');
    // });
    // [0, 1, 2, 3, 4].forEach(async (element) => {
    //     count++;
    //     const result = await wrapped(count, 'BTC');
    // });
};

module.exports = { botDaemon };
