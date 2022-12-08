const UserThirdparty = require('./index');
const Thirdparty = require('../Thirdparty');

class Seeder {
    static async run() {
        const binanceThirdparty = await Thirdparty.findOne({ slug: 'binance' }).exec();
        const kucoinTthirdparty = await Thirdparty.findOne({ slug: 'kucoin' }).exec();
        const userThirdparty = await UserThirdparty.find({}).exec();
        if (userThirdparty.length === 0 && binanceThirdparty) {
            await UserThirdparty.insertMany([
                {
                    thirdparty: binanceThirdparty._id,
                    username: 'malikatique',
                    configurations: {
                        apiKey: 'e7ayUHKDCRUjRNPbGe9jT8NAMLALZAWGUQQM7VuiXAKX21RzgF3ShOl6eFnGzTIH',
                        secret: 'KahcN2BrTkH4HWsUYq1QVh8hPnSt4wgO3HQ4hUvrIxjD0nxvtP14NnxuRwL4sFcT',
                        mode: 'live',
                        watch_orders: 'enable',
                    },
                    status: 1,
                },
            ]);
            await UserThirdparty.insertMany([
                {
                    thirdparty: kucoinTthirdparty._id,
                    username: 'malikatique',
                    configurations: {
                        apiKey: '6253d6935f395300010b6c6a',
                        secret: '227e409c-4856-4d13-9dd1-17a4e2cbc8b6',
                        password: 'testapisonburencyviaccxt',
                        mode: 'live',
                        watch_orders: 'enable',
                    },
                    status: 1,
                },
            ]);
        }
    }
}

module.exports = Seeder;
