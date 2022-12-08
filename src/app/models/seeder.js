const UserSeeder = require("./User/seeder");
const GroupSeeder = require("./Group/seeder");
const ChargeSeeder = require("./Charge/seeder");
const CurrencySeeder = require("./Currency/seeder");
const AccountTypeSeeder = require("./AccountType/seeder");
const CurrencyPairSeeder = require("./CurrencyPair/seeder");
const PaymentMethodSeeder = require("./PaymentMethod/seeder");
const TransactionTypeSeeder = require("./TransactionType/seeder");
const CurrencyPairRateSeeder = require("./CurrencyPairRate/seeder");

class Seeder
{
    static async run()
    {
        Promise.all([
            UserSeeder.run(),
            GroupSeeder.run(),
            ChargeSeeder.run(),
            AccountTypeSeeder.run(),
            TransactionTypeSeeder.run(),
            CurrencySeeder.run(),
            PaymentMethodSeeder.run(),
            CurrencyPairSeeder.run(),
            CurrencyPairRateSeeder.run(),
        ]);
    }
}

module.exports = Seeder;