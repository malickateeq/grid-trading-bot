class NumHelper {
    static num(number = 0, DECIMAL = 8) {
        return Number(number).toFixed(DECIMAL);
    }

    // Arithmetic operators
    static add = (a, b) => {
        return this.num(this.toNum(this.toCents(a) + this.toCents(b)));
    };
    static mul = (a, b) => {
        return a * b;
    };
    static div = (a, b) => {
        return this.num(this.toNum(this.toCents(a) / this.toCents(b)));
    };
    static sub = (a, b) => {
        return this.num(this.toNum(this.toCents(a) - this.toCents(b)));
    };

    // Comparison Functions
    static isLte = (a, b) => a.value <= b.value;
    static isGte = (a, b) => a.value >= b.value;
    static isLt = (a, b) => a.value < b.value;
    static isGt = (a, b) => a.value > b.value;

    // Validations
    static isNaN = (value) => typeof value === 'number' && isNaN(value);
    static isSafe = (n) =>
        typeof n === 'number' && Math.round(n) === n && Number.MIN_SAFE_INTEGER <= n && n <= Number.MAX_SAFE_INTEGER;
    static isEqual = (a, b) => Math.abs(a.number - b.number) < Number.EPSILON;

    // Conversion function.
    static toCents = (val) => val * 100;
    static toNum = (val) => val / 100;

    // Integer conversion
    static toInt = (a) => {
        const x = Number(a);
        return x < 0 ? Math.ceil(x) : Math.floor(x);
    };

    // Money constructor.
    static money = (number, value) => {
        const moneyResult = number ? { number, value: toCents(number) } : { number: toNum(value), value };
        if (!isSafe(moneyResult.value)) throw new Error('Number exced integer SAFE range');

        return moneyResult;
    };

    static totalCost(options = { amount: 0, price: 1, orderType: 'limit', charges }) {
        if (options.orderType == 'market') return GeneralHelper.num(options.amount);
        else if (options.orderType == 'limit') return GeneralHelper.num(options.amount * options.price);
        else return GeneralHelper.num(options.amount);
    }
}

module.exports = NumHelper;
