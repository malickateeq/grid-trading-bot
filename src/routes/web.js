const router = require('./container');
// const { Response, auth } = require('@burency/common');

const UserThirdpartyController = require('../app/controllers/general/UserThirdpartyController');
const ThirdpartyController = require('../app/controllers/general/ThirdpartyController');
const OrdersController = require('../app/controllers/general/OrdersController');
const BotOrdersController = require('../app/controllers/general/BotOrdersController');
const TradingStrategyController = require('../app/controllers/general/TradingStrategyController');

router.get('/', (req, res) => {
    res.json('Trading Bot REST APIs');
});

// Run Seeder in sequential order
router.get('/seed/:model', async (req, res) => {
    try {
        if (req.params.model == 'database') {
            var mongoose = require('mongoose');
            mongoose.connection.db.dropDatabase();
            res.json(req.params.model + ' database dropped!');
        } else {
            const Seeder = require('../app/models/' + req.params.model + '/seeder');
            await Seeder.run();
            res.json(req.params.model + ' table seeded!');
        }
    } catch (error) {
        console.log(error);
        res.json(req.params.model + ' ' + (error.code ? error.code : error));
    }
});

// Run Seeder in sequential order
router.get('/restart', async (req, res) => {
    setTimeout(function () {
        // Listen for the 'exit' event.
        // This is emitted when our app exits.
        process.on('exit', function () {
            //  Resolve the `child_process` module, and `spawn`
            //  a new process.
            //  The `child_process` module lets us
            //  access OS functionalities by running any bash command.`.
            require('child_process').spawn(process.argv.shift(), process.argv, {
                cwd: process.cwd(),
                detached: true,
                stdio: 'inherit',
            });
        });
        process.exit();
    }, 1000);
});

// Trading Strategy
router.get('/trading-strategy', TradingStrategyController.index);
πππ;
router.get('/trading-strategy/:id', TradingStrategyController.get);
router.post('/trading-strategy', TradingStrategyController.post);
router.put('/trading-strategy', TradingStrategyController.put);
router.patch('/trading-strategy', TradingStrategyController.patch);

// thirdparties
router.get('/thirdparties', ThirdpartyController.index);
router.get('/thirdparties/:id', ThirdpartyController.get);
router.post('/thirdparties', ThirdpartyController.post);
router.put('/thirdparties', ThirdpartyController.put);
router.patch('/thirdparties', ThirdpartyController.patch);

// user thirdparties
router.get('/user-thirdparties', UserThirdpartyController.index);
router.get('/user-thirdparties/:id', UserThirdpartyController.get);
router.post('/user-thirdparties', UserThirdpartyController.post);
router.put('/user-thirdparties', UserThirdpartyController.put);
router.patch('/user-thirdparties', UserThirdpartyController.patch);

// Orders
router.get('/orders', OrdersController.index);
router.get('/orders/:id', OrdersController.get);
router.post('/orders', OrdersController.post);
router.put('/orders', OrdersController.put);
router.patch('/orders', OrdersController.patch);

// Orders
router.get('/bot-orders', BotOrdersController.index);
router.get('/bot-orders/:id', BotOrdersController.get);
router.post('/bot-orders', BotOrdersController.post);
router.put('/bot-orders', BotOrdersController.put);
router.patch('/bot-orders', BotOrdersController.patch);

module.exports = router;
