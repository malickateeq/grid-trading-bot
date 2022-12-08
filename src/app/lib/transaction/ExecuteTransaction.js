const BlockchainNetwork = require('../../models/BlockchainNetwork');
const Card = require('../../models/Card');
const { env, Stream } = require('@burency/common');
const Currency = require('../../models/Currency');
const PaymentMethod = require('../../models/PaymentMethod');

// Thirdparties
const VaultsPay = require('../thirdparty/vaultspay');
const CoinPayments = require('../thirdparty/coinpayments');
const MatchingEngine = require('../transaction/MatchingEngine');

class ExecuteTransaction {
	constructor(options = {}) {
		this.transaction = options.transaction;
		this.executePayment = options.executePayment;
		// Thirdparty Parameters
		this.paymentMethodId = options.paymentMethodId;
		this.currencyId = options.currencyId;
		this.networkId = options.networkId;
		this.cardId = options.cardId;
		this.cardCvc = options.cvc;
		this.user = options.user;
	}

	async setCurrency() {
		this.currency = await Currency.findOne({ _id: this.currencyId });
	}

	async setPaymentMethod() {
		// console.log( this.transaction?.payment_method?._id, this.paymentMethodId );
		const paymentMethodId = this.transaction?.payment_method?._id ?? this.paymentMethodId;
		this.paymentMethod = await PaymentMethod.findOne({ _id: paymentMethodId });
	}

	async setCard() {
		if (this.cardId) {
			this.card = await Card.findOne({ _id: this.cardId });
			this.card.cvc = this.cardCvc;
		}
	}

	async setNetwork() {
		if (this.networkId) {
			this.network = await BlockchainNetwork.findOne({ _id: this.networkId }).exec();
		}
	}

	async init() {
		await Promise.all([this.setCard(), this.setCurrency(), this.setNetwork(), this.setPaymentMethod()]);
		return true;
	}

	async execute() {
		await this.init();
		var transactionDetails = {
			status: true,
			paymentStatus: 'processed',
			transactionId: this.transaction?._id,
			transaction: null,
		};

		// Execute payment at a thirdparty
		if (this.executePayment) {
			transactionDetails.status = false;
			transactionDetails.paymentStatus = 'pending';

			if (['order', 'convert'].includes(this.transaction?.transaction_type?.slug)) {
				transactionDetails = await MatchingEngine.execute({
					transactionId: this.transaction._id,
				});
			} else if (this.paymentMethod.slug == 'vaultspay') {
				transactionDetails = await new VaultsPay({
					user: this.user,
					transactionId: this.transaction._id,
					paymentMethod: this.paymentMethod,
					currency: this.currency,
					amount: this.transaction.amount,
					card: this.card,
				}).execute();
			} else if (this.paymentMethod.slug == 'coinpayment') {
				transactionDetails = await new CoinPayments({
					user: this.transaction.receiver,
					transactionId: this.transaction?._id,
					paymentMethod: this.paymentMethod,
					currency: this.currency,
					network: this.network,
				}).execute();
			}
		}

		// Notify Kafka about transaction status
		if (transactionDetails.status && transactionDetails.paymentStatus === 'processed' && this.transaction?._id) {
			const streamServer = new Stream({
				clientId: env('KAFKA_CLIENT_ID'),
				brokers: [env('KAFKA_BROKERS')],
			});
			const ackStreamServer = await streamServer.produce(
				{ transaction_id: this.transaction._id },
				{
					topic: 'TRNX.TRANSACTION_CREATED',
					acks: 1,
				}
			);
		}

		return {
			status: transactionDetails.status,
			paymentStatus: transactionDetails.paymentStatus,
			transactionId: this.transaction._id,
			transactionUUID: this.transaction.uuid,
			referenceId: transactionDetails?.referenceId,
			message: transactionDetails.message,
			transactionTime: this.transaction?.updatedAt,
			thirdparty: transactionDetails,
		};
	}
}

module.exports = ExecuteTransaction;
