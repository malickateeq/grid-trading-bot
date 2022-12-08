const User = require('../models/User');
const Charge = require('../models/Charge');
const mongoose = require('mongoose');
const TransactionHelper = require('../lib/transaction/Helpers');
const Privileges = require('../models/Privilege');
const { num } = require('../helpers/NumHelper');
const ccxt = require('../../bootstrap/ccxt');
const CryptoCompare = require('../lib/thirdparty/cryptocompare');
const { ApiError } = require('@burency/common');

class PrivilegeHelper {
    constructor(options = {}) {
        this.charges = [];
        this.totalCharges = 0;
        this.price = options.price;
        this.amount = options.amount;
        this.orderType = options.orderType;
        this.orderSide = options.orderSide;

        this.applicableCharges = [];
        this.userId = options.userId;
        this.validations = { isValid: true };
        this.baseCurrencyId = options.baseCurrencyId;
        this.tradeCurrencyId = options.tradeCurrencyId;
        this.paymentMethodId = options.paymentMethodId;
        this.baseCurrencyType = options.baseCurrencyType;
        this.tradeCurrencyType = options.tradeCurrencyType;
        this.transactionTypeSlug = options.transactionTypeSlug;
        this.balanceAccountTypeSlug = options.paymentMethodId ?? 'main';
    }

    // Step#1
    async setSchema(options = {}) {
        this.user = await User.findOne({
            _id: this.userId,
        })
            .populate('group')
            .lean();

        // // Set User
        // this.user = Object.keys(this.user)
        // .filter(key => ["_id", "first_name", "last_name", "user_type", "email", "phone"].includes(key))
        // .reduce((obj, key) => {obj[key] = this.user[key];return obj;}, {});

        if (this.user?.group?.privileges === undefined) {
            throw new ApiError({
                status: 412,
                map: ['baseCurrencyId'],
                message: 'You do not have permission to perform this transaction!',
            });
        }
        var privilegeFilter = { 'transaction_type.slug': this.transactionTypeSlug };
        if (this.baseCurrencyId) privilegeFilter['base_currency._id'] = mongoose.Types.ObjectId(this.baseCurrencyId);
        if (this.tradeCurrencyId) privilegeFilter['trade_currency._id'] = mongoose.Types.ObjectId(this.tradeCurrencyId);
        if (this.baseCurrencyType) privilegeFilter['base_currency.type'] = this.baseCurrencyType;
        if (this.tradeCurrencyType) privilegeFilter['trade_currency.type'] = this.tradeCurrencyType;
        if (this.paymentMethodId) privilegeFilter['payment_method._id'] = mongoose.Types.ObjectId(this.paymentMethodId);

        this.privileges = await Privileges.find({
            _id: { $in: this.user.group.privileges },
            ...privilegeFilter,
        })
            .populate({
                path: 'base_currency',
                populate: { path: 'networks', model: 'BlockchainNetwork' },
            })
            .populate({
                path: 'trade_currency',
                populate: { path: 'networks', model: 'BlockchainNetwork' },
            })
            .exec();

        if (!this.privileges || this.privileges[0] === undefined) {
            throw new ApiError({
                status: 412,
                map: ['baseCurrencyId'],
                message: 'You do not have permission to perform this transaction!',
            });
        }
        this.privilege = this.privileges[0];
        if (this.privilege) {
            this.paymentMethod = this.privilege.payment_method;
            this.baseCurrency = this.privilege.base_currency;
            this.tradeCurrency = this.privilege.trade_currency;

            this.setApplicableCharges();
            this.setCurrencies();

            if (options.getMarketPrice) await this.getMarketPrice({});

            this.setFinanceValues();

            if (options.validate) this.validate();
            if (options.checkBalance) await this.checkBalance({ accountTypeSlug: this.balanceAccountTypeSlug });
            if (options.setCharges) await this.setCharges();

            this.setFinanceValues();
        }

        return true;
    }

    // Step#2
    async setAllowedCurrencies(options = {}) {
        for (const privilege of this.privileges ?? []) {
            if (options.baseCurrencies) {
                this.baseCurrencies ? this.baseCurrencies : (this.baseCurrencies = []);
                var found = false;
                this.baseCurrencies.forEach((existingCurrency) => {
                    if (existingCurrency._id.equals(privilege.base_currency._id)) found = true;
                });
                if (!found) this.baseCurrencies.push(privilege.base_currency);
            }
            if (options.tradeCurrencies) {
                this.tradeCurrencies ? this.tradeCurrencies : (this.tradeCurrencies = []);
                var found = false;
                this.tradeCurrencies.forEach((existingCurrency) => {
                    if (existingCurrency._id.equals(privilege.trade_currency._id)) found = true;
                });
                if (!found) this.tradeCurrencies.push(privilege.trade_currency);
            }
            if (options.markets) {
                this.markets ? this.markets : (this.markets = []);
                var found = false;

                if (!privilege.base_currency?.code || !privilege.trade_currency?.code) continue;

                var market = {
                    privilege_id: privilege._id,
                    _id: privilege.base_currency._id + '-' + privilege.trade_currency._id,
                    symbol: privilege.base_currency.code + '/' + privilege.trade_currency.code,
                    base_currency: privilege.base_currency,
                    trade_currency: privilege.trade_currency,
                    payment_method: privilege.payment_method,
                    limits: privilege.limits,
                };
                this.markets.forEach((existingMarket) => {
                    if (existingMarket._id === market._id) found = true;
                });

                if (!found) {
                    this.markets.push(market);
                }
            }
        }
        return true;
    }

    // Step#3
    setPaymentMethods(options = {}) {
        for (const privilege of this.privileges ?? []) {
            this.paymentMethods ? this.paymentMethods : (this.paymentMethods = []);
            var found = false;
            this.paymentMethods.forEach((existingMethod) => {
                if (existingMethod._id.equals(privilege.payment_method._id)) found = true;
            });
            if (!found) this.paymentMethods.push(privilege.payment_method);
        }
    }

    // Step#4
    validate(options = {}) {
        if (['deposit'].includes(this.transactionTypeSlug) && this.baseCurrency.type == 'fiat') {
            // Validate Amount
            if (this.amount < this.privilege?.limits?.amount?.min) {
                throw new ApiError({
                    status: 422,
                    map: ['amount'],
                    message: 'Minimum amount: ' + this.privilege.limits.amount.min,
                });
            } else if (this.amount > this.privilege?.limits?.amount?.max) {
                throw new ApiError({
                    status: 422,
                    map: ['amount'],
                    message: 'Maximum amount: ' + this.privilege?.limits?.amount?.max,
                });
            }
        } else if (['withdrawal'].includes(this.transactionTypeSlug) && this.baseCurrency.type == 'fiat') {
            // Validate Amount
            if (this.amount < this.privilege?.limits?.amount?.min) {
                throw new ApiError({
                    status: 422,
                    map: ['amount'],
                    message: 'Minimum amount: ' + this.privilege.limits.amount.min,
                });
            } else if (this.amount > this.privilege?.limits?.amount?.max) {
                throw new ApiError({
                    status: 422,
                    map: ['amount'],
                    message: 'Maximum amount: ' + this.privilege?.limits?.amount?.max,
                });
            }
        } else if (['order', 'convert', 'buy-crypto'].includes(this.transactionTypeSlug)) {
            // Validate Amount
            if (this.amount < this.privilege?.limits?.amount?.min) {
                throw new ApiError({
                    status: 422,
                    map: ['amount'],
                    message: 'Minimum amount: ' + this.privilege.limits.amount.min,
                });
            } else if (this.amount > this.privilege?.limits?.amount?.max) {
                throw new ApiError({
                    status: 422,
                    map: ['amount'],
                    message: 'Maximum amount: ' + this.privilege?.limits?.amount?.max,
                });
            }

            // Validate Price
            if (this.orderType == 'limit') {
                if (this.price < this.privilege?.limits?.price?.min) {
                    throw new ApiError({
                        status: 422,
                        map: ['price'],
                        message: 'Minimum price: ' + this.privilege.limits.price.min,
                    });
                } else if (this.price > this.privilege?.limits?.price?.max) {
                    throw new ApiError({
                        status: 422,
                        map: ['price'],
                        message: 'Maximum price: ' + this.privilege.limits.price.max,
                    });
                }
            }
        }
        return this.validations;
    }

    // Step#5
    async getMarketPrice(options = {}) {
        if (this.paymentMethod === null || this.baseCurrency === null || this.tradeCurrency === null) return false;

        try {
            const exchange = ccxt.exchanges[this.paymentMethod.slug];
            const marketTicker = await exchange.fetchTicker(this.baseCurrency.code + '/' + this.tradeCurrency.code);
            this.price = marketTicker.high;
        } catch (error) {
            try {
                this.price = await new CryptoCompare({
                    baseCurrency: this.baseCurrency,
                    tradeCurrency: this.tradeCurrency,
                }).checkRate();
            } catch (error) {
                throw new ApiError({
                    status: 400,
                    map: ['baseCurrencyId'],
                    message: 'Failed connecting to the market exchange!',
                });
            }
        }
    }

    // Step#6
    async checkBalance(options = {}) {
        if (!this.payingCurrency && !this.financeDetails.youWillPayAmount) {
            throw new ApiError({
                status: 422,
                map: ['amount'],
                message: 'Payment Currency is not enabled.',
            });
        }
        const account = await TransactionHelper.findAccount({
            user: this.user,
            accountOwnerType: options.accountOwnerType ?? 'USER',
            accountTypeSlug: options.accountTypeSlug ?? this.balanceAccountTypeSlug,
            currency: this.payingCurrency,
        });

        if (!account) {
            throw new ApiError({
                status: 422,
                map: ['amount'],
                message: "You don't have enough amount in your " + this.payingCurrency.code + ' account',
            });
        } else if (this.financeDetails.youWillPayAmount > account?.balance) {
            throw new ApiError({
                status: 422,
                map: ['amount'],
                message: "You don't have enough amount in your " + this.payingCurrency.code + ' account',
            });
        }
        this.balanceAccount = account;
        return this.validations;
    }

    // Step#7
    async setCharges(options = {}) {
        this.setFinanceValues();
        // Calculate Charges
        if (!this.chargeCurrency) {
            throw new ApiError({
                status: 400,
                map: ['amount'],
                message: 'Payment Currency is not enabled.',
            });
        }
        for (const charge of this.applicableCharges ?? []) {
            var chargeWithAccounts = await Charge.aggregate([
                { $match: { _id: charge._id } },
                {
                    $lookup: {
                        from: 'accounts',
                        localField: 'accounts',
                        foreignField: '_id',
                        as: 'accounts',
                        pipeline: [{ $match: { currency: mongoose.Types.ObjectId(this.chargeCurrency._id) } }],
                    },
                },
            ])
                .exec()
                .then((items) => items[0]);

            if (chargeWithAccounts === undefined) return;

            var chargeDetails = {
                _id: chargeWithAccounts._id,
                title: chargeWithAccounts.title,
                charge_percentage: (chargeWithAccounts.charge_percentage / 100) * this.financeDetails.youWillGetAmount,
                charge_fixed: chargeWithAccounts.charge_fixed,
            };

            if (chargeWithAccounts.accounts.length == 0) {
                const chargeAccount = await TransactionHelper.createAccount({
                    accountOwnerType: 'APP_ADMIN',
                    transactionTypeSlug: 'charge',
                    currency: this.chargeCurrency,
                });
                const chargeWithAccounts = await Charge.findOneAndUpdate(
                    { _id: charge._id },
                    { $push: { accounts: chargeAccount._id } }
                ).exec();
                chargeDetails.account = chargeAccount._id;
            } else {
                chargeDetails.account = chargeWithAccounts.accounts[0]._id;
            }
            this.charges.push(chargeDetails);
            this.totalCharges += num(chargeDetails.charge_percentage + chargeDetails.charge_fixed);
        }

        this.setFinanceValues();
        return this.charges;
    }

    /**
     * Privilege Helper Functions
     */
    setApplicableCharges() {
        if (this.transactionTypeSlug == 'deposit') {
            this.applicableCharges = this.privilege.charges;
        } else if (this.transactionTypeSlug == 'buy-crypto') {
            this.applicableCharges = this.privilege.taker_charges;
        } else if (this.transactionTypeSlug == 'withdrawal') {
            this.applicableCharges = this.privilege.charges;
        } else if (this.transactionTypeSlug == 'order' || this.transactionTypeSlug == 'convert') {
            if (this.orderType == 'market') {
                this.applicableCharges = this.privilege.taker_charges;
            } else if (this.orderType == 'limit') {
                this.applicableCharges = this.privilege.maker_charges;
            }
        }
    }
    setCurrencies(options = {}) {
        if (this.transactionTypeSlug == 'deposit') {
            this.chargeCurrency = this.baseCurrency;
            this.payingCurrency = this.baseCurrency;
            this.receivingCurrency = this.baseCurrency;
        } else if (this.transactionTypeSlug == 'buy-crypto') {
            this.payingCurrency = this.tradeCurrency;
            this.receivingCurrency = this.baseCurrency;
            this.chargeCurrency = this.baseCurrency;
        } else if (this.transactionTypeSlug == 'withdrawal') {
            this.payingCurrency = this.baseCurrency;
            this.receivingCurrency = this.baseCurrency;
            this.chargeCurrency = this.baseCurrency;
        } else if (['order', 'convert'].includes(this.transactionTypeSlug)) {
            if (this.orderSide == 'buy') {
                this.payingCurrency = this.tradeCurrency;
                this.receivingCurrency = this.baseCurrency;
                this.chargeCurrency = this.baseCurrency;
            } else if (this.orderSide == 'sell') {
                this.payingCurrency = this.baseCurrency;
                this.receivingCurrency = this.tradeCurrency;
                this.chargeCurrency = this.tradeCurrency;
            }
        }
    }
    setFinanceValues() {
        // Init
        this.financeDetails = {
            amount: this.amount,
            chargeCurrency: this.chargeCurrency,
            payingCurrency: this.payingCurrency,
            receivingCurrency: this.receivingCurrency,
            totalCharges: this.totalCharges,
            youWillGetAmount: this.amount,
            youWillPayAmount: this.amount,
        };
        if (this.transactionTypeSlug == 'deposit') {
            this.financeDetails.youWillGetAmount = this.amount - this.totalCharges;
            this.financeDetails.youWillPayAmount = this.amount;
        } else if (this.transactionTypeSlug == 'withdrawal') {
            this.financeDetails.youWillGetAmount = this.amount - this.totalCharges;
            this.financeDetails.youWillPayAmount = this.amount;
        } else if (this.transactionTypeSlug == 'buy-crypto') {
            this.financeDetails.youWillGetAmount = this.amount * this.price - this.totalCharges;
            this.financeDetails.price = this.price;
            this.financeDetails.youWillPayAmount = this.amount;
        } else if (this.transactionTypeSlug == 'order') {
            if (this.orderSide == 'buy') {
                this.financeDetails.youWillPayAmount = num(this.amount * this.price);
                this.financeDetails.youWillGetAmount = this.amount - this.totalCharges;
            } else if (this.orderSide == 'sell') {
                this.financeDetails.youWillPayAmount = this.amount;
                this.financeDetails.youWillGetAmount = num(this.amount * this.price) - this.totalCharges;
            }
            this.financeDetails.price = this.price;
        } else if (this.transactionTypeSlug == 'convert') {
            this.financeDetails.youWillPayAmount = this.amount;
            if (this.orderSide == 'buy') {
                this.financeDetails.youWillGetAmount = num(this.amount * this.price) - this.totalCharges;
            } else if (this.orderSide == 'sell') {
                this.financeDetails.youWillGetAmount = num(this.amount * this.price) - this.totalCharges;
            }
            this.financeDetails.price = this.price;
        }
    }

    /**
     * Find orderType and side for a C Pair
     *
     */
    static async findCurrencyPair(options = {}) {
        var privilege = new PrivilegeHelper({
            transactionTypeSlug: 'convert',
            userId: options.userId,
        });
        await privilege.setSchema();
        await privilege.setAllowedCurrencies({
            baseCurrencies: true,
            tradeCurrencies: true,
        });

        if (!privilege.baseCurrencies || !privilege.tradeCurrencies) {
            return false;
        }

        for (const baseCurr of privilege.baseCurrencies ?? []) {
            for (const tradeCurr of privilege.tradeCurrencies ?? []) {
                if (baseCurr._id.equals(options.fromCurrencyId) && tradeCurr._id.equals(options.toCurrencyId)) {
                    return {
                        baseCurrencyId: options.fromCurrencyId,
                        tradeCurrencyId: options.toCurrencyId,
                        orderSide: 'sell',
                    };
                } else if (baseCurr._id.equals(options.toCurrencyId) && tradeCurr._id.equals(options.fromCurrencyId)) {
                    return {
                        baseCurrencyId: options.toCurrencyId,
                        tradeCurrencyId: options.fromCurrencyId,
                        orderSide: 'buy',
                    };
                }
            }
        }
        return false;
    }
}

module.exports = PrivilegeHelper;
