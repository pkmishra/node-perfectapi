/* Author: Steven Campbell

*/

var perfectapi = {};
perfectapi.host = 'http://localhost';
perfectapi.endpoint = perfectapi.host + '/rootapipath/';
var _papi = perfectapi;

$.getScript('/socket.io/socket.io.js', function(data, textStatus){
	//dynamically load socket.io javascript
	console.log('socket.io load was attempted - status = ' + textStatus);
});

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
		data: {"config": JSON.stringify(config)},		
		crossDomain: true,
		contentType: "application/json",
		accepts: "application/json", 
		url: url,				
		success: function(data) {
			console.log('success calling ' + command);
			console.log(data);
			
			if (data && data.slowMode) {
				console.log(command + ' is running in slow mode, opening websocket to ' + perfectapi.host);
				//switch to slowmode, initiate socket.io
				
				var socket = io.connect(perfectapi.host, {'force new connection': true});
				socket.emit('callbackPlease', data.uuid, function(err) {
					if (err) console.log(err);
				});
				console.log('requested callback on WebSocket using uuid ' + data.uuid);
				var gotCallback = false;
				socket.on('response', function(data, fn) {
					//got the callback from websocket!
					fn('confirmed');
					if (gotCallback) return;	//otherwise sometimes it gets called more than once
					
					gotCallback = true;
					console.log('Got slowmode callback from ' + command);
					console.log(data)
					callback(null, data);
					
					//socket.disconnect();
				});
				
			} else {
				//respond now
				callback(null, data);
			}
		},
		error: function(jqXHR, textStatus, errorThrown) {
			//never gets called for jsonp
		}
	});
}

/* 
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



