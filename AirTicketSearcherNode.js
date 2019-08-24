const fs = require('fs');
const moment = require('moment')
const puppeteer = require('puppeteer');
var logger = require('./Logger')
var config = JSON.parse(fs.readFileSync('./config.json','utf8'));
const kiwi = require('./Kiwi/Kiwi');
const pelikan = require('./Pelikan/Pelikan');

(async() => {


    try{
        
        const browser = await puppeteer.launch({headless: config.headless, executablePath: config.chromePath});
        await kiwi.Search(logger, config, browser)
        await pelikan.Search(logger, config, browser)


        await browser.close();
    }
    catch(error)
    {
        logger.debug(error.stack);
    }
})()

