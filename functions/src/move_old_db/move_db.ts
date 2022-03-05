const axios = require('axios');
const fs = require('fs');

import config from '../config';
import { ConfigValue } from '../types';

var all_db_url : string = "https://us-central1-startup-monitoring.cloudfunctions.net/getAllStartUps";
var startup_data_url : string = "https://us-central1-startup-monitoring.cloudfunctions.net/getStartUpByIdWithOutModifications";
var output_fields = config.map((e: ConfigValue) => e.output_field);

const cleanData = (json: Record<string, any>) => {
    for (let p of output_fields) {
        if (p in json && json[p]) {
            json[p]['data'] = json[p]['data'].map((e: any) => isNaN(e) ? -1 : e);
        }
    }
    return json;
}

async function downloadStartups() : Promise<void> {
    var response : Array<string> | null = await axios.request({
        url: all_db_url,
        method: 'GET',
    }).then((res: any) => {
        var items: Array<any> = res.data.items;
        return(items.map((item: any) => item.doc_id));
    }).catch((err: any) => {
        console.log("ERROR", err);
        return null;
    });

    if (response == null) return;

    var db : Record<string,any> = {};
    var promises : Array<Promise<void>> = response.map((e: string) => {
        return axios.request({
            url: startup_data_url,
            method: "GET",
            params: {doc_id: e}
        }).then((res: any) => {
            db[e] = cleanData(res.data.item);
        }).catch((err: any) => {
            console.log("Error", err);
        });
    });

    await Promise.all(promises);
    fs.writeFile("./startups.json", JSON.stringify(db), (err:any) => console.log(err));
}


downloadStartups();