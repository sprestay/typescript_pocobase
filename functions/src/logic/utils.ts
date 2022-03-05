// function mergeHistoricData
// function checkAmountOfDataSources
// function calculateModifiedDate
import StartUp from '../models/startup';
import StageRanking from '../models/stage_ranking';
import StageScore from '../models/stage_score';
import config from '../config';
import {RecordValue, StageRankValue, ConfigValue, RemoteConfigValue} from '../types'; 

export function getLastValue(vals: number[]) : number | null {
  if (vals.length <= 0 || vals[vals.length - 1] === -1)
    return null;
  else
    return vals[vals.length - 1];
}

export function calcStageScore(startup: StartUp, stage_score: StageScore) : number {
  var scores : number[] = [];
  for (var parser of config) {
    var field_value: RecordValue | null = startup.getFieldByName(parser.output_field);
    if (field_value == null) continue;

    var value : number | null = getLastValue(field_value.data);
    if (value === null) {
      scores.push(1);
    } else {
      var max: number = stage_score['max_' + parser.output_field];
      var min: number = stage_score['min_' + parser.output_field];
      var step: number = (max - min) / 99;
      if (Math.sign(parser.weight) < 0) {
        scores.push(step != 0 ? Math.ceil((max - value) / step) : 100);
      } else {
        scores.push(step != 0 ? Math.ceil((value - min) / step) : 100);
      }
    }
  }
  return scores.length > 0 ? scores.reduce((a : number, b : number) => a + b, 0) / scores.length : 1;
}

export function calcStageRank(startup: StartUp, stage_rank: StageRanking) : number {
  var count : number = 0;
  var total : number = 0;
  var keys: Array<string> = Object.keys(stage_rank);
  for (var key_index = 0; key_index < keys.length; key_index++) {
    var key_name = keys[key_index];
    // by default alexa is always 1. 
    if (key_name === 'alexa_rank' && startup.getFieldByName("alexa_rank") === null) {
      count++; total++;
    } else if (startup.getFieldByName(key_name) !== null) {
      // calculating stage_rank
      var startup_index: number = stage_rank[key_name].findIndex((e: StageRankValue) => e.title === startup['title']);
      var c : ConfigValue | undefined = config.find((e : ConfigValue) => e.output_field === key_name);
      if (startup_index === -1 || c === undefined) {
        continue;
      }
      
      count++;
      if (Math.sign(c.weight) < 0 && stage_rank[key_name][startup_index]['val'] == 0) {
        total++; continue;
      }

      if (startup_index === 0) {
        total++;
      } else {
        let v : number = ((startup_index + 1) / stage_rank[key_name].length) * 100;
        total += v;
      }
    }
  }

  // calculating result
  if (count === 0)
    return 1;
  else 
    return scoreNormalization(total / count);
}


export function scoreNormalization(score: number) : number {
  var min : number = 1;
  var max : number = 5;
  var max_score: number = 100;
  var step : number = (max - min) / max_score;
  var amount_of_steps : number = max_score - score;
  var divisor = 1 + (step * amount_of_steps);
  if (score < 1)
    return 1;
  var res = Math.ceil(score / divisor);
  return res;
}


export function shouldUpdateFunction(remote: RemoteConfigValue, record: RecordValue | null) : boolean {
  if (record === null) return true;

  if ((record.count == undefined) || (record.count < remote.threshold && record.last_modified <= Date.now() - remote.fast * 1000 * 60 * 60 * 24)) {
    return true; // not enough data to update frequently
  }
  if (record.count >= remote.threshold && record.last_modified <= Date.now() - remote.slow * 1000 * 60 * 60 * 24) {
    return true;
  }
  return false;
}


export function calculateModifiedDate(startup: StartUp, remote: RemoteConfigValue) : number {
  var funtions_names : Array<string> = config.map((e: ConfigValue) => e.output_field);

  var amount_of_fields_to_slow_updates : number = funtions_names.filter((e : string) => {
    let record : RecordValue | null = startup.getFieldByName(e);
    return record !== null && record.count >= remote.threshold; 
  }).length;

  var min_modified_time_in_slow_startup : number = Math.min(...funtions_names.filter((e : string) => {
    let record : RecordValue | null = startup.getFieldByName(e);
    return record !== null && record.count >= remote.threshold;
  }).map((e : string) => {
    let record : RecordValue | null = startup.getFieldByName(e);
    return record != null ? record.last_modified : Infinity;
  }));

  var min_modified_time_in_fast_startup : number = Math.min(...funtions_names.filter((e : string) => {
    let record : RecordValue | null = startup.getFieldByName(e);
    return record !== null && record.count < remote.threshold;
  }).map((e : string) => {
    let record : RecordValue | null = startup.getFieldByName(e);
    return record !== null ? record.last_modified : Infinity;
  }));

  // если amount_of_fields_to_slow_updates равно нулю - 
  if (amount_of_fields_to_slow_updates === 0) return Math.min(min_modified_time_in_fast_startup, min_modified_time_in_slow_startup);

  // возможно, какую-то запись надо обновить скорее, чем следующий fast апдейт

  var spread: number = Math.floor(remote.slow / amount_of_fields_to_slow_updates);
  var spread_time = 1000 * 60 * 60 * 24 * spread;
  var fast_time = 1000 * 60 * 60 * 24 * remote.fast; // cause fast_time is default update speed
  var diff = fast_time - spread_time;
  min_modified_time_in_slow_startup -= diff;
  return Math.min(min_modified_time_in_slow_startup, min_modified_time_in_fast_startup);
}

export const formatDate = (timestamp : number) => {
  var date = new Date(timestamp);
  var dd_mm_yyyy = date.toLocaleDateString();
  return dd_mm_yyyy.replace(/(\d+)\/(\d+)\/(\d+)/g, "$3-$2-$1");
}

export const mergeHistoricdData = (old : RecordValue, fresh : RecordValue) => {
  // если старых данных нет
  if (old.data.length == 0) return fresh;
  var old_last: number = old['time'][old['time'].length - 1];
  var position_index: number = fresh['time'].findIndex((e) => e > old_last);
  if (position_index === -1) return old;
  return {
    ...old, 
    "time": old['time'].concat(fresh['time'].slice(position_index)),
    "data": old['data'].concat(fresh['data'].slice(position_index))
  };
}