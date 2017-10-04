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
// An access token from Dropbox's developer website must be specified as an env variable
var dbx = new Dropbox({
	accessToken: process.env.TD_DROPBOX_TOKEN
});

// Handle POST requests to /download path
app.post('/download', function(req, res) {

	// Both of these should be inclued in the POST data
	var category = req.body.section;
	var date = req.body.date;

	var xmlFileName = category+".xml";
	var xmlUrl = 'https://tuftsdaily.com/xml/category/'+category+'/date/'+date;

	request({
		'method': "GET",
		'url': xmlUrl
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

							// Get the filename of the photo
							var photoFileName = photoURL.substr(photoURL.lastIndexOf('/')+1);

							if (!photoError && photoResponse.statusCode == 200) {

								// Copy the photo contents to Dropbox
								var photoPath = '/CurrentDay/' + category + '/' + photoFileName;
								dbx.filesUpload({ path: photoPath, contents:photoBody, mode:'overwrite' })
									.then(function(photoDbxResponse) {
										console.log("Success Downloading Photo: " + photoPath)
										console.log(photoDbxResponse);
									})
									.catch(function(photoDbxError) {
										console.log("Dropbox Error on " + photoUrl);
										console.log(photoDbxError);
									});

							} else {

								console.log("Photo Get Error on "+photoFileName);
								console.log(photoError);

							}

						})

					})

					// Save the original XML file to Dropbox
					var xmlPath = '/CurrentDay/' + category + '/' + xmlFileName;
					dbx.filesUpload({ path: xmlPath, contents: xmlBody, mode:'overwrite' })
						.then(function(xmlDbxResponse) {
							console.log("Success Downloading XML: " + xmlPath);
							console.log(xmlDbxResponse);
						})
						.catch(function(xmlDbxError) {
							console.log("Dropbox Error on " + xmlUrl);
							console.log(xmlDbxError);
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

			console.log("XML Get Error on " + xmlUrl);
			console.log(xmlError);
			res.status(500);

		}

	});

});

var server = app.listen(process.env.PORT || SERVICE_PORT, function () {
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