/* Author: Steven Campbell

*/

var perfectapi = {};

perfectapi.callApi = function (command, config, callback) {
	if (typeof(config) === 'function') {
		callback = config;
		config = {};
	}
	
	var url = 'http://localhost/rootapipath/' + command;
	
	//jsonp
	$.ajax({
		dataType: 'jsonp',
		data: {"config": JSON.stringify(config)},		
		crossDomain: true,
		contentType: "application/json",
		accepts: "application/json", 
		url: url,				
		success: function(data) {
			console.log('success');
			console.log(data);
			
			callback(null, data);
		},
		error: function(jqXHR, textStatus, errorThrown) {
			//never gets called for jsonp
		}
	});
}



