const axios = require('axios');
const cheerio = require('cheerio');
import { ParseResult, HttpResponse } from '../types';

export default async function playMarketRatingByUrl(url: string): Promise<ParseResult> {
    var response : HttpResponse = await axios.get(url)
    .then((res : any) => {
        return {status: res.status, html: res.data.toString()};
    }).catch((err : any) => {
        console.log("Error getting val from playmarket", err);
        return {status: 500};
    });

    try {
        if (response.status === 200) {
            const $ = cheerio.load(response.html);
            var result_value : number = 0;
            $('c-wiz span span').each((index : number, html : HTMLElement) => {
                var local : string = $(html).text().replace(/\s|,/g, '');
                var downloads : number = parseInt(local);
                if (downloads.toString().length == local.length)
                    result_value = downloads;
            });
            return {type: "live", val: result_value, isError: false};
        }
    } catch (err) {
        console.log(`Error parsing playmarket ${url}`);
    }
    return {isError: true};
}

exports.playMarketRatingByUrl = playMarketRatingByUrl;
// playMarketRatingByUrl("https://play.google.com/store/apps/details?id=com.google.android.apps.youtube.kids").then((res: any) => console.log(res));