import {ParseResult, RecordValue, ConfigValue} from '../types';
import config from '../config';
import { mergeHistoricdData } from '../logic/utils';

class StartUp {
    // https://inlnk.ru/kXeyEY
    [signature_index: string]: any;


    constructor(database: Record<string, any>) {
        var parse_result_vals: Array<string> = config.map((e: ConfigValue) => e.output_field).concat(["stage_rank", "stage_score"]);
        var parse_input_vals: Array<string> = config.map((e: ConfigValue) => e.field_to_run);
        for (let p of parse_result_vals) {
            let r : RecordValue = p in database ? database[p] : {data:[], time:[]};
            this[p] = r;
        }

        for (let p of parse_input_vals) {
            let r : string | null = p in database ? database[p] : null;
            this[p] = r;
        }

        for (let key of Object.keys(database)) {
            if (parse_result_vals.indexOf(key) === -1 && parse_input_vals.indexOf(key) === -1) {
                this[key] = database[key];
            }
        }
    }

    checkField(field: string): boolean {
        return field in this && this[field] != undefined && this[field] != null;
    }

    getFieldByName(field: string): any {
        return this[field] != undefined ? this[field] : null;
    }

    updateFieldByNameAndParseResult(field: string, value: ParseResult): void {
        var current_time: number = Date.now();
        if (value.isError) {
            this[field].data.push(-1);
            this[field].time.push(current_time);
        } else {
            if (value.type == 'live') {
                this[field].data.push(value.val);
                this[field].time.push(current_time);
            } else { // historic
                if (this[field].data.length == 0) // данных нет
                    this[field] = value.val;
                else {
                    this[field] = mergeHistoricdData(this[field], value.val as RecordValue);
                }
            }
        }
        this[field].last_modified = current_time;
        this[field].count = this[field].data.length;
    }

    updateStageScore(val: number) {
        this['stage_score'].data.push(val);
        this['stage_score'].time.push(Date.now());
    }

    updateStageRank(val: number) {
        this['stage_rank'].data.push(val);
        this['stage_rank'].time.push(Date.now());
    }
    
    getJson(): Record<string, any> {
        return Object.fromEntries(new Map(Object.entries(this)));
    }

}

export default StartUp;