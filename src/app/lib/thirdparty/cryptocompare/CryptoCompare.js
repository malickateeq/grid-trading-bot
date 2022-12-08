const axios = require("axios");
const ThirdpartyLogs = require("../../../models/ThirdpartyLogs");

class CryptoCompare
{
    #liveUrl = "https://min-api.cryptocompare.com";
    #baseCurrency;
    #tradeCurrency;
    constructor(options = {})
    {
        this.#baseCurrency = options.baseCurrency;
        this.#tradeCurrency = options.tradeCurrency;
    }

    async init()
    {
        
    }

    async checkRate()
    {
        try 
        {
            var url = this.#liveUrl + "/data/price?fsym="+this.#baseCurrency.code+"&tsyms="+this.#tradeCurrency.code;
            var config = {};
            var response = await axios.get(url);
            response = response.data;
            console.log(response);

            return response[Object.keys(response)[0]];
        }
        catch (error) 
        {
            return false;
        }
    }
}

module.exports = CryptoCompare;