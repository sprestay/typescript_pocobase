import StartUp from '../models/startup';
import { RecordValue } from '../types';
import config from '../config';


function individualFomo(data : number[], weight: number) : number {
    let mean = data.slice(0, data.length - 1).reduce((a,b) => a + b, 0) / (data.length - 1);
    let current_period = data[data.length - 1];
    if ((current_period > mean * 1.1 && weight > 0) || (current_period < mean * 1.1 && weight < 0))
        var score = 100;
    else if ((current_period < mean * 0.9 && weight > 0) || (current_period > mean * 0.9 && weight < 0))
        var score = 0;
    else
        var score = 50;
    return score;
}

function calculateGrowth(array : number[]) : number[] {
    var result = [];
    for (let i = 1; i < array.length; i++) {
        result.push(array[i] - array[i - 1]);
    }
    return result;
}

function roundTimeStamp(timestamp : number) : number {
    var d = new Date(timestamp); // сначала туда, затем обратно. Хочу почистить таким образом данные - чтобы не было нескольких записей 
    var m = d.getMinutes();
    var s = d.getSeconds();
    var h = d.getHours();
    var ms = d.getMilliseconds();
    return timestamp - ms - (s * 1000) - (m * 1000 * 60) - (h * 60 * 60 * 1000);
}


export default function parseStartUp(startup: StartUp): Record<string, any> {
    var fomo_table: Record<string, any> = {};
    var output: Record<string, any> = {};
    var startup_occupancy_rate = 0;

    for (let parser of config) {
        let p = parser.output_field;
        if (startup.getFieldByName(p) != null && startup.getFieldByName(p).count) {
            startup_occupancy_rate++; // количество источников данных с данными. -1 пока не учитываем
            let startup_value : RecordValue = startup.getFieldByName(p);
            let indexes_to_skip : Array<number | null> = startup_value.data.map((e: number, indx: number) => e === -1 ? indx : null);
            let new_data = startup_value.data.filter((e: number, indx: number) => !indexes_to_skip.includes(indx));
            let new_time = startup_value.time.filter((e: number, indx: number) => !indexes_to_skip.includes(indx));
            let fomo: Array<number> = [];

            // calculate personal fomo for this startup
            for (let i = 0; i < new_time.length; i++) {
                if (i > 2) {
                    let last_val: number= individualFomo(calculateGrowth(new_data.slice(0, i)), parser.weight);
                    fomo.push(last_val);
                } else {
                    fomo.push(0);
                }
            }
            fomo_table[p] = {"index": 0, "fomo": fomo, "last_val": 0, "time" : new_time, "weight": parser.weight};
            // index - последний прочитанный идекс этого источника при построении TOTAL_FOMO
            // last_val - последнее прочитанное значение этого источника при построении TOTAL_FOMO
            output[p] = {
                "data": new_data,
                "time": new_time,
                "fomo": fomo
            }
        }
    }

    // чтобы высчитать динамику в TOTAL_FOMO придется рассчитать all_times
    var all_times : Array<number> = [... new Set(Object.keys(output).map((key: string) => output[key]['time'].map((val: number) => roundTimeStamp(val))).flat())];
    all_times.sort((a: number, b: number) => a - b);
    output["TOTAL_FOMO"] = [];
    for (let i = 0; i < all_times.length; i++) {
        let scores: number = 0;
        let total: number = 0;
        for (let key of Object.keys(fomo_table)) {
            // если all_times[i] меньше time[index] - значит возвращаем последнее значение
            // ecли all_times[i] == time[index] - меняем last_val , index++
            // eсли all_time[i] > time[index] - возвращаем последнее значение
            let t: Record<string, any> = fomo_table[key];
            if (all_times[i] == roundTimeStamp(t['time'][t['index']])) {
                t['last_val'] = t['fomo'][t['index']];
                t['index'] = t['index'] + 1; 
            } 
            scores += t['last_val'] * Math.abs(t['weight']);
            total += Math.abs(t['weight']);
        }
        output['TOTAL_FOMO'].push(total == 0 ? 0 : scores / total);
    }

    return {
        ...startup.getJson(),
        ...output,
        "fomo": output['TOTAL_FOMO'][output['TOTAL_FOMO'].length - 1],
        "startup_occupancy_rate": startup_occupancy_rate
    }

}

// export default function parseStartUp(startup: StartUp): Record<string, any> {
//     // PREPARATION
//     var config_hashtable: Record<string, any> = {};
//     config.filter((e: ConfigValue) => startup.checkField(e.output_field)).map((e: ConfigValue) => config_hashtable[e.output_field] = e.weight);
    
//     var all_times : number[] = [];
//     [...Object.keys(config_hashtable), "stage_rank", "stage_score"].map((key : string) => {
//         all_times.push(...startup.getFieldByName(key).time.map((t: number) => roundTimeStamp(t)))
//     });

//     all_times = [... new Set(all_times)]; // delete dups
//     all_times.sort((a,b) => a - b);
//     var fomo_table : Record<string, any> = {};
//     var table : Record<string, any> = startup.getJson();

//     // CALCULATING DATA
//     Object.keys(config_hashtable).forEach((key : string) => {
//         let startup_index : number = 0;
//         let last_val : number = -1;
//         let result : number[] = []
//         let fomos : number[] = [];
//         let pure_fomo : number[] = []; // таблица fomo без -1. Будем считать TOTAL_FOMO
//         for (let time of all_times) {
//             if (time == roundTimeStamp(startup[key]['time'][startup_index])) {
//                 var val : number = parseInt(startup[key]['data'][startup_index]);
                
//                 // skip dup data
//                 while(time == roundTimeStamp(startup[key]['time'][startup_index]))
//                     startup_index++;
                
//                 result.push(val);
//                 // calculating fomos
//                 if (startup_index > 2) {
//                     last_val = individualFomo(calculateGrowth(startup[key]['data'].slice(0, startup_index)), config_hashtable[key]);
//                     fomos.push(last_val);
//                     pure_fomo.push(last_val);
//                 } else {
//                     last_val = 0;
//                     fomos.push(0);
//                     pure_fomo.push(0);
//                 }
//             } else {
//                 result.push(-1);
//                 fomos.push(-1);
//                 pure_fomo.push(last_val);
//             }
//         }
//         table[key] = result;
//         table["FOMO_" + key] = fomos;
//         fomo_table[key] = pure_fomo;
//     });

//     // calculating total fomo 
//     table["TOTAL_FOMO"] = [];
//     for (let i = 0; i < all_times.length; i++) {
//         let scores = 0;
//         let total = 0;
//         Object.keys(fomo_table).forEach((key) => {
//             if (fomo_table[key][i] != -1) {
//                 scores += fomo_table[key][i] * Math.abs(config_hashtable[key]);
//                 total += Math.abs(config_hashtable[key]);
//             }
//         });
//         table["TOTAL_FOMO"].push(total == 0 ? 0 : scores / total);
//     }

//     table["STAGE_SCORE"] = [];
//     var j = 0; // startup[stage_score] номер записи
//     for (let i = 0; i < all_times.length; i++) {
//         let b = (startup['stage_score'] != undefined) && (startup['stage_score']['time'] != undefined);
//         if (b && (j < startup['stage_score']['time'].length) && (all_times[i] == roundTimeStamp(startup['stage_score']['time'][j]))) { // значит в этом время обновлялся stage_score
//             table["STAGE_SCORE"].push(startup['stage_score']['data'][j]);
//             j++;
//         } else {
//             table['STAGE_SCORE'].push(-1);
//         }
//     }

//     table["STAGE_RANK"] = [];
//     var p = 0;
//     for (let i = 0; i < all_times.length; i++) {
//         let b = (startup['stage_rank'] != undefined) && (startup['stage_rank']['time'] != undefined);
//         if (b && (p < startup['stage_rank']['time'].length) && (all_times[i] == roundTimeStamp(startup['stage_rank']['time'][p]))) {
//             table["STAGE_RANK"].push(startup['stage_rank']['data'][p]);
//             p++;
//         } else {
//             table["STAGE_RANK"].push(-1);
//         }
//     }

//     return {
//         ...startup,
//         ...table,
//         "fomo": table["TOTAL_FOMO"][table["TOTAL_FOMO"].length - 1],
//         "time_list": all_times.map((i) => formatDate(i)),
//     }
// }