'use strict';
const moment = require('moment');
const path = require('path');
const tableBuilder = require('table-builder');
var mail = require('../Mail');

exports.Search = async function(logger, config, browser)
{
    var listUrls = MakeUrlList(config, logger);
    var listResults = await ProcessUrls(config, logger, browser, listUrls);
    var resultTable = PrepareResults(config, logger, listResults);
    mail.SendMail(logger, config.kiwi.emailSubject, resultTable);
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

            listOfResults = await ScrapePage(config, logger, page);

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

    return listOfResults;
}

async function ScrapePage(config, logger, page)
{
    var listResults = [];
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

                var price = await GetTextContent(logger, element, './/div[@class="JourneyInfoStyles__JourneyInfoPrice-vpsxn5-2 gnDWaH"]');
                price = price.toString().split(" ")[0].replace(",",".").replace(".","");

                if(price > config.maxPrice)
                {
                    continue;
                }

                results.price = price;

                results.lengthOfStay = await GetTextContent(logger, element, './/div[@class="Journey-nights-place"]');

                results.airlinesToDestination = await GetTextContent(logger, toDestination, ".//div[@class='AirlineNames']");
                results.airlinesFromDestination = await GetTextContent(logger, fromDestination, ".//div[@class='AirlineNames']");

                results.durationToDestination = await GetTextContent(logger, toDestination, ".//div[@class='TripInfoField-flight-duration']");
                results.durationFromDestination = await GetTextContent(logger, fromDestination, ".//div[@class='TripInfoField-flight-duration']");
                
                results.departureDate = await GetTextContent(logger, toDestination, ".//div[@class='TripInfoField-date']");
                results.returnDate = await GetTextContent(logger, fromDestination, ".//div[@class='TripInfoField-date']");
           
                results.departureTime = await GetTextContent(logger, toDestination, ".//div[@class='TripInfoField-time']");
                results.returnTime = await GetTextContent(logger, fromDestination, ".//div[@class='TripInfoField-date']");

                results.bookingLink = await GetContent(logger, element, ".//div[@class='JourneyBookingButtonLink']/a", "href");

                listResults.push(results);
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

    return listResults;
}

async function GetTextContent(logger, element, xpath)
{
    try
    {
        var xPathElement = await element.$x(xpath);
        var xPathElementTextContent = await xPathElement[0].getProperty('textContent');
        return await xPathElementTextContent.jsonValue();
    }
    catch(error)
    {
        logger.debug(error.stack);
        return "";
    }
}

async function GetContent(logger, element, xpath, content)
{
    try
    {
        var xPathElement = await element.$x(xpath);
        var xPathElementTextContent = await xPathElement[0].getProperty(content);
        return await xPathElementTextContent.jsonValue();
    }
    catch(error)
    {
        logger.debug(error.stack);
        return "";
    }
}

function PrepareResults(config, logger, listResults)
{
    var headers = {"price": "Price", "lengthOfStay" : "Length of stay", "airlinesToDestination" : "Airlines to destination", "airlinesFromDestination": "Airlines from destination",
        "durationToDestination": "Duration to destination", "durationFromDestination": "Duration from destination", "departureDate":"Departure date", "returnDate" : "Return Date",
        "departureTime":"Departure time","returnTime":"Return time","bookingLink":"Booking link"};

    return (new tableBuilder({'class': 'Kiwi table'})).setHeaders(headers).setData(listResults).render();
}