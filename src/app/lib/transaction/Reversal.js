const TransactionModel = require('../../models/Transaction');
const Ledger = require('../../models/Ledger');
const Account = require('../../models/Account');

class Reversal {
	static async run(options = {}) {
		try {
			let mainTransaction = await TransactionModel.findOne({ _id: options.transaction_id, status: 1 }).exec();
			if (!mainTransaction) return { message: options.transaction_id + ' transaction not found' };

			for (let transaction of mainTransaction.transactions ?? []) {
				if (transaction.status === 1) {
					const senderAccountStatus = await Account.findOneAndUpdate(
						{ _id: transaction.sender_account._id },
						{ $inc: { balance: +transaction.amount } },
						{ new: true }
					);
					const receiverAccountStatus = await Account.findOneAndUpdate(
						{ _id: transaction.receiver_account._id },
						{ $inc: { balance: -transaction.amount } },
						{ new: true }
					);
					transaction.status = 4;
					const ledgerEntriesStatus = await Ledger.insertMany([
						{
							transaction_id: transaction._id,
							user_account_id: transaction.sender_account,
							transaction_type_id: transaction.transaction_type,
							credit_amount: transaction.amount,
							debit_amount: 0,
							balance: senderAccountStatus.balance,
						},
						{
							transaction_id: transaction._id,
							user_account_id: transaction.receiver_account,
							transaction_type_id: transaction.transaction_type,
							credit_amount: 0,
							debit_amount: transaction.amount,
							balance: receiverAccountStatus.balance,
						},
					]);
				} else if (transaction.status === 0) {
					// Empty
				} else if (transaction.status === -1) {
					// Empty
				}
			}
			mainTransaction.status = 4;
			await mainTransaction.save();
			return { message: mainTransaction._id + ' transaction has been processed!' };
		} catch (error) {
			return { message: 'transaction reversal failed', error };
		}
	}
}

module.exports = Reversal;
