var logger = require('winston').loggers.get('perfectapi');
var url = require('url');
var idgen = require('uuid-js');
var cache = require('./memcache.js'); //cache is used to communicate between functions in this module
var slowThreshold = 5000			//after how long do we call it slow and falback to socket.oi
var slowTimeout = 1000*60*60*24;	 //max amount of time we will respond to slow calls
var slowRetryInterval = 200;			//trying to send a slow result but websocket not ready, wait x milliseconds and retry
var slowRetriesMax = 5000 / slowRetryInterval;		//don't retry after 5 seconds of retries

exports.respond = function(commandCallback, commandName, config, req, res) {
	//a little complex here...callbacks within callbacks...oh well.  At this point, we are still in our code.
	//the callback here will cause an event to be emitted, and inside the caller's event handler code, they must
	//callback our own callback in order to send results to the browser
	
	var gotCallback = false;
	var slowMode = false;
	var uuid = idgen.create().toString();
	
	commandCallback(null, commandName, config, retry=function(err, result) {
		gotCallback = true;
		
		if (err) {
			//just pass back the err as part of the result
			result = result || {};
			result.err = err;
		} 
		
		if (slowMode) {
			//original http request is gone.  Respond using websockets.
			var slowResult = cache.get(uuid)		
			if (!slowResult) {
				//should only happen after slowTimeout exceeded or server restarted
				logger.warn('Could not respond to slow request - nothing found in the cache.');
			} else if (!(slowResult.socket)) {
				//this can be because of timing.  The client might still be establishing the websocket.	 Too many of these means
				//that slowThreshold is too low.
				slowResult.retries = slowResult.retries || 0;
				slowResult.retries += 1;
				cache.set(uuid, slowResult, slowTimeout);
				
				if (slowResult.retries > slowRetriesMax) {
					logger.error('Could not respond to slow request - socket not found in the cache.  max retries exceeded.');
				} else {
					logger.info('Could not respond to slow request - socket not found in the cache.  retrying...');
					setTimeout(function() {
						commandCallback(null, commandName, config, retry);
					}, slowRetryInterval);
				}
			} else {
				//success!  send result back on the websocket
				slowResult.socket.emit('response', result);
			}
		} else {
			//still in original request-response cycle
			sendResult(req, res, result);
		}
		
	});
	
	//force early response to client
	setTimeout(function() {
		if (gotCallback) return;   //no need to do anything, its done
		
		slowMode = true;		//switching to slow mode
		gotCallback = true;
		
		var result = {};
		result.slowMode = true;
		result.uuid = uuid;
		cache.set(uuid, result, slowTimeout)  

		sendResult(req, res, result);			//this instructs perfectapi.js client to initiate a websocket and wait for the response
	}, slowThreshold);
}

exports.callbackPlease = function(socket, uuid) {
	var slowResult = cache.get(uuid);
	if (!slowResult) {
		//failed to find this in the cache.  screwed.
		logger.warn('Could not register slow callback - nothing found in the cache');
	} else {
		slowResult.socket = socket;
		cache.set(uuid, slowResult, slowTimeout);
	}	

}

function sendResult(req, res, result) {
	res.contentType('application/json');
	
	if (url.parse(req.url, true).query.callback)
		res.end(req.query.callback + '(' + JSON.stringify(result) + ');')
	else
		res.end(JSON.stringify(result));
}






