var logger = require('winston').loggers.get('perfectapi');
var url = require('url');
var requestCache = require('./requestCache.js');  

var chunkedTime = 9000			//number of milliseconds to wait before sending the next chunk on long responses.

exports.respond = function(commandCallback, commandName, config, commandSpec, req, res) {
	
	
  //check the cache to see if we have something
  requestCache.handle(commandName, config, commandSpec, req, res, function() {
    //handled by cache, no need to do anything else
  }, function() {
    //not handled by cache.
    var keepingAlive = false;   //true when the command is taking too long (more than chunkedTime msecs)
    var commandCompleted = false;
    
    //a little complex here...callbacks within callbacks...oh well.  At this point, we are still in perfectapi code.
    //the commandCallback here will cause an event to be emitted, and inside the caller's event handler code, they must
    //callback our own callback in order to send results to the browser.
    commandCallback(null, commandName, config, function(err, result) {
      if (commandCompleted) return;
      commandCompleted = true;
      
      if (err) {
        //also pass back the err as part of the result
        result = result || {};
        result.err = err;
      } 
      
      //save in the cache for future
      requestCache.save(commandName, config, commandSpec, req, res, err, result);

      //and send the response
      sendResult(req, res, result);
    });
    
    //while we're waiting for the command to complete, 
    //make sure client does not disconnect
    var chunkedInterval = setInterval(function() {
      if (commandCompleted) return;
      
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
      if (chunkedInterval) {
        //kill the timer.
        clearInterval(chunkedInterval);
      }

      var data = '';
      if (url.parse(req.url, true).query.callback)
        data = req.query.callback + '(' + JSON.stringify(result) + ');'
      else
        data = JSON.stringify(result);      
      
      if (!keepingAlive) {
        //the keepalive will already have sent the headers
        res.contentType('application/json');
        res.setHeader('Content-Length', Buffer.byteLength(data))
      }
      
      res.end(data);
    }  
    
  })
  
}







