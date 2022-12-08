const TransactionModel = require('../../models/Transaction');
const Ledger = require('../../models/Ledger');
const Account = require('../../models/Account');

class Process {
	static async start(options = {}) {
		try {
			let pendingTransaction = await TransactionModel.findOne({ _id: options.transaction_id, status: 0 }).exec();
			if (!pendingTransaction) return { message: options.transaction_id + ' transaction not found' };

			let transactionStatus = 1;
			for (let transaction of pendingTransaction.transactions ?? []) {
				if (transaction.status === 0) {
					const senderAccountStatus = await Account.findOneAndUpdate(
						{ _id: transaction.sender_account._id },
						{ $inc: { balance: -transaction.amount } },
						{ new: true }
					);
					const receiverAccountStatus = await Account.findOneAndUpdate(
						{ _id: transaction.receiver_account._id },
						{ $inc: { balance: transaction.amount } },
						{ new: true }
					);
					transaction.status = 1;
					const ledgerEntriesStatus = await Ledger.insertMany([
						{
							transaction_id: transaction._id,
							user_account_id: transaction.sender_account,
							transaction_type_id: transaction.transaction_type,
							credit_amount: 0,
							debit_amount: transaction.amount,
							balance: senderAccountStatus.balance,
						},
						{
							transaction_id: transaction._id,
							user_account_id: transaction.receiver_account,
							transaction_type_id: transaction.transaction_type,
							credit_amount: transaction.amount,
							debit_amount: 0,
							balance: receiverAccountStatus.balance,
						},
					]);
				} else if (transaction.status === 0) {
					// Transaction already processed!
				} else if (transaction.status === -1) {
					// Don't perform this transaction for now!
					transactionStatus = 2;
				}
			}
			pendingTransaction.status = transactionStatus;
			await pendingTransaction.save();

			return { message: pendingTransaction._id + ' transaction has been processed!' };
		} catch (error) {
			return { message: 'transaction processing failed', error };
		}
	}
}

module.exports = Process;
