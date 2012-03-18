/** Author: Steven Campbell

*/

var perfectapi = {};
perfectapi.host = document.location.protocol + '//localhost';
perfectapi.endpoint = perfectapi.host + '/rootapipath/';
var _papi = perfectapi;

/** 
 * Browser offline detection starts ....
 * See also http://ednortonengineeringsociety.blogspot.com/2010/10/detecting-offline-status-in-html-5.html
*/
$(document).ready(function () {
	$(document.body).bind("online", checkNetworkStatus);
	$(document.body).bind("offline", checkNetworkStatus);
	checkNetworkStatus();
});

function checkNetworkStatus() {
	if (navigator.onLine) {
		
	}
	else {
		
	}
}


/* Offline detection ends */
perfectapi.callApi = function (command, config, callback) {
	if (config && typeof(config) === 'function') {
		callback = config;
		config = {};
	}
	if (!callback) callback = function() {};

	var url = perfectapi.endpoint + command;
		
	//jsonp
	$.ajax({
		dataType: 'jsonp',
		data: config,		
		crossDomain: true,
		contentType: "application/json",
		accepts: "application/json", 
		url: url,				
		success: function(data) {
			console.log('success calling ' + command);
			console.log(data);
			
      callback(null, data);
		},
		error: function(jqXHR, textStatus, errorThrown) {
			//never gets called for jsonp
		}
	});
}

/**
 * Helper method for binding select lists
 * 
 *  selectObject - jQuery select object
 *  dataArray - array of data to bind into the list
 *  dataProperty - name of value property on data element.  Required for object arrays
 *  fnDisplay - optional, function that accepts a data element and returns a string to display for that element
 */
perfectapi.bindSelectList = function(selectObject, dataArray, dataProperty, fnDisplay) {
	if (!fnDisplay) {
		//default display = same as value saved
		fnDisplay = function(dataItem) {
			return dataItem[dataProperty];
		};
	}
	
	for(var i=0;i<dataArray.length;i++) {
		var data = dataArray[i];
		if (typeof(data) !== 'object') {
			//simpler case
			var option = '<option>' + data + '</option>';
			selectObject.append(option);			
		} else {
			//more complex, as data is an opject
			var option = '<option value="' + data[dataProperty] + '">' + fnDisplay(data) + '</option>';
			selectObject.append(option);			
		}
	}
}



