const mongoose = require('mongoose');
const User = require('../models/User');
const Charge = require('../models/Charge');
const TransactionHelper = require('../lib/transaction/Helpers');
const Privileges = require('../models/Privilege');
const CryptoCompare = require('../lib/thirdparty/cryptocompare');
const { num } = require('./NumHelper');
const ccxt = require('../../bootstrap/ccxt');

class PrivilegeHelper {
	#userId;

	#baseCurrencyId;

	#tradeCurrencyId;

	#paymentMethodId;

	#transactionTypeSlug;

	#includeBaseCurrency;

	#includeTradeCurrency;

	#includeBaseCurrencies;

	#includeTradeCurrencies;

	#includePaymentMethods;

	#includeCharges;

	#includeMarkets;

	#includeFlow;

	#baseCurrency;

	#tradeCurrency;

	#baseCurrencyType;

	#tradeCurrencyType;

	// Accounts
	#cost = 0;

	#rate = 0;

	#price = 0;

	#totalPrice = 0;

	#amount = 0;

	#subtotal = 0;

	#youWillGetAmount = 0;

	#youWillGetAmountOutstanding = 0;

	#youWillPayAmount = 0;

	#payCurrency;

	#getCurrency;

	#totalCharges = 0;

	#accountTypeSlug = 0;

	// Trading
	#orderSide;

	#orderType;

	// Opertions
	#checkBalance;

	#checkMarketPrice;

	#checkMarketRate;

	// Transaction References
	#currency;

	#accountOwnerType;

	// Privilege Construct
	#flow;

	#user;

	#charges;

	#limits;

	#privilege;

	#privileges;

	// Privilege Construct Options
	#includeUser;

	#includeFinanceDetails;

	#includePrivilege;

	#includePrivileges;

	#includeValidations;

	#includePaymentMethod;

	// Response
	#schema = {};

	#paymentMethod;

	#fetchRateFrom;

	constructor(options = {}) {
		this.#charges = [];

		// Options
		this.#userId = options.userId;
		this.#baseCurrencyId = options.baseCurrencyId;
		this.#tradeCurrencyId = options.tradeCurrencyId;
		this.#baseCurrencyType = options.baseCurrencyType;
		this.#tradeCurrencyType = options.tradeCurrencyType;
		this.#paymentMethodId = options.paymentMethodId;
		this.#accountOwnerType = options.accountOwnerType;
		this.#transactionTypeSlug = options.transactionTypeSlug;
		this.#accountTypeSlug = options.accountTypeSlug;

		// Resources
		this.#includeFlow = options.includeFlow;
		this.#includeBaseCurrencies = options.includeBaseCurrencies;
		this.#includeTradeCurrencies = options.includeTradeCurrencies;
		this.#includePaymentMethods = options.includePaymentMethods;
		this.#includeMarkets = options.includeMarkets;
		this.#includeValidations = options.includeValidations;
		this.#includeCharges = options.includeCharges;
		this.#includeBaseCurrency = options.includeBaseCurrency;
		this.#includeTradeCurrency = options.includeTradeCurrency;
		this.#includeFinanceDetails = options.includeFinanceDetails;
		this.#includeUser = options.includeUser;
		this.#includePrivilege = options.includePrivilege;
		this.#includePrivileges = options.includePrivileges;
		this.#includePaymentMethod = options.includePaymentMethod;

		// Finance Details
		this.#amount = num(options.amount);
		this.#cost = num(options.cost);
		this.#price = num(options.price);
		this.#orderSide = options.orderSide;
		this.#orderType = options.orderType;

		// Operations
		this.#checkMarketPrice = options.checkMarketPrice;
		this.#checkMarketRate = options.checkMarketRate;
		this.#checkBalance = options.checkBalance;
	}

	async validateSchema(options = {}) {
		this.#user = await User.findOne({
			_id: this.#userId,
		})
			.populate('group')
			.exec();

		if (this.#user?.group?.privileges === undefined) {
			var validations = {};
			validations.isValid = false;
			validations.map = ['baseCurrency'];
			validations.message = 'You do not have permission to perform this transaction!';
			this.#schema.validations = validations;
			return this.#schema;
		}

		const privilegeFilter = {
			'transaction_type.slug': this.#transactionTypeSlug,
		};
		if (this.#baseCurrencyId) privilegeFilter['base_currency._id'] = mongoose.Types.ObjectId(this.#baseCurrencyId);
		if (this.#tradeCurrencyId) privilegeFilter['trade_currency._id'] = mongoose.Types.ObjectId(this.#tradeCurrencyId);
		if (this.#baseCurrencyType) privilegeFilter['base_currency.type'] = this.#baseCurrencyType;
		if (this.#tradeCurrencyType) privilegeFilter['trade_currency.type'] = this.#tradeCurrencyType;
		if (this.#paymentMethodId) privilegeFilter['payment_method._id'] = mongoose.Types.ObjectId(this.#paymentMethodId);

		this.#privileges = await Privileges.find({
			_id: { $in: this.#user.group.privileges },
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

		if (!this.#privileges || this.#privileges[0] === undefined) {
			var validations = {};
			validations.isValid = false;
			validations.map = ['baseCurrency'];
			validations.message = 'You do not have permission to perform this transaction!';
			this.#schema.validations = validations;
			return this.#schema;
		}

		if (this.#includeUser) {
			this.#schema.user = this.#user;
		}
		this.#privilege = this.#privileges[0];

		if (this.#includePrivilege) this.#schema.privilege = this.#privilege;
		if (this.#includePrivileges) this.#schema.privileges = this.#privileges;

		for (const privilege of this.#privileges ?? []) {
			// Get Base Currencies
			if (this.#includeBaseCurrencies) {
				this.#schema.baseCurrencies ? this.#schema.baseCurrencies : (this.#schema.baseCurrencies = []);
				var found = false;
				this.#schema.baseCurrencies.forEach((existingCurrency) => {
					if (existingCurrency._id.equals(privilege.base_currency._id)) found = true;
				});
				if (!found) this.#schema.baseCurrencies.push(privilege.base_currency);
			}

			// Get Trade Currencies
			if (this.#includeTradeCurrencies) {
				this.#schema.tradeCurrencies ? this.#schema.tradeCurrencies : (this.#schema.tradeCurrencies = []);
				var found = false;
				this.#schema.tradeCurrencies.forEach((existingCurrency) => {
					if (existingCurrency._id.equals(privilege.trade_currency._id)) found = true;
				});
				if (!found) this.#schema.tradeCurrencies.push(privilege.trade_currency);
			}

			// Get All PaymentMethods for a currency
			if (this.#includePaymentMethods) {
				this.#schema.paymentMethods ? this.#schema.paymentMethods : (this.#schema.paymentMethods = []);
				var found = false;
				this.#schema.paymentMethods.forEach((existingMethod) => {
					if (existingMethod._id.equals(privilege.payment_method._id)) found = true;
				});
				if (!found) this.#schema.paymentMethods.push(privilege.payment_method);
			}

			// Get all markets
			if (this.#includeMarkets) {
				this.#schema.markets ? this.#schema.markets : (this.#schema.markets = []);
				var found = false;
				var market = {
					_id: `${privilege.base_currency._id}-${privilege.trade_currency._id}`,
					symbol: `${privilege.base_currency.code}/${privilege.trade_currency.code}`,
					base_currency: privilege.base_currency,
					trade_currency: privilege.trade_currency,
					payment_method: privilege.payment_method,
					limits: privilege.limits,
				};
				this.#schema.markets.forEach((existingMarket) => {
					if (existingMarket._id === market._id) found = true;
				});
				if (!found) {
					try {
						market.marketInfo = await ccxt.exchanges[market.payment_method.slug ?? 'binance'].watchTicker(
							market.symbol
						);
					} catch (error) {
						console.log(error);
					}
					this.#schema.markets.push(market);
				}
			}
		}

		this.#baseCurrency = this.#privilege.base_currency;
		this.#tradeCurrency = this.#privilege.trade_currency;
		this.#paymentMethod = this.#privilege.payment_method;
		this.#fetchRateFrom = this.#privilege.fetch_rate_from ?? this.#paymentMethod;

		if (this.#includeBaseCurrency) this.#schema.baseCurrency = this.#baseCurrency;

		if (this.#includeTradeCurrency) this.#schema.tradeCurrency = this.#tradeCurrency;

		if (this.#includePaymentMethod) this.#schema.paymentMethod = this.#privilege.payment_method;

		if (this.#includeFlow) {
			if (this.#baseCurrency?.type == 'fiat') this.#includeFlow = 'fiat';
			else if (this.#baseCurrency?.type == 'crypto') this.#includeFlow = 'crypto';

			this.#schema.flow = this.#includeFlow;
		}

		if (this.#includeValidations) await this.checkValidations({});

		// If Order Type is market
		if (this.#checkMarketPrice) await this.checkMarketPrice({});

		// If Order Type is market
		if (this.#checkMarketRate) await this.checkMarketRate({});

		// Please enable includeValidations in order for Charges to work correctly
		if (this.#includeCharges) await this.calculateCharges({});

		// Please enable includeCharges in order for Check Balance to work correctly
		if (this.#checkBalance) await this.checkBalance({});

		if (this.#includeFinanceDetails) {
			this.#schema.financeDetails = await this.setFinanceValues();
		}

		return this.#schema;
	}

	async checkValidations(options = {}) {
		this.#schema.validations = {
			isValid: true,
		};
		if (
			['deposit', 'withdrawal'].includes(this.#transactionTypeSlug) &&
			(this.#paymentMethod === undefined || this.#baseCurrency === undefined)
		) {
			this.#schema.validations = {
				isValid: false,
				map: ['paymentMethodId'],
				message: 'You do not have permission to perform this transaction!',
			};
		} else if (
			['order', 'convert', 'buy-crypto'].includes(this.#transactionTypeSlug) &&
			(this.#baseCurrency === undefined || this.#tradeCurrency === undefined)
		) {
			this.#schema.validations = {
				isValid: false,
				map: ['baseCurrencyId'],
				message: 'You do not have permission to perform this transaction!',
			};
		}
		this.checkTransactionLimits({});
	}

	/**
	 * Check Trading Limits
	 */
	async checkTransactionLimits(options = {}) {
		if (['deposit'].includes(this.#transactionTypeSlug) && this.#baseCurrency.type == 'fiat') {
			// Validate Amount
			if (this.#amount < this.#privilege?.limits?.amount?.min) {
				this.#schema.validations = {
					isValid: false,
					map: ['amount'],
					message: `Minimum amount: ${this.#privilege.limits.amount.min}`,
				};
			} else if (this.#amount > this.#privilege?.limits?.amount?.max) {
				this.#schema.validations = {
					isValid: false,
					map: ['amount'],
					message: `Maximum amount: ${this.#privilege?.limits?.amount?.max}`,
				};
			}
		} else if (['order', 'convert', 'buy-crypto'].includes(this.#transactionTypeSlug)) {
			// Validate Amount
			if (this.#amount < this.#privilege?.limits?.amount?.min) {
				this.#schema.validations = {
					isValid: false,
					map: ['amount'],
					message: `Minimum amount: ${this.#privilege.limits.amount.min}`,
				};
			} else if (this.#amount > this.#privilege?.limits?.amount?.max) {
				this.#schema.validations = {
					isValid: false,
					map: ['amount'],
					message: `Maximum amount: ${this.#privilege?.limits?.amount?.min}`,
				};
			}

			// Validate Price
			if (this.#orderType == 'limit') {
				if (this.#price < this.#privilege?.limits?.price?.min) {
					this.#schema.validations = {
						isValid: false,
						map: ['price'],
						message: `Minimum price: ${this.#privilege.limits.price.min}`,
					};
				} else if (this.#price > this.#privilege?.limits?.price?.max) {
					this.#schema.validations = {
						isValid: false,
						map: ['price'],
						message: `Maximum price: ${this.#privilege?.limits?.price?.min}`,
					};
				}

				// // Validate Cost
				// if(this.#cost < this.#privilege?.limits?.cost?.min)
				// {
				//     this.#schema.validations = {
				//         isValid: false,
				//         map: ["price"],
				//         message: "Minimum cost: "+ this.#privilege.limits.cost.min
				//     };
				// }
				// else if(this.#cost > this.#privilege?.limits?.cost?.max)
				// {
				//     this.#schema.validations = {
				//         isValid: false,
				//         map: ["price"],
				//         message: "Maximum cost: "+ this.#privilege?.limits?.cost?.min
				//     };
				// }
			}
		}
	}

	/**
	 * Calculate Charges
	 * @param {*} options
	 */
	async calculateCharges(options = {}) {
		let charges = [];
		this.#youWillGetAmount = this.#amount;
		this.#youWillGetAmountOutstanding = this.#amount;

		// Find applicable charges
		if (this.#transactionTypeSlug == 'buy-crypto') {
			this.#getCurrency = this.#baseCurrency;
			this.#payCurrency = this.#tradeCurrency;
			this.#youWillPayAmount = num(this.#amount); // Fiat Amount
			this.#youWillGetAmount = num(this.#amount * this.#rate); // Crypto
			charges = this.#privilege.taker_charges;
		} else if (['order'].includes(this.#transactionTypeSlug)) {
			if (this.#orderSide == 'buy') {
				this.#getCurrency = this.#baseCurrency;
				this.#payCurrency = this.#tradeCurrency;
				this.#youWillPayAmount = num(this.#amount * this.#price);
				this.#youWillGetAmount = this.#amount;
			} else if (this.#orderSide == 'sell') {
				this.#getCurrency = this.#tradeCurrency;
				this.#payCurrency = this.#baseCurrency;
				this.#youWillPayAmount = this.#amount;
				this.#youWillGetAmount = num(this.#amount * this.#price);
			}

			if (this.#orderType == 'market') {
				charges = this.#privilege.taker_charges;
			} else if (this.#orderType == 'limit') {
				charges = this.#privilege.maker_charges;
			}
		} else if (['convert'].includes(this.#transactionTypeSlug)) {
			this.#youWillPayAmount = this.#amount;
			this.#youWillGetAmount = num(this.#amount * this.#price);
			if (this.#orderSide == 'buy') {
				this.#getCurrency = this.#baseCurrency;
				this.#payCurrency = this.#tradeCurrency;
			} else if (this.#orderSide == 'sell') {
				this.#getCurrency = this.#tradeCurrency;
				this.#payCurrency = this.#baseCurrency;
			}

			if (this.#orderType == 'market') {
				charges = this.#privilege.taker_charges;
			} else if (this.#orderType == 'limit') {
				charges = this.#privilege.maker_charges;
			}
		} else {
			charges = this.#privilege.charges;
			this.#getCurrency = this.#baseCurrency;
			this.#payCurrency = this.#tradeCurrency;
			this.#youWillPayAmount = this.#amount;
			this.#youWillGetAmount = this.#amount;
		}

		for (const charge of charges) {
			const chargeWithAccounts = await Charge.aggregate([
				{ $match: { _id: charge._id } },
				{
					$lookup: {
						from: 'accounts',
						localField: 'accounts',
						foreignField: '_id',
						as: 'accounts',
						pipeline: [
							{
								$match: {
									currency: mongoose.Types.ObjectId(this.#getCurrency._id),
								},
							},
						],
					},
				},
			])
				.exec()
				.then((items) => items[0]);

			if (chargeWithAccounts === undefined) return;

			const chargeDetails = {
				_id: chargeWithAccounts._id,
				title: chargeWithAccounts.title,
				charge_percentage: (chargeWithAccounts.charge_percentage / 100) * this.#youWillGetAmount,
				charge_fixed: chargeWithAccounts.charge_fixed,
			};
			if (chargeWithAccounts.accounts.length == 0) {
				const chargeAccount = await TransactionHelper.createAccount({
					accountOwnerType: 'APP_ADMIN',
					transactionTypeSlug: 'charge',
					currency: this.#getCurrency,
				});
				const chargeWithAccounts = await Charge.findOneAndUpdate(
					{ _id: charge._id },
					{ $push: { accounts: chargeAccount._id } }
				).exec();
				chargeDetails.account = chargeAccount._id;
			} else {
				chargeDetails.account = chargeWithAccounts.accounts[0]._id;
			}
			this.#charges.push(chargeDetails);
			this.#totalCharges += num(chargeDetails.charge_percentage + chargeDetails.charge_fixed);
		}
		this.#youWillGetAmountOutstanding = num(this.#youWillGetAmount);
		this.#subtotal = num(this.#youWillGetAmount - this.#totalCharges);
		this.#youWillGetAmount = num(this.#youWillGetAmount - this.#totalCharges);
		this.#schema.charges = this.#charges;
		return this.#charges;
	}

	/**
	 * Check account balance
	 */
	async checkBalance(options = {}) {
		if (this.#checkBalance && this.#youWillPayAmount) {
			let accountTypeSlug = 'trade';
			if (['buy-crypto', 'convert'].includes(this.#transactionTypeSlug)) accountTypeSlug = 'main';

			const account = await TransactionHelper.findAccount({
				user: this.#user,
				accountOwnerType: this.#accountOwnerType ?? 'USER',
				accountTypeSlug,
				currency: this.#payCurrency,
			});

			this.#schema.account = account;
			if (!account) {
				this.#schema.validations = {
					isValid: false,
					map: ['payCurrencyId'],
					message: `You don't have enough amount in your ${this.#tradeCurrency.code} account`,
				};
			} else if (this.#youWillPayAmount > account?.balance) {
				this.#schema.validations = {
					isValid: false,
					map: ['amount'],
					message: `You don't have enough amount in your ${this.#tradeCurrency.code} account`,
				};
			}
		}
	}

	/**
	 * Get amount, charges & subtotals
	 * @param {*} options
	 */
	async checkMarketPrice(options) {
		if (this.#paymentMethod === null || this.#baseCurrency === null || this.#tradeCurrency === null) return false;

		try {
			const exchange = ccxt.exchanges[this.#paymentMethod.slug];
			const marketTicker = await exchange.fetchTicker(`${this.#baseCurrency.code}/${this.#tradeCurrency.code}`);
			this.#price = marketTicker.high;
		} catch (error) {
			console.log(error);
		}
	}

	/**
	 * Get amount, charges & subtotals
	 * @param {*} options
	 */
	async checkMarketRate(options) {
		if (this.#fetchRateFrom === null || this.#baseCurrency === null || this.#tradeCurrency === null) return false;

		const rate = await new CryptoCompare({
			baseCurrency: this.#baseCurrency,
			tradeCurrency: this.#tradeCurrency,
		}).checkRate();
		this.#rate = rate;
	}

	/**
	 * Get amount, charges & subtotals
	 * @param {*} options
	 */
	async setFinanceValues(options) {
		const values = {};
		values.amount = this.#amount;
		values.youWillGetAmountOutstanding = this.#youWillGetAmountOutstanding;
		values.totalCharges = this.#totalCharges;
		values.chargeCurrency = this.#getCurrency;

		// Rate
		if (this.#transactionTypeSlug == 'deposit') {
			values.youWillGetAmount = this.#youWillGetAmount;
			values.youWillPayAmount = this.#youWillPayAmount;
		} else if (this.#transactionTypeSlug == 'buy-crypto') {
			values.youWillGetAmount = this.#youWillGetAmount;
			values.youWillPayAmount = this.#youWillPayAmount;
			values.rate = this.#rate;
		} else if (this.#transactionTypeSlug == 'order') {
			values.youWillGetAmount = this.#youWillGetAmount;
			values.youWillPayAmount = this.#youWillPayAmount;
			values.price = this.#price;
		} else if (this.#transactionTypeSlug == 'convert') {
			values.youWillGetAmount = this.#youWillGetAmount;
			values.youWillPayAmount = this.#youWillPayAmount;
			values.price = this.#price;
		}
		return values;
	}

	/**
	 * Find orderType and side for a C Pair
	 *
	 */
	static async findCurrencyPair(options = {}) {
		const schema = await new PrivilegeHelper({
			transactionTypeSlug: 'convert',
			userId: options.userId,
			includeBaseCurrencies: true,
			includeTradeCurrencies: true,
		}).validateSchema();

		for (const baseCurr of this.#schema.baseCurrencies) {
			for (const tradeCurr of this.#schema.tradeCurrencies) {
				if (baseCurr._id.equals(options.fromCurrencyId) && tradeCurr._id.equals(options.toCurrencyId)) {
					return {
						baseCurrencyId: options.fromCurrencyId,
						tradeCurrencyId: options.toCurrencyId,
						orderSide: 'sell',
					};
				}
				if (baseCurr._id.equals(options.toCurrencyId) && tradeCurr._id.equals(options.fromCurrencyId)) {
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
