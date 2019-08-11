const moment = require('moment')
var winston = require('winston');

var logger = winston.createLogger({
    levels: winston.config.npm.levels,
    level: 'debug',
    format: winston.format.combine(winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}), winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/AirTicketSearchetNode-' + moment().format('YYYY-MM-DD') + '.log'})
    ]
})

module.exports = logger;