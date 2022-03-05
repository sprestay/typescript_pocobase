import Startup from '../models/startup';
import StageRanking from '../models/stage_ranking';
import StageScore from '../models/stage_score';
import config from '../config';
import {ParseResult, RecordValue, StageRankValue, RemoteConfigValue} from '../types';
import {getLastValue, shouldUpdateFunction, calcStageScore, calcStageRank, calculateModifiedDate} from '../logic/utils';

// что делать, когда функция возвращает ошибку
// такой подход будем вызывать обновление всегда - надо учитывать modified

export default async function updateStartup(startup: Startup, stage_rank: StageRanking, stage_score: StageScore, remote_config: RemoteConfigValue): Promise<void> {
    // итерируемся по функциям из конфига.
    // применяем функцию к каждому полю в стартапе

    var promises : Array<Promise<void>> = [];
    var flag_slow_startup_was_updated : boolean = false;
    var any_field_was_updated = false;
    // var fields_in_startup : Array<ConfigValue> = config.filter((e : ConfigValue) => startup.checkField(e.field_to_run));

    for (let parser of config) {
        if (startup.checkField(parser.field_to_run)) {
            var startup_val = startup.getFieldByName(parser.output_field);
            
            if (shouldUpdateFunction(remote_config, startup_val)) {
                // To update data evenly, update only one field at a time
                // To spread stocks - update only one data source at a time
                if (startup_val != null && startup_val.count >= remote_config.threshold && flag_slow_startup_was_updated)
                    continue;

                // this field used to determine should we update STAGE_RANK and STAGE_SCORE or not
                if (!any_field_was_updated)
                    any_field_was_updated = true;

                var prom = parser.func(startup.getFieldByName(parser.field_to_run))
                .then((res : ParseResult) => {
                    startup.updateFieldByNameAndParseResult(parser.output_field, res);
                    console.log("Successfully update function", parser.output_field, res)
                })
                .catch((err : any) => {
                    startup.updateFieldByNameAndParseResult(parser.output_field, {isError: true});
                    console.log("Error updating " + parser.output_field)
                });
                promises.push(prom);
                
                // only one slow field per time
                if (startup_val.count >= remote_config.threshold) flag_slow_startup_was_updated = true;
            }
        }
    }
    await Promise.all(promises);

    // STAGE_SCORE and STAGE_RANK calculation
    // var output_names : Array<string> = config.map((item : ConfigValue) => item['output_field']);
    for (var parser of config) {
        var name = parser.output_field;
        var field_value : RecordValue = startup.getFieldByName(name);
        var last_value : number | null = getLastValue(field_value.data);
        if (last_value === null)
            continue;

        // STAGE_SCORE calculation
        stage_score["max_" + name] = stage_score["max_" + name] ? Math.max(stage_score["max_" + name], last_value) : last_value;
        stage_score["min_" + name] = stage_score["min_" + name] ? Math.min(stage_score["min_" + name], last_value) : last_value;

        // STAGE_RANK calculation
        // 1 case: no such key in stage_rank
        if (stage_rank.getFieldByName(name) === null) {
            stage_rank[name] = [{title: startup.getFieldByName("title"), val: last_value}] as  Array<StageRankValue>;
        }

        var current_startup_index: number = stage_rank[name].findIndex((e : StageRankValue) => e.title === startup['title']);
        if (current_startup_index === -1) {
            // 2 case: no such startup in stage_rank
            stage_rank[name].push({title: startup['title'], val: last_value});
        } else {
            // 3 case: just change value in stage_rank
            stage_rank[name][current_startup_index]['val'] = last_value;
        }
        // so, lets sort this data
        stage_rank[name] = stage_rank[name].sort(function (a : StageRankValue, b : StageRankValue) {
            if (Math.sign(parser.weight) > 0)
                return a.val - b.val;
            else
                return b.val - a.val;
        });   
    }

    // now updating STAGE_SCORE and STAGE_RANK in current startup
    // To update the data dynamically, we recalculate the stage_score and stage_rank each time
    if (any_field_was_updated) {
        startup.updateStageScore(calcStageScore(startup, stage_score));
        startup.updateStageRank(calcStageRank(startup, stage_rank));
    }
    
    // calculate "modified" field
    startup['modified'] = calculateModifiedDate(startup, remote_config);
}