const User = require('../../models/User');
const Account = require('../../models/Account');
const Currency = require('../../models/Currency');
const TransactionType = require('../../models/TransactionType');
const Privilege = require('../../models/Privilege');
const PaymentMethod = require('../../models/PaymentMethod');
const Helpers = require('./Helpers');
const { env } = require('@burency/common');

class TransactionHelper {
	constructor(options = {}) {
		this.chargeTransactions = [];
		this.amount = options.amount;
		this.currencyId = options.currencyId;
		this.privilegeId = options.privilegeId;
		this.senderUserId = options.senderUserId;
		this.receiverUserId = options.receiverUserId;
		this.senderUserType = options.senderUserType;
		this.paymentMethodId = options.paymentMethodId;
		this.senderAccountId = options.senderAccountId;
		this.receiverUserType = options.receiverUserType;
		this.receiverAccountId = options.receiverAccountId;
		this.transactionTypeSlug = options.transactionTypeSlug;
		this.senderAccountTypeSlug = options.senderAccountTypeSlug;
		this.receiverAccountTypeSlug = options.receiverAccountTypeSlug;
	}

	async setTransactionType() {
		this.transactionType = await TransactionType.findOne({ slug: this.transactionTypeSlug }).select('name slug').exec();
		this.transactionTypeId = this.transactionType._id;
	}

	async setCurrency() {
		this.currency = await Currency.findOne({ _id: this.currencyId }).select('name code type symbol').exec();
	}

	async setPaymentMethod() {
		this.paymentMethod = await PaymentMethod.findOne({ _id: this.paymentMethodId }).select('name slug type').exec();
	}

	async setSenderUser() {
		if (this.senderUserId) {
			this.sender = await User.findOne({ _id: this.senderUserId }).select('first_name last_name email phone').exec();
			this.senderUserId = this.sender._id;
		} else if (this.senderUserType == 'APP_ADMIN') {
			this.sender = await User.findOne({ email: env('APP_ADMIN') })
				.select('first_name last_name email phone')
				.exec();
			this.senderUserId = this.sender._id;
		}
	}

	async setReceiverUser() {
		if (this.receiverUserId) {
			this.receiver = await User.findOne({ _id: this.receiverUserId })
				.select('first_name last_name email phone')
				.exec();
			this.receiverUserId = this.receiver._id;
		} else if (this.receiverUserType == 'APP_ADMIN') {
			this.receiver = await User.findOne({ email: env('APP_ADMIN') })
				.select('first_name last_name email phone')
				.exec();
			this.receiverUserId = this.receiver._id;
		}
	}

	async setSenderAccount() {
		if (this.senderAccountId) {
			this.senderAccount = await Account.findOne({ _id: this.senderAccountId })
				.populate('currency', 'name code type symbol image status networks')
				.select('account_number account_title balance balance_on_hold account_type.name account_type.slug')
				.exec();
		} else {
			this.senderAccount = await Helpers.firstOrCreateAccount({
				user: this.sender,
				accountOwnerType: this.senderUserType,
				transactionTypeSlug: this.transactionTypeSlug,
				accountTypeSlug: this.senderAccountTypeSlug,
				currency: this.currency,
			});
			this.senderAccountId = this.senderAccount._id;
		}
	}

	async setReceiverAccount() {
		if (this.receiverAccountId) {
			this.receiverAccount = await Account.findOne({ _id: this.receiverAccountId })
				.populate('currency', 'name code type symbol image status networks')
				.select('account_number account_title balance balance_on_hold account_type.name account_type.slug')
				.exec();
		} else {
			this.receiverAccount = await Helpers.firstOrCreateAccount({
				user: this.receiver,
				accountOwnerType: this.receiverUserType,
				transactionTypeSlug: this.transactionTypeSlug,
				accountTypeSlug: this.receiverAccountTypeSlug,
				currency: this.currency,
			});
			this.receiverAccountId = this.receiverAccount._id;
		}
	}

	async setPrivilege() {
		this.privilege = await Privilege.findOne({ _id: this.privilegeId }).select('title charges').exec();
	}

	async init() {
		await Promise.all([
			this.setTransactionType(),
			this.setCurrency(),
			this.setPaymentMethod(),
			this.setSenderUser(),
			this.setReceiverUser(),
		]);
		await Promise.all([this.setSenderAccount(), this.setReceiverAccount(), this.setPrivilege()]);
	}

	async setChargeTransactions(options = {}) {
		for (const charge of options.charges ?? []) {
			var chargeTransaction = new TransactionHelper({
				transactionTypeSlug: 'charge',
				currencyId: this.currencyId,
				// paymentMethodId: this.paymentMethodId,
				// privilegeId: this.privilegeId,
				amount: charge.charge_fixed + charge.charge_percentage,
				// Deposit Case: User (the receiver) has to pay
				senderUserType: 'USER',
				// senderUserId: this.receiverUserId, // will result in transaction sender being ADMIN
				senderUserId: this.senderUserId,

				senderAccountId: this.receiverAccount._id,

				// In Charges: Receiver will always be APP_ADMIN
				// and its account will be pre-defined in charges.
				receiverUserType: 'APP_ADMIN',
				receiverAccountId: charge.account,
			});
			await chargeTransaction.init();
			this.chargeTransactions.push(chargeTransaction);
		}
	}
}

module.exports = TransactionHelper;
