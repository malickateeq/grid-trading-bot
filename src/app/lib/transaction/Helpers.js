const Account = require('../../models/Account');
const AccountType = require('../../models/AccountType');
const GeneralHelper = require('../../helpers/general');
const User = require('../../models/User');
const Currency = require('../../models/Currency');
const { env } = require('@burency/common');

class Helpers {
	/**
	 * Find account type according to limited parameters
	 * @param {*} options
	 * @returns
	 */
	static async getAccountType(options = {}) {
		if (options.accountType === undefined) {
			if (options.accountTypeId) {
				options.accountType = await AccountType.findOne({ _id: options.accountTypeId }).select('name slug').exec();
			} else if (options.accountTypeSlug) {
				options.accountType = await AccountType.findOne({ slug: options.accountTypeSlug }).select('name slug').exec();
			} else if (options.accountTypeSlug) {
				options.accountType = await AccountType.findOne({ slug: options.accountTypeSlug }).select('name slug').exec();
			} else if (options.accountOwnerType == 'APP_ADMIN') {
				if (options.transactionTypeSlug == 'deposit' || options.transactionTypeSlug == 'withdraw') {
					options.accountType = await AccountType.findOne({ slug: 'gl-currency' }).select('name slug').exec();
				} else if (options.transactionTypeSlug == 'charge') {
					options.accountType = await AccountType.findOne({ slug: 'gl-charges' }).select('name slug').exec();
				}
			} else if (options.accountOwnerType == 'USER') {
				if (options.transactionTypeSlug == 'deposit') {
					options.accountType = await AccountType.findOne({ slug: 'main' }).select('name slug').exec();
				} else if (options.transactionTypeSlug == 'order') {
					options.accountType = await AccountType.findOne({ slug: 'trade' }).select('name slug').exec();
				} else if (options.transactionTypeSlug == 'transfer') {
					options.accountType = await AccountType.findOne({ slug: 'trade' }).select('name slug').exec();
				}
			}
		}
		return options;
	}

	/**
	 * Get Account Currency
	 * @param {*} options
	 * @returns Currency Model
	 */
	static async getAccountCurrency(options) {
		if (options.currency === undefined) {
			if (options.currencyId) {
				options.currency = await Currency.findOne({ _id: options.currencyId })
					.select('name code type symbol image status networks')
					.exec();
			}
		}
		return options;
	}

	/**
	 * Get Account onwer
	 */
	static async getAccountOwner(options = {}) {
		if (options.user === undefined) {
			if (options.userId !== undefined) {
				options.user = await User.findOne({ _id: options.userId }).select('first_name last_name email phone').exec();
				options.userId = options?.user?._id;
			} else if (options.accountOwnerType == 'APP_ADMIN') {
				options.user = await User.findOne({ email: env('APP_ADMIN') })
					.select('first_name last_name email phone')
					.exec();
				options.userId = options?.user?._id;
			}
		}
		return options;
	}

	/**
	 * Create account on the basis on provided parameters
	 * @param {*} options
	 * @returns Account
	 */
	static async createAccount(options = {}) {
		options = await this.getAccountType(options);
		options = await this.getAccountOwner(options);
		options = await this.getAccountCurrency(options);

		const accountTitle = await GeneralHelper.userAccountTitle({
			user: options.user,
			currency: options.currency,
			accountType: options.accountType,
		});
		const accountNumber = GeneralHelper.userAccountNumber({
			currency: options.currency,
		});

		const account = new Account({
			user: options.user._id,
			currency: options.currency._id,
			account_type: options.accountType,
			account_number: accountNumber,
			account_title: accountTitle,
			status: 1,
		});
		await account.save();
		return account;
	}

	/**
	 * Find an account
	 * @param {*} options
	 * @returns Account or null
	 */
	static async findAccount(options = {}) {
		options = await this.getAccountOwner(options);
		options = await this.getAccountType(options);
		options = await this.getAccountCurrency(options);
		var account = false;
		if (options.accountId !== undefined) {
			account = await Account.findOne({ _id: options._id })
				.populate('currency', 'name code type symbol image status networks')
				.select('account_number account_title balance balance_on_hold account_type.name account_type.slug')
				.exec();
		} else if (options.currency !== undefined && options.user !== undefined && options.accountType !== undefined) {
			account = await Account.findOne({
				user: options.user._id,
				'account_type._id': options.accountType._id,
				currency: options.currency._id,
			})
				.populate('currency', '_id name code type symbol image status networks')
				.select('account_number account_title balance balance_on_hold account_type.name account_type.slug')
				.exec();
		}
		return account;
	}

	/**
	 * Find an account if not found then create one
	 * @param {*} options
	 */
	static async firstOrCreateAccount(options = {}) {
		var account = false;
		account = await this.findAccount(options);
		if (!account) {
			account = await this.createAccount(options);
		}
		return account;
	}
}

module.exports = Helpers;
