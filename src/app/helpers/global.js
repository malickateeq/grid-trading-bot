const path = require('path');
const Joi = require('joi');

	const notExists = async(value, options) => {
        const model = path.resolve(__dirname, '../models', options.model);
        const Model = require(model);
        var fieldName = options.field;
        const modelQuery = await Model.find({ [fieldName]: value });
        if (modelQuery.length) {
            throw new Joi.ValidationError(
                'ValidationError',
                [
                    {
                        message: `${fieldName} already exists`,
                        path: [options],
                        context: {
                            key: options,
                            label: options,
                            value: options,
                        },
                    },
                ],
                value
            );
        }
        return value;
    }

    const exists = async(options = { field: null, value: null, model: null, formField: null }) => {
        const model = path.resolve(__dirname, '../models', options.model);
        const Model = require(model);
        try {
            const modelQuery = await Model.find({ [options.field]: options.value });
            if (!modelQuery.length) {
                throw new Joi.ValidationError(
                    'ValidationError',
                    [
                        {
                            message: `${options.model} does not exist`,
                            path: [options.formField ?? options.field],
                            context: {
                                key: options.formField ?? options.field,
                                label: options.model,
                                value: options.value,
                            },
                        },
                    ],
                    options.value
                );
            }
        } catch (error) {
            throw new Joi.ValidationError(
                'ValidationError',
                [
                    {
                        message: `${options.model} does not exist`,
                        path: [options.formField ?? options.field],
                        context: {
                            key: options.formField ?? options.field,
                            label: options.model,
                            value: options.value,
                        },
                    },
                ],
                options.value
            );
        }
        return options.value;
    }

    const privilegeRules = (baseCurrency, tradeCurrency) => {
        const rules = {
            deposit: {
                tradeCurrencyId: {
                    param: 'tradeCurrencyId',
                    dataType: 'string',
                    message: 'Trade Currency is not allowed!',
                },
                makerCharges: {
                    param: 'makerCharges',
                    dataType: 'object',
                    message: 'Maker charges are not allowed!',
                },
                takerCharges: {
                    param: 'takerCharges',
                    dataType: 'object',
                    message: 'Taker charges are not allowed!',
                },
            },
            order: {
                tradeCurrencyId: {
                    param: 'tradeCurrencyId',
                    dataType: 'undefined',
                    message: 'Trade Currency is required!',
                    details: {
                        param: 'type',
                        currencyType: 'crypto',
                        key: tradeCurrency,
                        flag: 'tradeCurrency',
                        message: 'Trade Currency should be in crypto!',
                    },
                },
                baseCurrencyId: {
                    param: 'baseCurrencyId',
                    dataType: 'undefined',
                    message: 'Base Currency is required!',
                    details: {
                        param: 'type',
                        currencyType: 'crypto',
                        key: baseCurrency,
                        flag: 'baseCurrency',
                        message: 'Base Currency type should be in crypto!',
                    },
                },
            },
            transfer: {
                tradeCurrencyId: {
                    param: 'tradeCurrencyId',
                    dataType: 'string',
                    message: 'Trade Currency is not allowed!',
                },
                baseCurrencyId: {
                    param: 'baseCurrencyId',
                    dataType: 'undefined',
                    message: 'Base Currency is required!',
                },
                makerCharges: {
                    param: 'makerCharges',
                    dataType: 'object',
                    message: 'Maker charges are not allowed!',
                },
                takerCharges: {
                    param: 'takerCharges',
                    dataType: 'object',
                    message: 'Taker charges are not allowed!',
                },
                charges: {
                    param: 'charges',
                    dataType: 'object',
                    message: 'Charges are not allowed!',
                },
            },
            'buy-crypto': {
                tradeCurrencyId: {
                    param: 'tradeCurrencyId',
                    dataType: 'undefined',
                    message: 'Trade Currency is required!',
                    details: {
                        param: 'type',
                        currencyType: 'fiat',
                        key: tradeCurrency,
                        flag: 'tradeCurrency',
                        message: 'Trade Currency should be in fiat!',
                    },
                },
                baseCurrencyId: {
                    param: 'baseCurrencyId',
                    dataType: 'undefined',
                    message: 'Base Currency is required!',
                    details: {
                        param: 'type',
                        currencyType: 'crypto',
                        key: baseCurrency,
                        flag: 'baseCurrency',
                        message: 'Base Currency should be in crypto!',
                    },
                },
                makerCharges: {
                    param: 'makerCharges',
                    dataType: 'object',
                    message: 'Maker charges are not allowed!',
                },
            },
            convert: {
                tradeCurrencyId: {
                    param: 'tradeCurrencyId',
                    dataType: 'undefined',
                    message: 'Trade Currency is required!',
                    details: {
                        param: 'type',
                        currencyType: 'crypto',
                        key: tradeCurrency,
                        flag: 'tradeCurrency',
                        message: 'Trade Currency should be in crypto!',
                    },
                },
                baseCurrencyId: {
                    param: 'baseCurrencyId',
                    dataType: 'undefined',
                    message: 'Base Currency is required!',
                    details: {
                        param: 'type',
                        currencyType: 'crypto',
                        key: baseCurrency,
                        flag: 'baseCurrency',
                        message: 'Base Currency should be in crypto!',
                    },
                },
                makerCharges: {
                    param: 'makerCharges',
                    dataType: 'object',
                    message: 'Maker charges are not allowed!',
                },
                charges: {
                    param: 'charges',
                    dataType: 'object',
                    message: 'Charges are not allowed!',
                },
            },
            withdrawal: {
                baseCurrencyId: {
                    param: 'baseCurrencyId',
                    dataType: 'undefined',
                    message: 'Base Currency is required!',
                },
                makerCharges: {
                    param: 'makerCharges',
                    dataType: 'object',
                    message: 'Maker charges are not allowed!',
                },
                takerCharges: {
                    param: 'takerCharges',
                    dataType: 'object',
                    message: 'Taker charges not allowed!',
                },
            },
        };
        return rules;
    }

    const routerWrapper = (router) => {
        const _route = router.route.bind(router);
        const methodsToWrap = ['get', 'post', 'patch', 'put', 'delete'];
        let ref = this;
        router.route = function (path) {
            const route = _route(path);
            for (const method of methodsToWrap) {
                if (route[method]) {
                    route[method] = ref.routeContainer(route[method]);
                }
            }
            return route;
        };
    }

    const routeContainer = (originRouterMethod) => {
        return function () {
            const originMiddlewares = [...arguments];
            const wrappedMiddlewares = originMiddlewares.map((fn) => {
                if (typeof fn !== `function`) {
                    return fn;
                }
            });
        };
    }

    const cardImage = () => {
        return {
            visa: 'https://burrency-bucket.s3.us-west-2.amazonaws.com/static/cards/visa.png',
            master: 'https://burrency-bucket.s3.us-west-2.amazonaws.com/static/cards/Mastercard.png',
            express: 'https://burrency-bucket.s3.us-west-2.amazonaws.com/static/cards/American-Express.png',
            discover: 'https://burrency-bucket.s3.us-west-2.amazonaws.com/static/cards/discover.png',
        };
    }

module.exports = {
	notExists,
	exists,
	privilegeRules,
	routerWrapper,
	routeContainer,
	cardImage,
};

