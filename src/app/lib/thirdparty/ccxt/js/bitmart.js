'use strict';

//  ---------------------------------------------------------------------------

const ccxt = require ('ccxt');
const { ArgumentsRequired, AuthenticationError } = require ('ccxt/js/base/errors');
const { ArrayCache, ArrayCacheByTimestamp } = require ('./base/Cache');

//  ---------------------------------------------------------------------------

module.exports = class bitmart extends ccxt.bitmart {
    describe () {
        return this.deepExtend (super.describe (), {
            'has': {
                'ws': true,
                'watchTicker': true,
                'watchOrderBook': true,
                'watchTrades': true,
                'watchOHLCV': true,
            },
            'urls': {
                'api': {
                    'ws': 'wss://ws-manager-compress.{hostname}?protocol=1.1',
                },
            },
            'options': {
                'watchOrderBook': {
                    'depth': 'depth5', // depth5, depth400
                },
                // 'watchBalance': 'spot', // margin, futures, swap
                'ws': {
                    'inflate': true,
                },
                'timeframes': {
                    '1m': '1m',
                    '3m': '3m',
                    '5m': '5m',
                    '15m': '15m',
                    '30m': '30m',
                    '45m': '45m',
                    '1h': '1H',
                    '2h': '2H',
                    '3h': '3H',
                    '4h': '4H',
                    '1d': '1D',
                    '1w': '1W',
                    '1M': '1M',
                },
            },
            'streaming': {
                'keepAlive': 15000,
            },
        });
    }

    async subscribe (channel, symbol, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const url = this.implodeHostname (this.urls['api']['ws']);
        const messageHash = market['type'] + '/' + channel + ':' + market['id'];
        const request = {
            'op': 'subscribe',
            'args': [ messageHash ],
        };
        return await this.watch (url, messageHash, this.deepExtend (request, params), messageHash);
    }

    async watchTrades (symbol, since = undefined, limit = undefined, params = {}) {
        const trades = await this.subscribe ('trade', symbol, params);
        if (this.newUpdates) {
            limit = trades.getLimit (symbol, limit);
        }
        return this.filterBySinceLimit (trades, since, limit, 'timestamp', true);
    }

    async watchTicker (symbol, params = {}) {
        return await this.subscribe ('ticker', symbol, params);
    }

    handleTrade (client, message) {
        //
        //     {
        //         table: 'spot/trade',
        //         data: [
        //             {
        //                 price: '52700.50',
        //                 s_t: 1630982050,
        //                 side: 'buy',
        //                 size: '0.00112',
        //                 symbol: 'BTC_USDT'
        //             },
        //         ]
        //     }
        //
        const table = this.safeString (message, 'table');
        const data = this.safeValue (message, 'data', []);
        const tradesLimit = this.safeInteger (this.options, 'tradesLimit', 1000);
        for (let i = 0; i < data.length; i++) {
            const trade = this.parseTrade (data[i]);
            const symbol = trade['symbol'];
            const marketId = this.safeString (trade['info'], 'symbol');
            const messageHash = table + ':' + marketId;
            let stored = this.safeValue (this.trades, symbol);
            if (stored === undefined) {
                stored = new ArrayCache (tradesLimit);
                this.trades[symbol] = stored;
            }
            stored.append (trade);
            client.resolve (stored, messageHash);
        }
        return message;
    }

    handleTicker (client, message) {
        //
        //     {
        //         data: [
        //             {
        //                 base_volume_24h: '78615593.81',
        //                 high_24h: '52756.97',
        //                 last_price: '52638.31',
        //                 low_24h: '50991.35',
        //                 open_24h: '51692.03',
        //                 s_t: 1630981727,
        //                 symbol: 'BTC_USDT'
        //             }
        //         ],
        //         table: 'spot/ticker'
        //     }
        //
        const table = this.safeString (message, 'table');
        const data = this.safeValue (message, 'data', []);
        for (let i = 0; i < data.length; i++) {
            const ticker = this.parseTicker (data[i]);
            const symbol = ticker['symbol'];
            const marketId = this.safeString (ticker['info'], 'symbol');
            const messageHash = table + ':' + marketId;
            this.tickers[symbol] = ticker;
            client.resolve (ticker, messageHash);
        }
        return message;
    }

    async watchOHLCV (symbol, timeframe = '1m', since = undefined, limit = undefined, params = {}) {
        const timeframes = this.safeValue (this.options, 'timeframes', {});
        const interval = this.safeString (timeframes, timeframe);
        const name = 'kline' + interval;
        const ohlcv = await this.subscribe (name, symbol, params);
        if (this.newUpdates) {
            limit = ohlcv.getLimit (symbol, limit);
        }
        return this.filterBySinceLimit (ohlcv, since, limit, 0, true);
    }

    handleOHLCV (client, message) {
        //
        //     {
        //         data: [
        //             {
        //                 candle: [
        //                     1631056350,
        //                     '46532.83',
        //                     '46555.71',
        //                     '46511.41',
        //                     '46555.71',
        //                     '0.25'
        //                 ],
        //                 symbol: 'BTC_USDT'
        //             }
        //         ],
        //         table: 'spot/kline1m'
        //     }
        //
        const table = this.safeString (message, 'table');
        const data = this.safeValue (message, 'data', []);
        const parts = table.split ('/');
        const part1 = this.safeString (parts, 1);
        const interval = part1.replace ('kline', '');
        // use a reverse lookup in a static map instead
        const timeframes = this.safeValue (this.options, 'timeframes', {});
        const timeframe = this.findTimeframe (interval, timeframes);
        const duration = this.parseTimeframe (timeframe);
        const durationInMs = duration * 1000;
        for (let i = 0; i < data.length; i++) {
            const marketId = this.safeString (data[i], 'symbol');
            const candle = this.safeValue (data[i], 'candle');
            const market = this.safeMarket (marketId);
            const symbol = market['symbol'];
            const parsed = this.parseOHLCV (candle, market);
            parsed[0] = parseInt (parsed[0] / durationInMs) * durationInMs;
            this.ohlcvs[symbol] = this.safeValue (this.ohlcvs, symbol, {});
            let stored = this.safeValue (this.ohlcvs[symbol], timeframe);
            if (stored === undefined) {
                const limit = this.safeInteger (this.options, 'OHLCVLimit', 1000);
                stored = new ArrayCacheByTimestamp (limit);
                this.ohlcvs[symbol][timeframe] = stored;
            }
            stored.append (parsed);
            const messageHash = table + ':' + marketId;
            client.resolve (stored, messageHash);
        }
    }

    async watchOrderBook (symbol, limit = undefined, params = {}) {
        const options = this.safeValue (this.options, 'watchOrderBook', {});
        const depth = this.safeString (options, 'depth', 'depth400');
        const orderbook = await this.subscribe (depth, symbol, params);
        return orderbook.limit (limit);
    }

    handleDelta (bookside, delta) {
        const price = this.safeFloat (delta, 0);
        const amount = this.safeFloat (delta, 1);
        bookside.store (price, amount);
    }

    handleDeltas (bookside, deltas) {
        for (let i = 0; i < deltas.length; i++) {
            this.handleDelta (bookside, deltas[i]);
        }
    }

    handleOrderBookMessage (client, message, orderbook) {
        //
        //     {
        //         asks: [
        //             [ '46828.38', '0.21847' ],
        //             [ '46830.68', '0.08232' ],
        //             [ '46832.08', '0.09285' ],
        //             [ '46837.82', '0.02028' ],
        //             [ '46839.43', '0.15068' ]
        //         ],
        //         bids: [
        //             [ '46820.78', '0.00444' ],
        //             [ '46814.33', '0.00234' ],
        //             [ '46813.50', '0.05021' ],
        //             [ '46808.14', '0.00217' ],
        //             [ '46808.04', '0.00013' ]
        //         ],
        //         ms_t: 1631044962431,
        //         symbol: 'BTC_USDT'
        //     }
        //
        const asks = this.safeValue (message, 'asks', []);
        const bids = this.safeValue (message, 'bids', []);
        this.handleDeltas (orderbook['asks'], asks);
        this.handleDeltas (orderbook['bids'], bids);
        const timestamp = this.safeInteger (message, 'ms_t');
        const marketId = this.safeString (message, 'symbol');
        const symbol = this.safeSymbol (marketId);
        orderbook['symbol'] = symbol;
        orderbook['timestamp'] = timestamp;
        orderbook['datetime'] = this.iso8601 (timestamp);
        return orderbook;
    }

    handleOrderBook (client, message) {
        //
        //     {
        //         data: [
        //             {
        //                 asks: [
        //                     [ '46828.38', '0.21847' ],
        //                     [ '46830.68', '0.08232' ],
        //                     [ '46832.08', '0.09285' ],
        //                     [ '46837.82', '0.02028' ],
        //                     [ '46839.43', '0.15068' ]
        //                 ],
        //                 bids: [
        //                     [ '46820.78', '0.00444' ],
        //                     [ '46814.33', '0.00234' ],
        //                     [ '46813.50', '0.05021' ],
        //                     [ '46808.14', '0.00217' ],
        //                     [ '46808.04', '0.00013' ]
        //                 ],
        //                 ms_t: 1631044962431,
        //                 symbol: 'BTC_USDT'
        //             }
        //         ],
        //         table: 'spot/depth5'
        //     }
        //
        const data = this.safeValue (message, 'data', []);
        const table = this.safeString (message, 'table');
        const parts = table.split ('/');
        const lastPart = this.safeString (parts, 1);
        const limitString = lastPart.replace ('depth', '');
        const limit = parseInt (limitString);
        for (let i = 0; i < data.length; i++) {
            const update = data[i];
            const marketId = this.safeString (update, 'symbol');
            const symbol = this.safeSymbol (marketId);
            let orderbook = this.safeValue (this.orderbooks, symbol);
            if (orderbook === undefined) {
                orderbook = this.orderBook ({}, limit);
                this.orderbooks[symbol] = orderbook;
            }
            orderbook.reset ({});
            this.handleOrderBookMessage (client, update, orderbook);
            const messageHash = table + ':' + marketId;
            client.resolve (orderbook, messageHash);
        }
        return message;
    }

    async authenticate (params = {}) {
        this.checkRequiredCredentials ();
        const url = this.urls['api']['ws'];
        const messageHash = 'login';
        const client = this.client (url);
        let future = this.safeValue (client.subscriptions, messageHash);
        if (future === undefined) {
            future = client.future ('authenticated');
            const timestamp = this.seconds ().toString ();
            const method = 'GET';
            const path = '/users/self/verify';
            const auth = timestamp + method + path;
            const signature = this.hmac (this.encode (auth), this.encode (this.secret), 'sha256', 'base64');
            const request = {
                'op': messageHash,
                'args': [
                    this.apiKey,
                    this.password,
                    timestamp,
                    signature,
                ],
            };
            this.spawn (this.watch, url, messageHash, request, messageHash, future);
        }
        return await future;
    }

    async subscribeToUserAccount (negotiation, params = {}) {
        const defaultType = this.safeString2 (this.options, 'watchBalance', 'defaultType');
        const type = this.safeString (params, 'type', defaultType);
        if (type === undefined) {
            throw new ArgumentsRequired (this.id + " watchBalance requires a type parameter (one of 'spot', 'margin', 'futures', 'swap')");
        }
        await this.loadMarkets ();
        const currencyId = this.safeString (params, 'currency');
        const code = this.safeString (params, 'code', this.safeCurrencyCode (currencyId));
        let currency = undefined;
        if (code !== undefined) {
            currency = this.currency (code);
        }
        const marketId = this.safeString (params, 'instrument_id');
        const symbol = this.safeString (params, 'symbol');
        let market = undefined;
        if (symbol !== undefined) {
            market = this.market (symbol);
        } else if (marketId !== undefined) {
            if (marketId in this.markets_by_id) {
                market = this.markets_by_id[marketId];
            }
        }
        const marketUndefined = (market === undefined);
        const currencyUndefined = (currency === undefined);
        if (type === 'spot') {
            if (currencyUndefined) {
                throw new ArgumentsRequired (this.id + " watchBalance requires a 'currency' (id) or a unified 'code' parameter for " + type + ' accounts');
            }
        } else if ((type === 'margin') || (type === 'swap') || (type === 'option')) {
            if (marketUndefined) {
                throw new ArgumentsRequired (this.id + " watchBalance requires a 'instrument_id' (id) or a unified 'symbol' parameter for " + type + ' accounts');
            }
        } else if (type === 'futures') {
            if (currencyUndefined && marketUndefined) {
                throw new ArgumentsRequired (this.id + " watchBalance requires a 'currency' (id), or unified 'code', or 'instrument_id' (id), or unified 'symbol' parameter for " + type + ' accounts');
            }
        }
        let suffix = undefined;
        if (!currencyUndefined) {
            suffix = currency['id'];
        } else if (!marketUndefined) {
            suffix = market['id'];
        }
        const accountType = (type === 'margin') ? 'spot' : type;
        const account = (type === 'margin') ? 'margin_account' : 'account';
        const messageHash = accountType + '/' + account;
        const subscriptionHash = messageHash + ':' + suffix;
        const url = this.urls['api']['ws'];
        const request = {
            'op': 'subscribe',
            'args': [ subscriptionHash ],
        };
        const query = this.omit (params, [ 'currency', 'code', 'instrument_id', 'symbol', 'type' ]);
        return await this.watch (url, messageHash, this.deepExtend (request, query), subscriptionHash);
    }

    handleSubscriptionStatus (client, message) {
        //
        //     {"event":"subscribe","channel":"spot/depth:BTC-USDT"}
        //
        // const channel = this.safeString (message, 'channel');
        // client.subscriptions[channel] = message;
        return message;
    }

    handleAuthenticate (client, message) {
        //
        //     { event: 'login', success: true }
        //
        client.resolve (message, 'authenticated');
        return message;
    }

    handleErrorMessage (client, message) {
        //
        //     { event: 'error', message: 'Invalid sign', errorCode: 30013 }
        //     {"event":"error","message":"Unrecognized request: {\"event\":\"subscribe\",\"channel\":\"spot/depth:BTC-USDT\"}","errorCode":30039}
        //
        const errorCode = this.safeString (message, 'errorCode');
        try {
            if (errorCode !== undefined) {
                const feedback = this.id + ' ' + this.json (message);
                this.throwExactlyMatchedException (this.exceptions['exact'], errorCode, feedback);
                const messageString = this.safeValue (message, 'message');
                if (messageString !== undefined) {
                    this.throwBroadlyMatchedException (this.exceptions['broad'], messageString, feedback);
                }
            }
        } catch (e) {
            if (e instanceof AuthenticationError) {
                client.reject (e, 'authenticated');
                const method = 'login';
                if (method in client.subscriptions) {
                    delete client.subscriptions[method];
                }
                return false;
            }
        }
        return message;
    }

    handleMessage (client, message) {
        if (!this.handleErrorMessage (client, message)) {
            return;
        }
        //
        //     {"event":"error","message":"Unrecognized request: {\"event\":\"subscribe\",\"channel\":\"spot/depth:BTC-USDT\"}","errorCode":30039}
        //     {"event":"subscribe","channel":"spot/depth:BTC-USDT"}
        //     {
        //         table: "spot/depth",
        //         action: "partial",
        //         data: [
        //             {
        //                 instrument_id:   "BTC-USDT",
        //                 asks: [
        //                     ["5301.8", "0.03763319", "1"],
        //                     ["5302.4", "0.00305", "2"],
        //                 ],
        //                 bids: [
        //                     ["5301.7", "0.58911427", "6"],
        //                     ["5301.6", "0.01222922", "4"],
        //                 ],
        //                 timestamp: "2020-03-16T03:25:00.440Z",
        //                 checksum: -2088736623
        //             }
        //         ]
        //     }
        //
        const table = this.safeString (message, 'table');
        if (table === undefined) {
            const event = this.safeString (message, 'event');
            if (event !== undefined) {
                const methods = {
                    // 'info': this.handleSystemStatus,
                    // 'book': 'handleOrderBook',
                    'login': this.handleAuthenticate,
                    'subscribe': this.handleSubscriptionStatus,
                };
                const method = this.safeValue (methods, event);
                if (method === undefined) {
                    return message;
                } else {
                    return method.call (this, client, message);
                }
            }
        } else {
            const parts = table.split ('/');
            const name = this.safeString (parts, 1);
            const methods = {
                'depth': this.handleOrderBook,
                'depth5': this.handleOrderBook,
                'depth400': this.handleOrderBook,
                'ticker': this.handleTicker,
                'trade': this.handleTrade,
                // ...
            };
            let method = this.safeValue (methods, name);
            if (name.indexOf ('kline') >= 0) {
                method = this.handleOHLCV;
            }
            if (method === undefined) {
                return message;
            } else {
                return method.call (this, client, message);
            }
        }
    }
};
