console.log("Its alive");

var twit = require('twit');

var fs = require('fs');

var keys = require('./permissions.js');

var request = require('ajax-request');

var http = require("https");

/*Initialize twit with keys from permission file*/
var T = new twit(keys);

var myVar = setInterval(getRandomWords, 600000);

var words="";

function getRandomWords () {
    //var url = baseUrl +"/randomWords?hasDictionaryDef=false&minCorpusCount=0&maxCorpusCount=-1&minDictionaryCount=1&maxDictionaryCount=-1&minLength=5&maxLength=-1&limit=10&api_key=" + apiKey;
    var url = "http://api.wordnik.com:80/v4/words.json/randomWords?hasDictionaryDef=false&includePartOfSpeech=verb&excludePartOfSpeech=suffix&minCorpusCount=0&maxCorpusCount=-1&minDictionaryCount=1&maxDictionaryCount=-1&minLength=5&maxLength=10&limit=3&api_key=97679a89880108cbf70080f9a0e0e1c6de09f768e47e714d6";
    request(url,function(err,res,body){
        var jsonBody = JSON.parse(body);
        var i=0;
        for (i = 0; i < jsonBody.length; i++) {
            if(i==0){
                words = words +jsonBody[i].word;
            }else{
                words = words +"."+jsonBody[i].word;
            }
        }
        getLocation();
    });
}

function getLocation(){
    console.log("Words is: "+words);

    var options = {
      "method": "GET",
      "hostname": "api.what3words.com",
      "port": null,
      "path": "/v2/forward?addr="+words+"&key=Y2L0W4OA&lang=en&format=json&display=full",
      "headers": {}
    };

    var req = http.request(options, function (res) {
      var chunks = [];

      res.on("data", function (chunk) {
        chunks.push(chunk);
      });

      res.on("end", function () {
        var body = Buffer.concat(chunks);
        var bodyJSON = JSON.parse(body.toString());
        if(bodyJSON.status.code!=undefined){
            console.log("Status code for three words call is: "+bodyJSON.status.code);
            words = "";
            getRandomWords();
        }else{
            console.log("Found a correct three word pair!");
            fs.writeFile("WhatThreeWords.json",bodyJSON.geometry);
            createMap(bodyJSON.geometry.lat,bodyJSON.geometry.lng);
        }
      });
    });

    req.end();
}

function createMap(lat,lng){
    console.log("Created Map at Latitude: "+lat+" and Longitude "+lng+"!");
    //https://maps.googleapis.com/maps/api/staticmap?zoom=13&size=600x300&maptype=roadmap&markers=color:red%7Clabel:C%7C"+lat+","+lng+"&key=AIzaSyB0gV97dxz-OeuoVeuTSx0fyv6nN9yzjEs
    var options = {
      "method": "GET",
      "hostname": "maps.googleapis.com",
      "port": null,
      "path": "/maps/api/staticmap?zoom=3&size=600x300&maptype=roadmap&markers=color:red%7Clabel:C%7C"+lat+","+lng+"&key=AIzaSyB0gV97dxz-OeuoVeuTSx0fyv6nN9yzjEs",
      "headers": {}
    };

    var req = http.request(options, function (res) {
      var chunks = [];

      res.on("data", function (chunk) {
        chunks.push(chunk);
      });

      res.on("end", function () {
        var body = Buffer.concat(chunks);
        fs.writeFile("mapImage.png",body,function (err) {
            if(err){
                console.log("Error when writing file: "+err);
            }
            fs.exists("mapImage.png",function(exists){
                if(exists){
                    tweetIt();
                }
            })
        });
      });
    });

    req.end();

}
function tweetIt(){
    console.log("Starting to tweet it!");
    //
    // post a tweet with media
    //
    var b64content = fs.readFileSync('./mapImage.png', { encoding: 'base64' })
    console.log("Found image");
    // first we must post the media to Twitter
    T.post('media/upload', { media_data: b64content }, function (err, data, response) {
      // now we can assign alt text to the media, for use by screen readers and
      // other text-based presentations and interpreters
      console.log("Error for the media upload is "+err);
      console.log("The media id string data for uploading the media: "+data.media_id_string);
      var mediaIdStr = data.media_id_string;
      var params = { status: words, media_ids: [mediaIdStr] };

      T.post('statuses/update', params, function (err, data, response) {
        console.log(data);
        fs.unlink("mapImage.png");
      })
    });
}
