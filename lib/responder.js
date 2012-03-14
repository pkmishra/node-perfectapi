var logger = require('winston').loggers.get('perfectapi');
var url = require('url');
var idgen = require('uuid-js');
var cache = require('./memcache.js'); //cache is used to communicate between functions in this module
var requestCache = require('./requestCache.js');  

var slowThreshold = 5000			//after how long do we call it slow and falback to socket.io
var slowTimeout = 1000*60*60*24;	 //max amount of time we will respond to slow calls
var slowRetryInterval = 200;			//trying to send a slow result but websocket not ready, wait x milliseconds and retry
var slowRetriesMax = 5000 / slowRetryInterval;		//don't retry after 5 seconds of retries
var chunkedTime = 9000			//number of milliseconds to wait before sending the next chunk on long responses.

exports.respond = function(commandCallback, commandName, config, commandSpec, req, res) {
	
	var gotCallback = false;
	var slowMode = false;
	var keepingAlive = false;
	var uuid = idgen.create().toString();
	
  //check the cache to see if we have something
  requestCache.handle(commandName, config, commandSpec, req, res, function() {
    //handled by cache, no need to do anything else
  }, function() {
    //not handled by cache.
    
    //a little complex here...callbacks within callbacks...oh well.  At this point, we are still in perfectapi code.
    //the commandCallback here will cause an event to be emitted, and inside the caller's event handler code, they must
    //callback our own callback (alias="me") in order to send results to the browser.
    commandCallback(null, commandName, config, me=function(err, result) {
      if (gotCallback) return;   //no need to do anything, its done
      gotCallback = true;
      
      if (err) {
        //just pass back the err as part of the result
        result = result || {};
        result.err = err;
      } 
      
      //save in the cache for future
      requestCache.save(commandName, config, commandSpec, req, res, err, result);

      sendResult(req, res, result);
    });
    
    //make sure client does not disconnect
    var chunkedInterval = setInterval(function() {
      if (gotCallback) return;   //no need to do anything, its done

      if (!keepingAlive) {
        //send headers first time only
        res.contentType('application/json');
        res.setHeader('Transfer-Encoding', 'chunked');
      }
      keepingAlive = true

      //send some whitespace to keep the client interested
      logger.verbose('sending keepalive chunk');
      res.write(' ', 'utf8');
    }, chunkedTime);
    
    function sendResult(req, res, result) {
      var data = '';
      if (url.parse(req.url, true).query.callback)
        data = req.query.callback + '(' + JSON.stringify(result) + ');'
      else
        data = JSON.stringify(result);      
      
      if (chunkedInterval) {
        //kill the timer.
        clearInterval(chunkedInterval);
      }
      
      if (!keepingAlive) {
        //the keepalive will already have sent the headers
        res.contentType('application/json');
        res.setHeader('Content-Length', Buffer.byteLength(data))
      }
      
      res.end(data);
    }  
    
  })
  
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








