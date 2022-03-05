import {ConfigValue} from './types';
import alexaRequest from './parsers/alexaRequest';
import appStoreRatingByUrl from './parsers/appStoreRatingByUrl';
import getInstagramFollowers from './parsers/getInstagramFollowers';
import getTwitterFollowers from './parsers/getTwitterFollowers';
import playMarketRatingByUrl from './parsers/playMarketRatingByUrl';

var config : Array<ConfigValue> = [
   {
      func: getTwitterFollowers,
      field_to_run: "twitter",
      output_field: "twitter_followers",
      type: "live",
      weight: 1 
   },
   {
      func: alexaRequest,
      field_to_run: "url",
      output_field: "alexa_rank",
      type: "live",
      weight: -3 
   },
   {
      func: appStoreRatingByUrl,
      field_to_run: "app_store_url",
      output_field: "app_store_downloads",
      type: "live",
      weight: 2 
   },
   {
      func: getInstagramFollowers,
      field_to_run: "instagram",
      output_field: "instagram_followers",
      type: "live",
      weight: 2 
   },
   {
      func: playMarketRatingByUrl,
      field_to_run: "playmarket_url",
      output_field: "play_market_downloads",
      type: "live",
      weight: 2 
   },
]; 

export default config;