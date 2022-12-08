const Thirdparty = require('./index');

class Seeder {
    static async run() {
        const thirdparty = await Thirdparty.find({}).exec();
        if (thirdparty.length === 0) {
            await Thirdparty.insertMany([
                {
                    name: 'Binance',
                    slug: 'binance',
                    type: 'exchange',
                    description: 'Trading',
                    properties: [
                        {
                            title: 'API Key',
                            name: 'apiKey',
                            type: 'text',
                            default: null,
                            values: [],
                            required: true,
                        },
                        {
                            title: 'Secret',
                            name: 'secret',
                            type: 'text',
                            default: null,
                            values: [],
                            required: true,
                        },
                        {
                            title: 'Mode',
                            name: 'mode',
                            type: 'radio',
                            default: 'sandbox',
                            values: ['sandbox', 'live'],
                            required: true,
                        },
                        {
                            title: 'Enable Watching Orders?',
                            name: 'watch_orders',
                            type: 'checkbox',
                            default: '',
                            values: ['enable'],
                            required: true,
                        },
                    ],
                    status: 1,
                },
                {
                    name: 'KuCoin',
                    slug: 'kucoin',
                    type: 'exchange',
                    properties: [
                        {
                            title: 'API Key',
                            name: 'apiKey',
                            type: 'text',
                            default: null,
                            values: [],
                            required: true,
                        },
                        {
                            title: 'Secret',
                            name: 'secret',
                            type: 'text',
                            default: null,
                            values: [],
                            required: true,
                        },
                        {
                            title: 'Password',
                            name: 'password',
                            type: 'password',
                            default: null,
                            values: [],
                            required: true,
                        },
                        {
                            title: 'Mode',
                            name: 'mode',
                            type: 'radio',
                            default: 'sandbox',
                            values: ['sandbox', 'live'],
                            required: true,
                        },
                        {
                            title: 'Enable Watching Orders?',
                            name: 'watch_orders',
                            type: 'checkbox',
                            default: '',
                            values: ['enable'],
                            required: true,
                        },
                    ],
                    status: 1,
                },
            ]);
        }
    }
}

module.exports = Seeder;
