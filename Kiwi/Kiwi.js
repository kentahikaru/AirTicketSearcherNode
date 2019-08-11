'use strict';
const moment = require('moment');
const path = require('path');
const table = require('table');
//import tableBuilder from 'table-builder';
//const table_builder = require('table-builder');
//var mailkit = require('mailkit');

exports.Search = async function(logger, config, browser)
{
    var listUrls = MakeUrlList(config, logger);
    await ProcessUrls(config, logger, browser, listUrls);

}

function MakeUrlList(config, logger)
{
    var startDate = moment().startOf('month').add(1, 'M');
    var maxDate = moment().startOf('month').add(1, 'M').add(config.monthsToLookFor, 'M');
    var currentDate = startDate;

    var destinations = config.kiwi.destinations.split(',');
    var listUrls = [];

    do{
        //destinations.forEach(function(destination,index)  {
        for(var destination of destinations)
        {
            var url = CreateUrl(config.kiwi.origin, destination, GetStartEndMonth(currentDate), config.kiwi.numberOfNights)
            listUrls.push(url);
        }

        currentDate.add(1,'M');
    }while(currentDate < maxDate)

    return listUrls;
}

function CreateUrl(origin, destination, departureDate, numberOfNights)
{
    var url = "https://www.kiwi.com/en/search/results/" + origin + "/" + destination + "/" + departureDate + "/" + numberOfNights;
    return url;
}

function GetStartEndMonth(currentDate)
{
    var startOfMonth = currentDate.startOf('month').format('YYYY-MM-DD');
    var endOfMonth = currentDate.endOf('month').format('YYYY-MM-DD');
    return startOfMonth + "_" + endOfMonth;
}

async function ProcessUrls(config, logger, browser, listUrls)
{
    var listOfResults = []
    var page;

    //await listOfResults.forEach(async (url, index) => {
    for(var url of listUrls) 
    {
        try{
            logger.debug(url);

            page = await browser.newPage()
            await page.setViewport({ width: 960, height: 926 });
            await page.goto(url);

            await page.waitForXPath("//Button[contains(div,'Load More')]");
            //await page.WaitForXPath("//[contains(div,'Journey-overview Journey-return')]");

            await page.evaluate(() => { 
                var elements = document.getElementsByClassName('Journey-overview Journey-return'); 
                for (i = 0; i < elements.length; i++) { 
                    elements[i].click(); 
                } 
            });

            await ScrapePage(logger, page);

        }
        catch(error)
        {
            logger.debug(error.stack);
            await page.screenshot({ path: path.join(process.cwd(), './logs/kiwi-' + moment().format("YYYY-MM-DD_HH-mm-ss") + '.jpg') });
        }
        finally
        {
            if(page != undefined && page != null)
            {
                page.close();
            }
        }

    }
}

async function ScrapePage(logger, page)
{
    try
    {
        const elements = await page.$x('.//div[contains(@class,"Journey clear spCard open")]')

        if(elements.length == 0)
        {
            throw new Error('No nodes to analyze');
        }

        for(let element of elements)
        {
            try
            {
                var subnodes = await element.$x('.//div[@class="TripInfo _results"]');
                var toDestination = subnodes[0];
                var fromDestination = subnodes[1];

                var results = {};
                var priceElement = await element.$x('.//div[@class="JourneyInfoStyles__JourneyInfoPrice-vpsxn5-2 gnDWaH"]');
                
                var neco = await priceElement[0].getProperty('textContent');
                var price = await neco.jsonValue();
                logger.debug(price);
           

            }
            catch(error)
            {
                logger.debug(error.stack);
            }
        }
    }
    catch(error)
    {
        logger.debug('No elements on page.')
    }

}