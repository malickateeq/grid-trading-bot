const { Response, ApiError, LogException } = require('@burency/common');

const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new ApiError({ message, status: 400 });
};

const handleDuplicateFieldsDB = (err) => {
    const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
    const message = `Duplicate  field value: ${value}, Please use another value`;
    return new ApiError({ message, status: 400 });
};

const handleValidationErrorDB = (err) => {
    const errors = Object.keys(err.errors).map((el) => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new ApiError({ message, status: 422 });
};

const handleJWTsError = () => new ApiError({ message: 'Invalid token, Please log in again', status: 401 });

const handleJWTExpiredError = () =>
    new ApiError({ message: 'Your token has expired, Please log in again', status: 401 });

const sendErrorDev = (err, req, res) => {
    // LogException.log_exception(req, err);
    res.status(err.status).json({
        status: err.status,
        message: err.message,
        error: err.stack?.split('\n'),
        data: err.data,
    });
};

const sendErrorProd = (err, req, res) => {
    // LogException.log_exception(req, err);
    if (err.isOperational) {
        res.status(err.status).json({
            status: err.status,
            message: err.message,
            data: err.data,
        });
    } else {
        console.log('Something went wrong');
        res.json(Response.exception({ message: 'Something went wrong' }));
    }
};

const errorHandler = (err, req, res, next) => {
    err.status = err.status || 500;

    if (process.env.APP_ENV == 'local') {
        let error = err;
        if (error.name === 'CastError') error = handleCastErrorDB(error);
        if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
        if (error.code === 11000) error = handleDuplicateFieldsDB(error);
        if (error.name === 'JsonWebTokenError') error = handleJWTsError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
        sendErrorDev(error, req, res);
    } else if (process.env.APP_ENV == 'production') {
        let error = err;
        if (error.name === 'CastError') error = handleCastErrorDB(error);
        if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
        if (error.code === 11000) error = handleDuplicateFieldsDB(error);
        if (error.name === 'JsonWebTokenError') error = handleJWTsError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

        sendErrorProd(error, req, res);
    }
};

module.exports = { errorHandler };
