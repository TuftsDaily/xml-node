var SERVICE_PORT = 3000;

var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var Dropbox = require('dropbox');
var xml2js = require('xml2js');

// Instantiate Parser
var xmlParser = new xml2js.Parser();
var xmlBuilder = new xml2js.Builder();

// Init App, Include Form Data Processor
var app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// Set Up Front-End Path
app.use("/", express.static(__dirname+"/static"));

// Initialize Dropbox API Connection
// TODO Don't Put Keys in Github
var client = new Dropbox.Client({
	key: "",
	secret: "",
	token: ""
});

app.post('/download', function(req, res) {

	var category = req.body.section;
	var date = req.body.date;

	var xmlFileName = category+".xml";

	request({
		'method': "GET",
		'url': 'http://www.tuftsdaily.com/xml/category/'+category+'/date/'+date
	}, function (xmlError, xmlResponse, xmlBody) {

		if (!xmlError && xmlResponse.statusCode == 200) {

			xmlParser.parseString(xmlBody, function(parseError, parseResult) {

				if (!parseError) {

					var xmlObj = JSON.parse(JSON.stringify(parseResult));
					
					var photos = getPhotoListing(xmlObj);

					photos.map(function(photoURL) {

						request({
							'method': "GET",
							'url': photoURL,
							'encoding': null
						}, function(photoError, photoResponse, photoBody) {

							var photoFileName = photoURL.substr(photoURL.lastIndexOf('/')+1);

							if (!photoError && photoResponse.statusCode == 200) {

								client.writeFile('CurrentDayTest/'+category+'/'+photoFileName, photoBody, function(photoDbError, photoDbStatus) {
									if (photoDbError) {
										console.log("Dropbox Error on "+photoFileName);
										console.log(photoDbError);
									} else {
										console.log("Success Downloading Photo: "+photoFileName)
									}
								})

							} else {

								console.log("Photo Get Error on "+photoFileName);
								console.log(photoError);

							}

						})

					})

					// Write XML to File, Rebuilt from Object
					client.writeFile('CurrentDayTest/'+category+'/'+xmlFileName, xmlBuilder.buildObject(xmlObj), function(dbError, dbStatus) {
						if (dbError) {
							console.log("Dropbox Error on "+category+".xml");
							console.log(dbError);
						}
					});

					// Photos Downloaded in Background
					console.log("Success Loading XML: "+xmlFileName);
					res.set('Content-Type', 'text/json');
					res.send(JSON.stringify(xmlObj));

				} else {

					console.log("XML Parse Error on "+xmlFileName);
					console.log(parseError);
					res.sendStatus(500);

				}

				
			});

		} else {

			console.log("XML Get Error on "+xmlFileName);
			console.log(xmlError);
			res.status(500);

		}

	});

});

var server = app.listen(SERVICE_PORT, function () {
	var host = server.address().address;
	var port = server.address().port;
	console.log('App Listening at http://%s:%s', host, port);
});

var getPhotoListing = function(xmlObj) {

	var photosToDownload = [];

	// If Something Wrong with XML, Don't Return any Photos
	if (!xmlObj.hasOwnProperty('section') || 
		!xmlObj.section.hasOwnProperty('article')) {
		console.log('Malformed XML in getPhotoListing()');
		return [];
	}

	// For Each Article, Create a List of Attached Photos
	xmlObj.section.article.map(function(article) {

		// If Photos Attached, Get them All
		if (article.hasOwnProperty('photo')) {
			article.photo.map(function(photo) {
				photosToDownload.push(photo['$'].href);
			})
		}

	});

	return photosToDownload;

}