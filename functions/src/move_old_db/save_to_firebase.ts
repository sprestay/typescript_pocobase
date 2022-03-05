const fs = require('fs');
const axios = require('axios');

async function saveToFirebase() {
    var stage_ranking = JSON.parse(fs.readFileSync('./stage_ranking.json'));
    var stage_score = JSON.parse(fs.readFileSync('./stage_score.json'));
    var startups_hash = JSON.parse(fs.readFileSync('./startups.json'));
    var url = "https://us-central1-typescript-startup-monitoring.cloudfunctions.net/copyData";
    
    
    await axios.post(url, {
        type: "stage_ranking",
        data: stage_ranking
    });

    await axios.post(url, {
        type: "stage_score",
        data: stage_score
    });

    var promises = Object.keys(startups_hash).map((e: string) => axios.post(url, {
        type: "startup",
        id: e,
        data: startups_hash[e]
    }));

    await Promise.all(promises);
}

saveToFirebase();