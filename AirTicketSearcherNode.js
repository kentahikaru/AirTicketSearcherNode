const fs = require('fs');
const moment = require('moment')
var winston = require('winston');
var config = JSON.parse(fs.readFileSync('./config.json','utf8'));

(async() => {
    // const myFormat = printf(({ level, timestamp, message  }) => {
    //     return `${level} ${timestamp} : ${message}`;
    // });

    var logger = winston.createLogger({
        levels: winston.config.npm.levels,
        level: 'debug',
        format: winston.format.combine(winston.format.simple(), winston.format.timestamp()),
        transports: [
            new winston.transports.Console(),
            new winston.transports.File({ filename: 'logs/AirTicketSearchetNode-' + moment().format('YYYY-MM-DD') + '.log'})
        ]
    })

    try{
       

        await test();
    }
    catch(error)
    {
        logger.debug(error);
        logger.info(error.stack);
    }
})()

async function test()
{
    throw new Error("Testovaci onyyyy");
}