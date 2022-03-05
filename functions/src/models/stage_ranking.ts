import config from '../config';
import { ConfigValue } from '../types';


export default class StageRanking {
    [signature_index: string]: any;

    constructor(stage_ranking: Record<string, any>) {
        var func_names : Array<string> = config.map((e: ConfigValue) => e.output_field);
        for (let n of func_names) {
            this[n] = stage_ranking && n in stage_ranking ? stage_ranking[n] : [];
        }
    }

    getFieldByName(field: string): any {
        return this[field] != undefined ? this[field] : null;
    }

    getJson(): Record<string, any> {
        return Object.fromEntries(new Map(Object.entries(this)));
    }

}