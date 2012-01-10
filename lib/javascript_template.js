/* Author: Steven Campbell

*/

var perfectapi = {};

perfectapi.callApi = function (command, config, callback) {
	if (config && typeof(config) === 'function') {
		callback = config;
		config = {};
	}
	if (!callback) callback = function() {};

	var host = 'http://localhost'
	var url = host + '/rootapipath/' + command;
	
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
				console.log(command + ' is running in slow mode');
				//switch to slowmode, initiate socket.io
				var socket = io.connect(host);
				socket.emit('callbackPlease', data.uuid);
				socket.on('response', function(data) {
					//got the callback from websocket!
					console.log('Got slowmode callback from ' + command);
					callback(null, data);
					
					socket.disconnect();
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



