import {ConfigValue} from '../types';
import config from '../config';

export default class StageScore {
    [signature_index: string]: any;

    constructor(app_state: Record<string, number>) {
        var names : Array<string> = config.map((e : ConfigValue) => ["max_" + e.output_field, "min_" + e.output_field]).flat();
        for (let n of names) {
            this[n] = app_state && app_state[n] ? app_state[n] : (n.startsWith("max_") ? 0 : 10000000000);
        }
    }

    getJson(): Record<string, any> {
        return Object.fromEntries(new Map(Object.entries(this)));
    }


}