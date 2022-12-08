class GeneralHelper {
    static async userAccountTitle(options = {}) {
        return (options.user.first_name + " " + options.user.last_name + " " + options.currency.code + " " + options.accountType.name).toUpperCase();
    }
    static userAccountNumber(options = {}) {
        return options.currency.code + "-" + Math.random().toString(22).slice(2) + "-" + Date.now();
    }

    static num(number = 0, DECIMAL = 8) {
        // if (Number.isNaN(number) ) return false;
        return Number(number).toFixed(DECIMAL);
    }

    static totalCost(options = { amount: 0, price: 1, orderType: "limit", charges }) {
        if (options.orderType == "market")
            return GeneralHelper.num(options.amount);
        else if (options.orderType == "limit")
            return GeneralHelper.num(options.amount * options.price);
        else
            return GeneralHelper.num(options.amount);
    }

}

module.exports = GeneralHelper;