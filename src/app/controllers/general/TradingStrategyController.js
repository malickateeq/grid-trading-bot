const { callRepository, send } = require('@burency/common');

const controller = {
    repoPath: 'general/TradingStrategyRepository',
    index: async (req, res) => send(res, await callRepository(controller.repoPath, 'index', req.args)),
    get: async (req, res) => send(res, await callRepository(controller.repoPath, 'get', req.args)),
    post: async (req, res) => send(res, await callRepository(controller.repoPath, 'post', req.args)),
    put: async (req, res) => send(res, await callRepository(controller.repoPath, 'put', req.args)),
    patch: async (req, res) => send(res, await callRepository(controller.repoPath, 'patch', req.args)),
};

module.exports = controller;
