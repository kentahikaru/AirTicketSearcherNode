'use strict';
const moment = require('moment')

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
        logger.debug("for loop");
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


        }
        catch(error)
        {
            logger.debug(error.stack);
            await page.screenshot({ path: path.join(__dirname, '.\\logs\\kiwi-' + moment().format("YYYY-MM-DD_HH-mm-ss") + '.jpg') });
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