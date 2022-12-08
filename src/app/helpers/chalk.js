const chalk = require('chalk');

const logErr = (text = '') => {
    console.log('\n');
    console.log(chalk.red.bold('- - - - - - - - - - - - - - - - - -'));
    console.log(chalk.red.bold(text));
    console.log(chalk.red.bold('- - - - - - - - - - - - - - - - - -'));
    console.log('\n');
};

const logWarn = (text = '') => {
    console.log('\n');
    console.log(chalk.yellow.bold('- - - - - - - - - - - - - - - - - -'));
    console.log(chalk.yellow.bold(text));
    console.log(chalk.yellow.bold('- - - - - - - - - - - - - - - - - -'));
    console.log('\n');
};

const logInfo = (text = '') => {
    console.log('\n');
    console.log(chalk.blue.bold('- - - - - - - - - - - - - - - - - -'));
    console.log(chalk.blue.bold(text));
    console.log(chalk.blue.bold('- - - - - - - - - - - - - - - - - -'));
    console.log('\n');
};

const logSuccess = (text = '') => {
    console.log('\n');
    console.log(chalk.green.bold('- - - - - - - - - - - - - - - - - -'));
    console.log(chalk.green.bold(text));
    console.log(chalk.green.bold('- - - - - - - - - - - - - - - - - -'));
    console.log('\n');
};

module.exports = {
    logErr,
    logWarn,
    logInfo,
    logSuccess,
};
