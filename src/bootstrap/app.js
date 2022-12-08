const http = require('http');
const express = require('express');
const routes = require('../routes');
const path = require('path');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, `../../.env.${process.env.NODE_ENV}`) });
const database = require('./database');
const bodyParser = require('body-parser');
const { validate, Response } = require('@burency/common');
const { errorHandler } = require('../app/middlewares/errorHandler');
const { logger } = require('../app/middlewares/logger');
// const MatchingEngine = require('../app/lib/transaction/MatchingEngine');
const ccxt = require('./ccxt');
const { loadModels } = require('./loadModels');
const { botDaemon } = require('./botDaemon');
const DataStream = require('../app/lib/DataStream');

class Application {
    #app;
    #port;
    #url;
    #server;
    #webSocketServer;

    constructor() {
        this.#port = process.env.APP_PORT;
        this.#url = process.env.APP_URL;
    }
    initiateApp() {
        this.#app = express();
        this.#server = http.createServer(this.#app);
    }
    appConfigurations() {
        // parse application/x-www-form-urlencoded
        this.#app.use(bodyParser.urlencoded({ extended: false }));

        // parse application/json
        this.#app.use(bodyParser.json());
    }
    globalMiddlewares() {
        this.#app.use(cors());
        this.#app.use(logger);
        this.#app.use(validate);
    }
    registerRoutes() {
        this.#app.use(routes);
    }
    globalErrorHandler() {
        this.#app.use(errorHandler);
        this.#app.all('*', (req, res, next) => {
            //handle not found
            res.status(404).json(
                Response.notFound({ message: `Sorry! Couldn't find ${req.originalUrl} on the server!` })
            );
        });
    }
    async connectDatabase() {
        await database.initDBConnection();
    }
    runServer() {
        this.#webSocketServer = this.#server.listen(this.#port, () => {
            console.log(`Server listening at ${this.#url}:${this.#port}`);
        });
    }
    initWebSocketServer() {
        // socket.init({ server: this.#webSocketServer });
    }
    async connectStreamingServer() {
        // await streaming.connectStreaming();
    }
    logUncaughtException() {
        process.on('uncaughtException', (error) => {
            // LogException.log_uncaught(error);
            console.log('Uncaught', error.stack);
        });
        process.on('unhandledRejection', (error) => {
            // LogException.log_uncaught(error);
            console.log('unhadled promise', error.stack);
        });
    }
    async thirdpartyServices() {
        await ccxt.init();
        await DataStream.init();
        await botDaemon();
    }
    start() {
        this.initiateApp();
        this.appConfigurations();
        this.globalMiddlewares();
        this.registerRoutes();
        this.globalErrorHandler();
        this.connectDatabase();
        this.runServer();
        this.initWebSocketServer();
        this.connectStreamingServer();
        // this.logUncaughtException();
        // MatchingEngine.watch();
        loadModels();
        this.thirdpartyServices();
    }
}

module.exports = new Application();
