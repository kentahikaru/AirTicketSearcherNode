const fs = require('fs');
const moment = require('moment')
var logger = require('./Logger')
var config = JSON.parse(fs.readFileSync('./config.json','utf8'));

(async() => {
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