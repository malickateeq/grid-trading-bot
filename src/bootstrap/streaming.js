const { env, Stream } = require("@burency/common");
const services = require("../config/services.json");

class StreamingConnect 
{
    #kafkaClientId;
    #kafkaBrokers;
    #kafkaGroupId;
    
    constructor() 
    {
        this.#kafkaClientId = env("KAFKA_CLIENT_ID");
        this.#kafkaBrokers = [env("KAFKA_BROKERS")];
        this.#kafkaGroupId = env("KAFKA_GROUP_ID");
    }
    async connectStreaming()
    {
        // 1. Connect with streaming server cluster
        const streamService = new Stream({
            clientId: this.#kafkaClientId,
            brokers: this.#kafkaBrokers,
            requestTimeout: 5000,
            retry: {
                initialRetryTime: 100,
                retries: 8
            }
        });
        
        // 2. Register Service Events
        streamService.registerServices({
            gorupId: this.#kafkaGroupId,
            services: services
        });
    }
    killStreamingConnection()
    {
        
    }
}

module.exports = new StreamingConnect;