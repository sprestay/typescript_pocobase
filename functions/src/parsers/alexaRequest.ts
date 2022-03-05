const axios = require('axios');
const convert = require('xml-js');
import { ParseResult } from '../types';

export default async function alexaRequest(url: string) : Promise<ParseResult> {
    var request_url = `https://awis.api.alexa.com/api?Action=UrlInfo&Count=10&ResponseGroup=Rank,LinksInCount&Start=1&Url=${url}`;
    var response : Promise<ParseResult> = axios.request({
        url: request_url,
        headers: {
            "x-api-key": "4S4l4uIWuGTyItFGtPjv2W1pWCWclNa20bljnzcb",
        },
        method: "GET",
    }).then((res:any) => {
        var json : any = JSON.parse(convert.xml2json(res.data));
        var val : number = parseInt(json.elements[0].elements[1].elements[0].elements[0].elements[2].elements[1].elements[0].text);
        return {isError: false, val: val, type: "live"};
    }).catch((err: any) => {
        console.error("Alexa parser", err);
        return {isError: true};
    });

    return await response;
}

// alexaRequest("https://www.finuprise.com/").then((res) => console.log(res));