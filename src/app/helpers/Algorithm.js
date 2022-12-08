class Algorithm 
{
    /**
     * While assigning multiple privileges to a single group
     * It will check for following combination and make sure it exists only once
     * 1. For Fiat: Transcation Type + Currency + Payment Method
     * 2. For CPRs: Transcation Type + (CurrencyPair + PaymentMethos)
     * 
     * @param {*} privileges 
     * @returns 
     */
    static validateDuplicatePrivileges(privileges) 
    {
        var combinations = [];
        var i = 0;

        // 1. Prepare Privileges Map
        privileges.forEach(privilege => {
            combinations[i] = [];

            combinations[i].push({
                ids: privilege.transaction_type._id
                    +"-"+privilege.base_currency._id
                    + (privilege?.trade_currency?._id ? (+"-"+privilege.trade_currency._id) : "")
                    +"-"+privilege.payment_method._id,
                pattern: privilege.transaction_type.slug
                    +"-"+privilege.base_currency.code
                    + (privilege?.trade_currency?.code ? (+"-"+privilege.trade_currency.code) : "")
                    +"-"+privilege.payment_method.slug,
                privilege: privilege.title
            });
            i++;
        });
        
        // 2. Check for duplicate entries
        var duplicatePetterns = [];
        for(const index in combinations)
        {
            combinations[index].forEach( pattern => {
                
                for(const mapIndex in combinations)
                {
                    combinations[mapIndex].forEach( mapPattern => {
                        
                        if(index != mapIndex && pattern.ids === mapPattern.ids)
                        {
                            duplicatePetterns.push(pattern);
                        }
                    });
                }
            });
        }

        return duplicatePetterns;
    }

    /**
     * Check for duplicate currency pairs
     */
    static validateDuplicateCurrencyPair(currencyPairRates = [])
    {
        var CPRs = [];
        for (let index = 0; index < currencyPairRates.length; index++) 
        {
            console.log( currencyPairRates[index].currency_pair_id );
            for (let indexZ = 0; indexZ < CPRs.length; indexZ++) 
            {
                if( CPRs[indexZ].currency_pair_id.equals(currencyPairRates[index].currency_pair_id))
                {
                    return { isValid: false, message:  CPRs[indexZ].symbol + " you can not add same Curreny Pair more than once.", cprId: currencyPairRates[index]._id }
                }
            }
            CPRs.push(currencyPairRates[index]);
        }
        return { isValid: true, message: "SUCCESS" }
    }
}

module.exports = Algorithm;