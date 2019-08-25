'use strict';
const moment = require('moment');
const path = require('path');
const tableBuilder = require('table-builder');
var mail = require('../Mail');

exports.Search = async function(logger, config, browser)
{
    logger.debug("Pelikan search");
    var listUrls = MakeUrlList(config, logger);
    var listResults = await ProcessUrls(config, logger, browser, listUrls).then(function(listResults) {
         var resultTable = PrepareResults(config, logger, listResults);
         mail.SendMail(logger, config.pelikan.emailSubject, resultTable);
    });
}

function MakeUrlList(config, logger)
{
    logger.debug("MakeUrlList");
    var startDate = moment().startOf('month').add(1, 'M');
    var maxDate = moment().startOf('month').add(1, 'M').add(config.monthsToLookFor, 'M');
    var currentDate = startDate;

    var destinations = config.pelikan.destinations.split(',');
    var listUrls = [];

    do{
        for(var destination of destinations)
        {
            var url = CreateUrl(config.pelikan.origin, destination, currentDate.format("YYYY_MM_DD"), GetEndOfStay(currentDate, config.pelikan.numberOfNights))
            listUrls.push(url);
        }

        currentDate.add(6,'d');
    }while(currentDate < maxDate)

    return listUrls;
}

function CreateUrl(origin, destination, departureDate, returnDate)
{
    var url = "https://www.pelikan.cz/cs/letenky/T:1,P:1000E_0_0,CDF:C" + origin + ",CDT:C" + destination + ",R:1,DD:" + departureDate + ",DR:" + returnDate + "/";
    return url;
}

function GetEndOfStay(currentDate, numberOfNights)
{
    var current = currentDate.format('YYYY-MM-DD');
    var endOfStay = moment(current);
    endOfStay.add(numberOfNights,"d");
    return endOfStay.format("YYYY_MM_DD");
}

async function ProcessUrls(config, logger, browser, listUrls)
{
    logger.debug("ProcessUrls");
    var listOfResults = []
    var page;

    for(var url of listUrls) 
    {
        try{
            logger.debug(url);
            //showMemory(logger);
            
            page = await browser.newPage()
            await page.setViewport({ width: 960, height: 926 });
            await page.goto(url);

            await page.waitForXPath("//div[contains(@id,'flight-1000')]");

            var scrapedResults = await ScrapePage(config, logger, page);
            listOfResults.push(scrapedResults);

        }
        catch(error)
        {
            logger.debug(error.stack);
            await page.screenshot({ path: path.join(process.cwd(), './logs/pelikan-' + moment().format("YYYY-MM-DD_HH-mm-ss") + '.jpg') });
        }
        finally
        {
            if(page != undefined && page != null)
            {
                page.close();
            }
        }

    }

    page = null;
    return listOfResults;
}

async function ScrapePage(config, logger, page)
{
    logger.debug("ScrapePage");
//   showMemory(logger);

    var listResults = [];
    try
    {
        const elements = await page.$x("//div[contains(@id,'flight-1000')]")

        if(elements.length == 0)
        {
            throw new Error('No nodes to analyze');
        }

        for(let element of elements)
        {
            try
            {
                var price = await GetContent(logger, element, ".//div[@class='fly-search-price-info-wrapp']/div[3]", "textContent");

                price = price.toString().replace(/ /gi,'');
                price = price.substring(0, price.length - 2);
                
                if(price > config.maxPrice)
                {
                    continue;
                }

                var subnodesCollection = await element.$x(".//div[@class='row fly-row no-mrg']");
                
                for(let subNode of subnodesCollection)
                {
                    var results = {};
                    
                    results.price = price;
                    results.baggage = await GetTextContent(logger, subNode, ".//div[@class='fly-item-bottom-info-left-new-reservation']");
                    results.airline = await GetTextContent(logger, subNode, ".//div[@class='fly-item-bottom-info-right-new-reservation']");
                    results.tolerance = await GetTextContent(logger, subNode, ".//div[@class='fly-item-tolerance-new-reservation']");
                    results.departureDay = await GetTextContent(logger, subNode, ".//span[@class='fly-item-day-new-reservation']");
                    results.departureDate = await GetTextContent(logger, subNode, ".//div[@class='fly-item-one-trip-no-radio-new-reservation']");
                    var tmpElement = await GetElement(logger, subNode, ".//div[@class='first-dest-item']");
                    results.departureCity = await GetTextContent(logger, tmpElement, ".//h1[@class='airport']");

                    tmpElement = await GetElement(logger, subNode, ".//div[@class='first-dest-item']");
                    results.departureTime = await GetTextContent(logger, tmpElement, ".//span[contains(@class,'fly-item-time-new-reservation')]");
                    
                    tmpElement = await GetElement(logger, subNode, ".//div[@class='first-dest-item']");
                    results.departureAirport = await GetTextContent(logger, tmpElement, ".//div[@class='place-define']");

                    results.durationToDestination = await GetTextContent(logger, subNode, ".//div[@class='fly-item-arrow-new-reservation']/div");

                    tmpElement = await GetElement(logger, subNode, ".//div[@class='second-dest-item']");
                    results.destinationCity = await GetTextContent(logger, tmpElement, ".//h1[@class='airport']");

                    tmpElement = await GetElement(logger, subNode, ".//div[@class='second-dest-item']");
                    results.destinationTime = await GetTextContent(logger, tmpElement, ".//span[contains(@class,'fly-item-time-new-reservation')]");

                    tmpElement = await GetElement(logger, subNode, ".//div[@class='second-dest-item']");
                    results.destinationAirport = await GetTextContent(logger, tmpElement, ".//div[@class='place-define']");

                    results.url = await page.url();

                    listResults.push(results);
                }
            }
            catch(error)
            {
                logger.debug(error.stack);
            }

            listResults.push(GetEmptyResults());
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
        if(xPathElement != null && xPathElement.length > 0)
        {
            var xPathElementTextContent = await xPathElement[0].getProperty('textContent');
            return await xPathElementTextContent.jsonValue();
        }
        else
        {
            return "";
        }
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

async function GetElement(logger, element, xpath)
{
    try
    {
        var xPathElement = await element.$x(xpath);
        if(xPathElement.length > 0)
        {
            return await xPathElement[0];
        }
        else
        {
            return null;
        }
    }
    catch(error)
    {
        logger.debug(error.stack);
        return "";
    }
}

function PrepareResults(config, logger, listResults)
{
    logger.debug("PrepareResults");
    var tables = "";
    try{
        var headers = {"price": "Price", "baggage":"Baggage", "airline":"Airline", "tolerance" : "Tolerance", "departureDay" : "Departure day", "departureDate": "Departure date",
        "departureCity": "Departure city", "departureTime": "Departure time", "departureAirport":"Departure airport", "durationToDestination" : "Duration to destination",
        "destinationCity":"Destination city","destinationTime":"Destination time","destinationAirport":"Destination Airport", "url":"Url"};

        for(var resultList of listResults)
        {
            tables = tables + (new tableBuilder({'border':'1'})).setHeaders(headers).setData(resultList).render();
            tables = tables + "</br> </br>"
        }
    }
    catch(error)
    {
        logger.debug(error.stack);
    }


    return tables;
}

function GetEmptyResults()
{
    var results = {};
    results.price = "";
    results.baggage = "";
    results.airline = "";
    results.tolerance = "";
    results.departureDay = "";
    results.departureDate = "";
    results.departureCity = "";
    results.departureTime = "";
    results.departureAirport = "";
    results.durationToDestination = "";
    results.destinationCity = "";
    results.destinationTime = "";
    results.destinationAirport = "";
    results.url = "";
    return results;
}