const Joi = require('joi');

const rules = {
    'POST:users': {
        method: Joi.optional(),
        subscribe: Joi.optional(),
        limit: Joi.optional(),
        accessToken: Joi.optional(),
        interval: Joi.optional(),
        streamTime: Joi.optional(),
        params: Joi.optional(),
        query: Joi.optional(),
        body: Joi.optional(),
    },
};

module.exports = rules;
