Package Goal
------------
The goal of this package is to support:

 - Well-designed APIs
 - Interoperability of APIs between different OS and programming languages
 
This Node.js library is the reference implementation.  Others will follow in other languages.   There are the following components in this reference implementation:

 - Native Node.js access to an API
 - Command-line access to an API
 - Self-hosted server exposing the API via JSONP+WebSockets
 - Native proxy access to other PerfectAPIs exposed over JSONP+WebSockets
 - Windows and GNU/Linux installers (run your API as a service on your server)

Reasons to use PerfectAPI
-------------------------
You obtain the following with little or no additional work:

 - expose JSONP+WebSockets interface to your API
 - expose Command-line-interface (CLI) to your API
 - Javascript binding (call your API directly from javascript)
 - gain the benefit of PerfectAPI bindings, which allow your code to be called from any of the many (FUTURE) programming languages that have PerfectAPI binding support.
 - Test page for your users to learn/experiment/test your API 

Reasons not to use PerfectAPI
-----------------------------

 - It's still in Beta.  You may want to wait for it to stabilize a bit.  
 - If your API is primarily a simple data access layer, then you may be better off using another library that specializes in data access.  
 - You want control over what your API looks like. (PerfectAPI sacrifices some of your design freedom in order to promote a consistent API model).

Install
-------
The usual for Node.js stuff

    $ npm install perfectapi

or for a global install:

    $ sudo npm install -g perfectapi

How to include in your API
--------------------------
First, create a `perfectapi.json` configuration file.  See [Configuration File](node-perfectapi/wiki/perfectapi-config-file-format) for details.   Once you have a configuration file, a sample usage is:

```
#!/usr/bin/env node

var perfectapi = require('perfectapi');  
var path = require('path');

var configPath = path.resolve(__dirname, 'perfectapi.json');
var parser = new perfectapi.Parser();

//handle the commands
parser.on("mycommand", function(config, callback) {
	//do mycommand code, putting results into "result" object

	//after done
	callback(err, result);
});
 
parser.on("anothercommand", function(config, callback) {
	//do anothercommand code, putting results into "result" object

	//after done
	callback(err, result);
});

//expose the api
module.exports = parser.parse(configPath);
```

In your `package.json` file, be sure to specify the above file as a "bin", so that the app can be called from the command-line, e.g.

```	
{   "name":             "myNodeLib"
,   "version":          "0.0.1"
    ,"description": "My brilliant API"
    ,"main": "./bin/myNodeLib.js"
	,"bin": "./bin/myNodeLib.js"
,   "engines": {
        "node" : ">=0.6.5"
    }
,   "dependencies":    {   
        "perfectapi": ">=0.0.6"
    }
}
```
Thats it.  

Usage from another Node app
---------------------------
Other node apps can use your library (e.g. `myNodeLib`) like below.  This is exactly the same as you might access any other API, except that the function signature is always the same `(config, callback)` and the callback is also always the same `function(err, result)`.  `result` is a return object with the structure defined in the configuration.

```
var test1=require('myNodeLib');

var config = {}
test1.mycommand(config, function(err, result) {
	if (err) {
		console.log('something went wrong: ' + err);
	} else {
		console.log('output = ' + JSON.stringify(result));
	}
});
```

Usage from Javascript
---------------------
Assuming the service is running at http://myserver.com:3000/apis, code looks like below: 

```
<script src="//ajax.googleapis.com/ajax/libs/jquery/1.6.2/jquery.min.js"></script>
<script src="//myserver.com:3000/socket.io/socket.io.js"></script>
<script src="//myserver.com:3000/apis/jquery.perfectapi.js"></script>

<script>
myNodeLib.callApi('myCommand', config, function(err, result) {
  ...do stuff
});
</script>
```

Usage from command-line
-----------------------

Examples:

```
$ myapp --help

  Usage: myapp [options] [command]

  Commands:

    gen [options] <scripts>
    Generates a new Amazon EC2 image using the supplied scripts

    scripts [options]
    Lists available scripts for use in gen

    server [options]
    Run this API as a REST + JSON server

  Options:

    -h, --help  output usage information
```
The `server` command is added automatically (to self-host your API).

Focusing on just one of the commands:

```
$ myapp gen --help

  Usage: gen [options] <scripts>

  Options:

    -h, --help         output usage information
    -r, --root <root>  specify the root folder where scripts can be found
    -a, --ami [ami]    the AMI name that will form the basis of the new images
    -p, --publish      if set, the resulting AMI(s) will be made public
```

Usage via proxy in Node
-----------------------
This is for accessing other PerfectAPI interfaces from Node.js.   The API you are accessing could be written in any language, but is written using PerfectAPI, and hosted somewhere on the Internet.  The syntax is almost identical to the normal Node usage, with the following differences:

 - references a proxy endpoint (e.g. http://myserver.com:3000/apis) instead of the downloaded Node package
 - user code executes in a callback (because we have to wait for the endpoint to be validated and the proxy created)

```
var perfectapi = require('perfectapi');
perfectapi.proxy('http://myserver.com:3000/apis', function(err, test1) {

	var config = {}
	test1.mycommand(config, function(err, result) {
		if (err) {
			console.log('something went wrong: ' + err);
		} else {
			console.log('output = ' + JSON.stringify(result));
		}
	});
	
});
```
