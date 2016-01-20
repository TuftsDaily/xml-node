$(document).ready(function() {

	// Cache Elements
	var $articlesRequestCard = $('#articles-request'),
		$articlesListCard = $('#articles-list'),
		$articlesErrorCard = $('#articles-error'),
		$doDownloadButton = $('#do-download-button'),
		$backToDownloadButton = $('input.back-to-download-button'),
		$articlesListTable = $articlesListCard.find('table'),
		$articlesListDownloadResult = $articlesListCard.find('p#download-result'),
		$articleErrorText = $('#error-text'),
		requestData = {};

	// Get Tomorrow's Date, if After 3 AM
	var d = new Date();
	if (d.getHours() > 3) {
		d.setDate(d.getDate() + 1)
	}
	// Then Set Input Accordingly
	$articlesRequestCard.find('#print-date').val(d.toISOString().substring(0, 10));

	// Show Request Card on Load
	$articlesRequestCard.show(250);

	$doDownloadButton.click(function() {

		requestData = {
			'section': $articlesRequestCard.find('#section-name').val(),
			'sectionLabel': $articlesRequestCard.find('#section-name option:selected').text(),
			'date': $articlesRequestCard.find('#print-date').val()
		};

		$.ajax({
			url: '/download',
			method: 'POST',
			data: requestData,
			success: parseArticleData,
			error: function(e) {
				showDownloadError('No Response from Server Back-End');
			}
		})

	});

	$backToDownloadButton.click(function() {

		console.log('click');

		$articlesRequestCard.show(250);
		$articlesListCard.hide(250);
		$articlesErrorCard.hide(250);

	})

	var parseArticleData = function(data) {

		// Check for Valid Response
		if (data.section == undefined) {
			showDownloadError('XML Result Missing "section" Element');
			return;
		}

		// Make Each Type an Empty Iterable Array if Non-Existant
		articles = data.section.article || [];
		column = data.section.column || [];

		// Returns a Function that Maps Through a Row
		// Good ol' 105-Style Function Composition
		var articleMapFunctionCompose = function(articleType) {
			var articleMapFunction = function(article) {
				var title = article.headline || article.columnhead || article.opinionhead || "<em>Missing Headline</em>";
				var photo = article.photo || [];

				var tr = $("<tr></tr>");
				tr.append("<td>"+title+"</td>");
				tr.append("<td>"+articleType+"</td>");
				tr.append("<td>"+photo.length+"</td>");
				tr.appendTo($articlesListTable);

			}
			return articleMapFunction;
		}

		 // Get Rid of Everything but Table Header
		$articlesListTable.find('tbody').html('');

		articles.map(articleMapFunctionCompose("Article"));
		column.map(articleMapFunctionCompose("Column"));

		// Change Labels
		$articlesListDownloadResult.html('Showing Articles in <strong>'+requestData.sectionLabel+'</strong> for <strong>'+requestData.date+'</strong>:');

		// Change Visibility of Cards
		$articlesRequestCard.hide(250);
		$articlesListCard.show(250);
		$articlesErrorCard.hide(250);

	}

	var showDownloadError = function(msg) {

		$articleErrorText.html(msg);

		// Change Visibility of Cards
		$articlesRequestCard.hide(250);
		$articlesListCard.hide(250);
		$articlesErrorCard.show(250);
		
	}

	

});