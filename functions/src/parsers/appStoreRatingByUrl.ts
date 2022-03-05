const cheerio = require('cheerio');
const axios = require('axios');
import { HttpResponse, ParseResult } from '../types';

export default async function AppStoreRatingByUrl(url: string) : Promise<ParseResult> {
    var response : HttpResponse = await axios.get(url).then((result : any) => {
        var resp : HttpResponse = {status: result.status, html: result.data.toString()};
        return resp;
    }).catch((err : any) => {
        console.log("Got error (AppStoreRatingByUrl): " + err);
        var resp : HttpResponse = {status: err.status}
        return resp;
    });
    try {
        if (response.status === 200) {
            const $ = cheerio.load(response.html);
            var data : string = $('.we-rating-count.star-rating__count').text().split(' ')[2];
            var downloads : number = parseFloat(data);
            if (!isNaN(downloads)) {
                if (data.indexOf("K") != -1) downloads *= 1000;
                else if (data.indexOf("M") != -1) downloads *= 1000000;
                return {val: downloads, isError: false, type: "live"};
            }
        }
    } catch (err) {
        console.log("Error parsing appStoreFromUrl", err);
    }
    return {isError: true};
}

exports.AppStoreRatingByUrl = AppStoreRatingByUrl;
// AppStoreRatingByUrl('https://apps.apple.com/us/app/finuprise-impact-investing/id1548907196')
// .then((res) => console.log(res)).catch((err) => console.log(err));