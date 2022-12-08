const Service = require('./Service');
const ProcessTransaction = require("../lib/transaction/Process");

class TransactionService extends Service 
{
    constructor() 
    {
        super();
    }

    async processTransaction(payload = {}, options = {}) 
    {
        const transaction_id = payload.transaction_id;
        const transactionStatus = await ProcessTransaction.start({ transaction_id });
        console.log(transactionStatus);
    }
}

module.exports = new TransactionService;