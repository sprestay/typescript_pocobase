const axios = require('axios');
import { ParseResult } from '../types';

export default async function getInstagrammFollowers(name: string) : Promise<ParseResult> {
    var response : ParseResult = await axios.request({
        url: "https://www.insfollowup.com/api/ins/getaccountbyusername",
        method: "POST",
        headers: {
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
            "Origin": "https://www.insfollowup.com",
            "Referer": "https://www.insfollowup.com/instagram-followers-counter",
            "Content-Type": "application/json;charset=utf-8",
            "Host": "www.insfollowup.com",
        },
        data: {
            sign_version: 1,
            signed_body: `5b8a4b74b8d77f1d258883c5818a4a744c096144a183e1f2f8938fa0f1b524e9.{"ins_account":"${name}","client_api":"","client_enable":true,"system_id":2}`
        }
    }).then((result : any) => {
        var d : number = parseInt(result.data['content']['user']['follower_count']);
        if (isNaN(d))
            return {isError: true};
        return {type: 'live', val: d, isError: false};
    }).catch((err : any) => {
        console.log(`ERROR parsing getInstagrammFollowers ${name}`);
        return {isError: true}; 
    });
    return response;
}

exports.getInstagrammFollowers = getInstagrammFollowers;
// getInstagrammFollowers("loiseaulebleu").then((res) => console.log(res)).catch((err) => console.log(err));