const axios = require('axios'); 
import { HttpResponse, ParseResult} from '../types';

export default async function getTwitterFollowers(name: string): Promise<ParseResult> {
    var url : string = "https://influencermarketinghub.com/libs/twitter-getContent.php";
    var response : HttpResponse = await axios.request({
            url: url,
            method: "POST",
            headers: {
                "Referer": "https://influencermarketinghub.com/twitter-money-calculator/", 
                "origin": "https://influencermarketinghub.com", 
            },
            data: `name=${name}`
        }
    ).then((res : any) => {
        var data : string = res.data[0];
        var json : Record<string, any> = JSON.parse(data);
        var num : number = parseInt(json['followers_count']);
        if (isNaN(num)) 
            return {status: 500}
        return {status: 200, value: num};
    }).catch((err : any) => {
        console.log("Error getting value for twitter", err);
        return {status: 500};
    });

    if (response.status === 200) {
        return {val : response.value, type: "live", isError: false}
    }
    return {isError: true};
}

exports.getTwitterFollowers = getTwitterFollowers;
// getTwitterFollowers("vivino").then((res) => console.log(res)).catch((err) => console.log(err));