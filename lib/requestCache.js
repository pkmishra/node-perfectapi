var dataCache = require('./memcache.js');
var url = require('url');
var crypto = require("crypto");

/**********************************
* Handles caching for the given command.  When done, calls either hit() or miss()
* depending on whether it was a cache hit or miss.  No further processing is necessary
* if it was a hit.
* 
**/
exports.handle = function(commandName, config, commandSpec, req, res, hit, miss) {
  if (commandSpec.verb.toUpperCase() != 'GET') return miss();
  var key = commandName + JSON.stringify(config);

  var result = dataCache.get(key);
  if (!result) return miss();
  
  res.setHeader('Cache-Control', 'must-revalidate, max-age=' + commandSpec.maxage);
  var etag = getETag(result)
  res.setHeader('ETag', etag)
  
  if (req.headers['if-none-match'] && (req.headers['if-none-match'].indexOf(etag) > -1 || req.headers['if-none-match'] == '*')) {
    //etag matches, send a 304 response
    res.statusCode = 304;
    res.end()
  } else {
    //send normal 200 response, with caching headers and data
    res.contentType('application/json');
    var data = JSON.stringify(result);
    if (url.parse(req.url, true).query.callback)
      data = req.query.callback + '(' + data + ');'

    res.setHeader('Content-Length', Buffer.byteLength(data))
    res.end(data)
  }

  return hit();
}

/************************************
* Caches the given result and adds necessary cache headers.  Embeds all necessary cache rules,
* so it is safe to call even when the result should not be cached.
*
**/
exports.save = function(commandName, config, commandSpec, req, res, err, result) {
  if (err) return doNotCache(res);
  if (commandSpec.verb.toUpperCase() != 'GET') return doNotCache(res);
  if (!commandSpec.maxage) return doNotCache(res);
  
  var key = commandName + JSON.stringify(config);
  
  dataCache.set(key, result, commandSpec.maxage);
  var etag = getETag(result)
  
  res.setHeader('Cache-Control', 'must-revalidate, max-age=' + commandSpec.maxage);
  res.setHeader('ETag', etag)

  return true;
}

function doNotCache(res) {
  if (!res.headerSent)
    res.setHeader('Cache-Control', 'no-cache');

  return false;
}

function getETag(result) {
  var hash = crypto.createHash('md5');  //md5 is cheaper CPU-wise than sha1

  if (typeof(result) == 'object') result = JSON.stringify(result);
  
  hash.update(result, 'utf8');   

  return 'W/"' + formatWordKey(new Buffer(hash.digest())) + '"';
}

function formatWordKey(buf) {
	var key = "";  //buf.toString('hex');
	var letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";  //no I,O,i,l,o because they hard to read
	for(var i=0;i<buf.length;i++) {
	  var letterNumber = buf[i] % letters.length;  
	  key = key + letters[letterNumber];
	};
	
	return key;
}
