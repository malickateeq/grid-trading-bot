const Service = require('./Service');
const MatchingEngine = require("../lib/transaction/MatchingEngine");

class OrderService extends Service 
{
    constructor() 
    {
        super();
    }

    async executeOrder(payload = {}, options = {}) 
    {
        const orderId = payload.orderId;
        const executionStatus = await MatchingEngine.execute({ orderId });
        
        console.log(executionStatus);
    }
}

module.exports = new OrderService;