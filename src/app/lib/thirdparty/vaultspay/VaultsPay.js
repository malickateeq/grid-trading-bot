const axios = require('axios');
const ThirdpartyLogs = require('../../../models/ThirdpartyLogs');

class VaultsPay {
  constructor(options = {}) {
    this.baseUrl = 'https://testapi.vaultspay.com/public/external/v1/';
    this.user = options.user;
    this.card = options.card;
    this.amount = options.amount;
    this.currency = options.currency;
    this.paymentMethod = options.paymentMethod;
    this.burencyTransactionId = options.transactionId;
  }

  async setUrl() {
    try {
      if (this.paymentMethod.configurations.mode == 'live') this.baseUrl = 'https://api.vaultspay.com/public/external/v1/';
      else this.baseUrl = 'https://testapi.vaultspay.com/public/external/v1/';

      return true;
    } catch (error) {
      return false;
    }
  }

  async authenticate() {
    const thirdpartyLog = new ThirdpartyLogs();
    thirdpartyLog.transaction_id = this.burencyTransactionId;
    thirdpartyLog.payment_method_id = this.paymentMethod._id;
    try {
      var url = this.baseUrl + 'merchant-auth';
      var body = {
        clientId: this.paymentMethod.configurations.clientId,
        clientSecret: this.paymentMethod.configurations.clientSecret,
      };
      var config = {};
      var response = await axios.post(url, body, config);

      thirdpartyLog.api = { url };
      thirdpartyLog.headers = config;
      thirdpartyLog.request = body;

      response = response.data.data;
      this.stores = response.stores;
      this.accessToken = response.access_token;
      console.log('**************** 1 ****************');
      console.log(response);

      thirdpartyLog.response = response;
      await thirdpartyLog.save();

      return true;
    } catch (error) {
      thirdpartyLog.response = error.response?.data ?? error;
      await thirdpartyLog.save();
      console.log(error.response?.data ?? error);
      return false;
    }
  }

  async getAllowedPaymentMethods() {
    const thirdpartyLog = new ThirdpartyLogs();
    thirdpartyLog.transaction_id = this.burencyTransactionId;
    thirdpartyLog.payment_method_id = this.paymentMethod._id;

    try {
      var url = this.baseUrl + 'get-vaultspay-allowed-payment-methods';
      var body = {
        currencyCode: this.currency.code,
        channelName: this.stores[0]?.channelName,
      };
      var config = {
        headers: { accessToken: this.accessToken },
      };

      thirdpartyLog.api = { url };
      thirdpartyLog.headers = config;
      thirdpartyLog.request = body;

      var response = await axios.post(url, body, config);
      response = response.data.data;
      this.schemas = response;
      console.log('**************** 2 ****************');
      console.log(response);

      thirdpartyLog.response = response;
      await thirdpartyLog.save();

      return true;
    } catch (error) {
      thirdpartyLog.response = error.response?.data ?? error;
      await thirdpartyLog.save();
      console.log(error.response?.data ?? error);
      return false;
    }
  }

  async initiatePayment() {
    const thirdpartyLog = new ThirdpartyLogs();
    thirdpartyLog.transaction_id = this.burencyTransactionId;
    thirdpartyLog.payment_method_id = this.paymentMethod._id;

    try {
      var url = this.baseUrl + 'initialize-merchant-payment';
      console.log(this);

      var body = {
        amount: this.amount,
        callBackUrl: 'http://localhost:3000/execute-deposits',
        redirectUrl: 'http://localhost:3000/execute-deposits',
        expiryInSeconds: '7200',
        channelName: this.stores[0]?.channelName,
        schemaCode: this.schemas[0]?.code,
        clientReference: this.burencyTransactionId,
      };
      var config = {
        headers: { accessToken: this.accessToken },
      };

      thirdpartyLog.api = { url };
      thirdpartyLog.headers = config;
      thirdpartyLog.request = body;

      var response = await axios.post(url, body, config);
      response = response.data.data;
      this.paymentId = response.paymentId;
      console.log('**************** 3 ****************');
      console.log(response);

      thirdpartyLog.response = response;
      await thirdpartyLog.save();

      return true;
    } catch (error) {
      console.log(error.response?.data ?? error);
      thirdpartyLog.response = error.response?.data ?? error;
      await thirdpartyLog.save();
      return false;
    }
  }

  async checkDirectPayment() {
    const thirdpartyLog = new ThirdpartyLogs();
    thirdpartyLog.transaction_id = this.burencyTransactionId;
    thirdpartyLog.payment_method_id = this.paymentMethod._id;

    try {
      var url = this.baseUrl + 'check-payment';
      var body = {
        paymentId: this.paymentId,
      };
      var config = {
        headers: { accessToken: this.accessToken },
      };

      thirdpartyLog.api = { url };
      thirdpartyLog.headers = config;
      thirdpartyLog.request = body;

      var response = await axios.post(url, body, config);
      response = response.data.data;
      this.referenceId = response.methods[0].referenceId;
      console.log('**************** 4 ****************');
      console.log(response);

      thirdpartyLog.response = response;
      await thirdpartyLog.save();

      return true;
    } catch (error) {
      thirdpartyLog.response = error.response?.data ?? error;
      await thirdpartyLog.save();
      console.log(error.response?.data ?? error);
      return false;
    }
  }

  async processPayment() {
    const thirdpartyLog = new ThirdpartyLogs();
    thirdpartyLog.transaction_id = this.burencyTransactionId;
    thirdpartyLog.payment_method_id = this.paymentMethod._id;

    try {
      var url = this.baseUrl + 'process-payment';
      var body = {
        referenceId: this.referenceId,
        name: this.user.first_name ?? this.card.name,
        email: this.user.email ?? 'invalidVpEmail@test.com',
        // TODO: Require phone from payee
        // Case: 19052022_004
        phone: this.user.country_code + this.user.phone ?? '03048486653',
        cardHolderName: this.card.name,
        cardNumber: this.card.number,
        expMonth: this.card.expiry_month,
        expYear: this.card.expiry_year,
        cvc: this.card.cvc,
      };
      var config = {
        headers: { accessToken: this.accessToken },
      };

      thirdpartyLog.api = { url };
      thirdpartyLog.headers = config;
      thirdpartyLog.request = body;

      var response = await axios.post(url, body, config);
      response = response.data.data;
      this.transactionId = response.transactionId;
      console.log('**************** 5 ****************');
      console.log(response);

      thirdpartyLog.response = response;
      await thirdpartyLog.save();

      return true;
    } catch (error) {
      thirdpartyLog.response = error.response?.data ?? error;
      await thirdpartyLog.save();
      console.log(error.response?.data ?? error);
      return false;
    }
  }

  async paymentDetails() {
    const thirdpartyLog = new ThirdpartyLogs();
    thirdpartyLog.transaction_id = this.burencyTransactionId;
    thirdpartyLog.payment_method_id = this.paymentMethod._id;

    try {
      var url = this.baseUrl + 'get-transaction-details';
      var body = {
        transactionId: this.transactionId,
      };
      var config = {
        headers: { accessToken: this.accessToken },
      };

      thirdpartyLog.api = { url };
      thirdpartyLog.headers = config;
      thirdpartyLog.request = body;

      var response = await axios.post(url, body, config);
      response = response.data.data;
      this.transactionId = response.transactionId;
      console.log('**************** 6 ****************');
      console.log(response);

      thirdpartyLog.response = response;
      await thirdpartyLog.save();

      return true;
    } catch (error) {
      thirdpartyLog.response = error.response?.data ?? error;
      await thirdpartyLog.save();
      console.log(error.response?.data ?? error);
      return false;
    }
  }

  async execute() {
    if (await this.setUrl())
      if (await this.authenticate())
        if (await this.getAllowedPaymentMethods())
          if (await this.initiatePayment())
            if (await this.checkDirectPayment())
              if (await this.processPayment())
                if (await this.paymentDetails()) {
                  return {
                    status: true,
                    paymentStatus: 'processed',
                    paymentId: this.paymentId,
                    referenceId: this.referenceId,
                    transactionId: this.transactionId,
                    message: 'Payment Successful!',
                  };
                }

    return { status: false, paymentStatus: 'failed', message: 'Invalid Payment details provided!' };
  }
}

module.exports = VaultsPay;
