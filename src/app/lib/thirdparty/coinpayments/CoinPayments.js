const ThirdpartyLogs = require('../../../models/ThirdpartyLogs');
const CoinPaymentsSDK = require('coinpayments');
const WalletAddress = require('../../../models/WalletAddress');
const { env } = require('@burency/common');

class CoinPayments {
    constructor(options = {}) {
        this.user = options.user;
        this.amount = options.amount;
        this.network = options.network;
        this.currency = options.currency;
        this.paymentMethod = options.paymentMethod;
        this.burencyTransactionId = options.transactionId;
    }

    async init() {
        const thirdpartyLog = new ThirdpartyLogs();
        thirdpartyLog.transaction_id = this.burencyTransactionId;
        thirdpartyLog.payment_method_id = this.paymentMethod._id;

        try {
            const credentials = {
                key: this.paymentMethod.configurations.public_key,
                secret: this.paymentMethod.configurations.private_key,
            };

            thirdpartyLog.api = { function: 'Initiate SDK' };
            thirdpartyLog.request = credentials;

            this.coinpaymentClient = new CoinPaymentsSDK(credentials);

            thirdpartyLog.response = this.coinpaymentClient;
            await thirdpartyLog.save();

            return true;
        } catch (error) {
            console.log(error);
            thirdpartyLog.response = error;
            await thirdpartyLog.save();
            return false;
        }
    }

    async setIpnUrl() {
        const thirdpartyLog = new ThirdpartyLogs();
        thirdpartyLog.transaction_id = this.burencyTransactionId;
        thirdpartyLog.payment_method_id = this.paymentMethod._id;

        try {
            // this.ipnURL = this.paymentMethod.configurations.ipn_url;
            this.ipnURL = env('APP_URL') + '/coinpayment-deposit-hook/' + this.burencyTransactionId;

            thirdpartyLog.api = { function: 'Set IPN URL' };
            thirdpartyLog.request = this.ipnURL;
            thirdpartyLog.response = this.ipnURL;
            await thirdpartyLog.save();
            return true;
        } catch (error) {
            console.log(error);
            thirdpartyLog.response = error;
            await thirdpartyLog.save();
            return false;
        }
    }

    async getDepositAddress() {
        const thirdpartyLog = new ThirdpartyLogs();
        thirdpartyLog.transaction_id = this.burencyTransactionId;
        thirdpartyLog.payment_method_id = this.paymentMethod._id;

        try {
            thirdpartyLog.api = { function: 'Get Deposit Address' };
            thirdpartyLog.request = { currency: this.currency.code };

            const depositAddress = await this.coinpaymentClient.getDepositAddress({
                currency: this.currency.code,
            });

            thirdpartyLog.response = depositAddress;
            await thirdpartyLog.save();

            console.log(depositAddress);
            return true;
        } catch (error) {
            console.log(error);
            thirdpartyLog.response = error;
            await thirdpartyLog.save();
            return false;
        }
    }

    async createTransaction() {
        const thirdpartyLog = new ThirdpartyLogs();
        thirdpartyLog.transaction_id = this.burencyTransactionId;
        thirdpartyLog.payment_method_id = this.paymentMethod._id;

        try {
            thirdpartyLog.api = { function: 'Get Deposit Address' };
            thirdpartyLog.request = {
                amount: this.amount,
                currency1: this.currency.code,
                currency2: this.currency.code,
                buyer_email: this.user.email,
                buyer_name: this.user.first_name,
                ipn_url: this.ipnURL,
                invoice: this.burencyTransactionId,
            };

            const addressQrTransaction = await this.coinpaymentClient.createTransaction({
                amount: this.amount,
                currency1: this.currency.code,
                currency2: this.currency.code,
                buyer_email: this.user.email,
                buyer_name: this.user.first_name,
                ipn_url: this.ipnURL,
                invoice: this.burencyTransactionId,
            });

            thirdpartyLog.response = addressQrTransaction;
            await thirdpartyLog.save();

            return addressQrTransaction;
        } catch (error) {
            console.log(error);
            thirdpartyLog.response = error;
            await thirdpartyLog.save();
            return false;
        }
    }

    async getWalletAddress() {
        const thirdpartyLog = new ThirdpartyLogs();
        thirdpartyLog.transaction_id = this.burencyTransactionId;
        thirdpartyLog.payment_method_id = this.paymentMethod._id;

        try {
            thirdpartyLog.api = { function: 'Get Deposit Address' };
            thirdpartyLog.request = {
                currency: this.currency.code + '.' + this.network.code,
                ipn_url: this.ipnURL,
                label: this.burencyTransactionId,
            };

            const depositWalletAddress = await this.coinpaymentClient.getCallbackAddress({
                currency: this.currency.code + '.' + this.network.code,
                ipn_url: this.ipnURL,
                label: this.burencyTransactionId,
            });

            thirdpartyLog.response = depositWalletAddress;
            await thirdpartyLog.save();

            return depositWalletAddress;
        } catch (error) {
            console.log(error);
            thirdpartyLog.response = error;
            await thirdpartyLog.save();
            return false;
        }
    }

    async execute() {
        if (await this.init())
            if (await this.setIpnUrl()) {
                const depositWalletAddress = await this.getWalletAddress();

                if (!depositWalletAddress) {
                    return {
                        status: false,
                        paymentStatus: 'failed',
                        depositWalletAddress,
                        message: 'Wallet address generation failed!',
                    };
                }
                //
                // {
                //     address: 'bnb1v3fqakzwmwvywhmwevju7e2c5hermw878fx9t4',
                //     dest_tag: 'D5f92f17dbd43c562'
                // }
                var extra = [];
                if (depositWalletAddress.address) {
                    extra.push({
                        title: 'Wallet Address',
                        name: 'wallet_address',
                        value: depositWalletAddress.address,
                        warning: 'Please enter your wallet address carefully; otherwise, you will lose your coins.',
                    });
                }
                if (depositWalletAddress.dest_tag) {
                    extra.push({
                        title: 'Destination tag',
                        name: 'dest_tag',
                        value: depositWalletAddress.desst_tag,
                        warning: 'Destination tag is required for correct deposit.',
                    });
                }
                const walletAddress = await WalletAddress.create({
                    user: this.user._id,
                    currency: this.currency._id,
                    network: this.network._id,
                    payment_method: this.paymentMethod._id,
                    address: depositWalletAddress.address,
                    type: 'deposit',
                    extra: extra,
                });
                return walletAddress;
            }

        return { status: false, paymentStatus: 'failed', message: 'Wallet address generation failed!' };
    }
}

module.exports = CoinPayments;
