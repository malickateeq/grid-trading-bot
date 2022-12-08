const getIntervalToUnixTimestamp = (timeInString, type = 'dashed') => {
    let literals = [];
    let timeInMS;
    if (type === 'dashed') {
        literals = (timeInString ?? '1-d').split('-');
    } else if (type === 'combined') {
        let timeInDashedString = '';
        for (let i = 0; i < timeInString.length; i++) {
            if (/\d/.test(timeInString[i])) {
                timeInDashedString += timeInString[i];
            } else {
                timeInDashedString += '-' + timeInString[i];
            }
        }
        literals = (timeInDashedString ?? '1-d').split('-');
    }
    if (literals.length < 2) return false;
    if (literals[1] === 'd') {
        timeInMS = parseInt(literals[0]) * 24 * 60 * 60 * 1000;
    } else if (literals[1] === 'h') {
        timeInMS = parseInt(literals[0]) * 60 * 60 * 1000;
    } else if (literals[1] === 'm') {
        timeInMS = parseInt(literals[0]) * 60 * 1000;
    }
    return timeInMS;
};

module.exports = {
    getIntervalToUnixTimestamp,
};
