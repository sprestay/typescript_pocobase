import * as functions from "firebase-functions";
const admin = require('firebase-admin');
admin.initializeApp();
import StageRanking from './models/stage_ranking';
import StageScore from './models/stage_score';
import StartUp from './models/startup';
import updateStartup from './logic/updateStartup';
import { formatDate } from './logic/utils';
import parseStartUp  from './logic/parseStartUp';
import { RemoteConfigValue } from './types';

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript

const remote_config : RemoteConfigValue = {slow: 30, fast: 7, threshold: 3};


export const createStartup = functions.https.onRequest(async (req, res) => {
  if (req.method != "POST") {
    res.status(403).send('HTTP Method ' + req.method + ' not allowed');
    return;
  }
  var startup : StartUp = new StartUp(req.body);
  const state_db = await admin.firestore().collection('app_state');

  var stage_rank_val = await state_db.doc("stage_ranking").get();
  var stage_rank : StageRanking = new StageRanking(stage_rank_val.data());

  var stage_score_val = await state_db.doc("stage_score").get();
  var stage_score : StageScore = new StageScore(stage_score_val.data());

  await updateStartup(startup, stage_rank, stage_score, remote_config);

  await state_db.doc("stage_ranking").set(stage_rank.getJson());
  await state_db.doc("stage_score").set(stage_score.getJson());
  await admin.firestore().collection('startups').add(startup.getJson());

  res.status(200).send("startup added");
});

export const updateStartUpById = functions.https.onRequest(async (req, res) => {
  var params : Record<string, any> = {};

  if (req.method == "GET") {
    var id : string = req.query['doc_id'] as string;
  } else if (req.method == "POST") {
    var id : string = req.body['doc_id'] as string;
    params = req.body;
    delete params['doc_id'];
  } else {
    res.status(403).send("Unallowed method");
    return;
  }

  if (!id) {
    res.status(403).send("Id is empty");
    return;
  }

  const db = await admin.firestore().collection('startups').doc(id).get();
  const state_db = await admin.firestore().collection('app_state');
  
  var startup : StartUp = new StartUp({...db.data(), ...params});
  var stage_score_v = await state_db.doc("stage_score").get();
  var stage_score : StageScore = new StageScore(stage_score_v.data());
  var stage_rank_v = await state_db.doc("stage_rank").get();
  var stage_rank : StageRanking = new StageRanking(stage_rank_v.data());

  await updateStartup(startup, stage_rank, stage_score, remote_config);

  await state_db.doc("stage_ranking").set(stage_rank.getJson());
  await state_db.doc("stage_score").set(stage_score.getJson());
  await admin.firestore().collection('startups').doc(id).set(startup.getJson());

  res.status(200).send("updated");
});

export const deleteStartupById = functions.https.onRequest(async (req, res) => {
  if (req.method != "POST" || !req.body.doc_id) {
    res.status(403).send("Method is not allowed");
    return;
  }
  const id = req.body['doc_id'];
  try {
      await admin.firestore().collection('startups').doc(id).delete();
      res.status(200).send("done");
  } catch (err) {
      res.status(500).send("Could not delete data with id=" + id + " error = " + err);
  };
});

export const getAllStartups = functions.https.onRequest(async (req, res) => {
  const db = await admin.firestore().collection('startups');
  var snapshot = await db.get();
  if (snapshot.empty) {
      res.status(200).send({result: "OK", items: []});
      return;
  }
  var items : Array<Record<string, any>> = [];
  snapshot.forEach((doc : any) => {
      items.push({...parseStartUp(new StartUp(doc.data())), 'last_modified': formatDate(doc.data()['modified']), 'doc_id': doc.id,})
  });
  res.send({
      result: "OK",
      items: items.sort((a: Record<string, any>, b: Record<string, any>) => b.modified - a.modified),
  });  
});

export const getStartupById = functions.https.onRequest(async (req, res) => {
  if (req.method == "GET" && req.query.doc_id) {
    const id = req.query.doc_id;
    try {
      const db = await admin.firestore().collection('startups').doc(id).get();
      res.status(200).send({
          result: "OK",
          item: {...parseStartUp(new StartUp(db.data()),), 'doc_id': db.id}
      });
    } catch (err) {
      console.log("ERROR FROM INDEX", err);
      res.status(500).send({
          result: 'FAIL',
          reason: err,
      });
    }
  } else {
      res.status(403).send({
          result: "FAIL",
          reason: "WRONG REQUEST",
      });
  }
});

export const newUpdateFunction = functions.pubsub.schedule("*/30 * * * *").onRun(async (context) => {
  const db = await admin.firestore().collection('startups');
  const state_db = await admin.firestore().collection('app_state');

  var time_n_days_ago : number = Date.now() - (remote_config.fast * 24 * 60 * 60 * 1000);
  var snapshot = await db.where('modified', "<", time_n_days_ago).limit(3).get();
  if (snapshot.empty) {
      console.log('No matching documents.');
      return;
  }
  
  var stage_score_v = await state_db.doc("stage_score").get();
  var stage_ranking_v = await state_db.doc("stage_ranking").get();
  var stage_score : StageScore = new StageScore(stage_score_v.data());
  var stage_ranking : StageRanking = new StageRanking(stage_ranking_v.data());

  for (let doc of snapshot.docs) {
    let startup : StartUp = new StartUp(doc.data());
    functions.logger.log("Start updating", startup['title']);
    await updateStartup(startup, stage_ranking, stage_score, remote_config);

    await state_db.doc("stage_ranking").set(stage_ranking.getJson());
    await state_db.doc("stage_score").set(stage_score.getJson());
    await admin.firestore().collection('startups').doc(doc.id).set(startup.getJson());
  }
  
  return "ok";
});



// 
// Вспомогательные функции
//
export const copyData = functions.https.onRequest(async (req, res) => {
  var type = req.body['type'];
  var data = req.body['data'];
  var id = '';
  if (type === "startup") {
    id = req.body['id'];
    await admin.firestore().collection('startups').doc(id).set(data);
  } else if (type === "stage_ranking") {
    await admin.firestore().collection('app_state').doc("stage_ranking").set(data);
  } else if (type === "stage_score") {
    await admin.firestore().collection('app_state').doc("stage_score").set(data);
  }
  res.send("OK");
  return;
});