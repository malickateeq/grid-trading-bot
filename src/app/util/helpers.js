const Otp = require('../models/Otp');

/**
 * Verify OTP and check if user exists
 * @param {*} options
 * @returns Object
 */
const verifyOtp = async (options = {}) => {
    var otpDetails = await Otp.findOne({
        type: options.type,
        value: options.value,
    }).exec();
    if (!otpDetails) return { verified: false, message: 'Bad request!' };
    if (otpDetails.otp === options.otp) {
        otpDetails.status = 1;
        otpDetails.attempts = 0;
        otpDetails = await otpDetails.save();
        return { verified: true };
    } else {
        otpDetails.attempts++;
        otpDetails.status = 0;
        otpDetails = await otpDetails.save();
        return { verified: false, message: 'Invalid OTP!' };
    }
};

module.exports = {
    verifyOtp,
};
