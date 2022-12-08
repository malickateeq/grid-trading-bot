const { v4: uuidv4 } = require('uuid');
const { DetectUser, env } = require('@burency/common');
const { performance } = require('perf_hooks');

const resDotSendInterceptor = (res, send) => (content) => {
    res.contentBody = content;
    res.send = send;
    res.send(content);
};

const logger = function (req, res, next) {
    // Store this Log in the database
    console.log('Route invoked: ' + req.originalUrl);
    req.args = { body: req.body, headers: req.headers };

    req.startTime = performance.now();
    req.coRelationId = uuidv4();
    res.send = resDotSendInterceptor(res, res.send); // Intercept response send method

    res.on('finish', async () => {
        const { statusCode, statusMessage, contentBody } = res;
        if (contentBody?.status >= 200 && contentBody?.status < 400) {
            const { rawHeaders, method, originalUrl, startTime, coRelationId } = req;
            var user = null;
            if (req.authUser?.user !== undefined) {
                var detect_user = new DetectUser({ req, headers: req.headers });
                user = {
                    id: req.authUser?.user._id,
                    email: req.authUser?.user.email ? req.authUser?.user.email : req.authUser?.user.phone,
                    about_user: detect_user,
                };
            }
        }
    });
    next();
};

module.exports = { logger };
