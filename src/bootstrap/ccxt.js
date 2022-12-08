const ccxt = require('../app/lib/thirdparty/ccxt/ccxt.pro');
const UserThirdparty = require('../app/models/UserThirdparty');

class CCXT {
    constructor() {
        if (CCXT.instance instanceof CCXT) {
            console.log('>>> Returning CCXT old instnce');
            return CCXT.instance;
        }
        this.status = false;
        this.totalExchanges = 0;
        this.exchanges = [];
        this.random = Math.random();
        CCXT.instance = this;

        console.log('>>> Initiating CCXT library');
    }

    async init() {
        var userThirdparties = await UserThirdparty.find({ slug: { $in: ['binance'] } }).populate('thirdparty');
        for (const userThirdparty of userThirdparties) {
            try {
                this.exchanges[userThirdparty._id] = new ccxt[userThirdparty.thirdparty.slug]({
                    enableRateLimit: true,
                    timeout: 20000,
                    ...userThirdparty.configurations,
                });
                console.log(userThirdparty.thirdparty.slug + ' connected with keys.');
                this.totalExchanges++;
            } catch (error) {
                try {
                    this.exchanges[userThirdparty.thirdparty.slug] = new ccxt[userThirdparty.thirdparty.slug]({
                        enableRateLimit: true,
                    });
                    await this.exchanges[userThirdparty.thirdparty.slug].loadMarkets();
                    this.totalExchanges++;
                    console.log(userThirdparty.thirdparty.slug + ' connected without keys.');
                } catch (error) {
                    console.log(userThirdparty.thirdparty.slug + ' connection failed!');
                }
            }
        }
        console.log(this.totalExchanges + ' exchanges has been initialized!');
        this.status = true;

        // Optional
        Object.freeze(this);
        Object.freeze(CCXT.instance);
    }
}

module.exports = new CCXT();
