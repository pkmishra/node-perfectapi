Goal
===============

The goal of this package is to allow a developer to easily enable PerfectAPI configuration support for their own API.  The benefits of doing this are that you obtain the following with little or no additional work:

 - expose JSON+REST-based interface to your API
 - expose Command-line-interface (CLI) to your API
 - automated documentation of your API (FUTURE)
 - gain the benefit of PerfectAPI bindings (FUTURE), which allow your code to be called from any of the many programming languages that have PerfectAPI binding support.

Reasons not to use PerfectAPI
-----------------------------

 - If your API is primarily a simple data access layer, then you may be better off using another library that specializes in data access.  
 - You want control over what your API looks like. (PerfectAPI sacrifices some of your design freedom in order to promote a consistent API model).
 - You want a human-friendly REST interface.  The PerfectAPI REST interface is not friendly to humans.  We balance that loss by providing both command-line and native programmatic access to your API from many popular programming languages.

Still a WIP
---------
This package is still in early alpha.  Don't even consider using it yet. 

Install
-------

The usual for Node.js stuff

    $ npm install perfectapi

or for a global install:

    $ sudo npm install -g perfectapi

Usage from another Node app
---------------------------

Other node apps can use your library `myNodeLib` like below.  This is exactly the same as you might access any other API, expect that the function signature is always the same `(config, callback)` and the callback is also always the same `function(err, result)`.  `result` is an object with the structure defined in the configuration.

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

Usage from Command-line
-----------------------
First, create a configuration file.  See next section for how to do that in detail.   Once you have a configuration file, a sample usage is:

```
#!/usr/bin/env node

var perfectapi = require('perfectapi');  
var path = require('path');

var configPath = path.resolve(__dirname, 'perfectapi.json');
var parser = new perfectapi.Parser();

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

//expose the api to other Node apps
var api = parser.parse(configPath);
exports.api = api;
for( var myFunc in api ) {
	exports[myFunc] = api[myFunc];
}
```


Configuration File
-----------

The PerfectAPI configuration file is a JSON-formatted file that usually lives in your package root folder.  It can be called anything, but we recommend `perfectapi.json`.  An example file is:

```
{	
	"signature": [
		{ 
			"name": "gen",
			"synopsis": "Generates a new Amazon EC2 image using the supplied scripts",
			"description": "Using a baseAMI and a set of scripts, builds up (or finds existing) AMI image that matches the criteria",
			"verb": "POST",
			"parameter": {"name": "scripts", "required":"true", "type":"multi"},
			"options": 
				[{"option": "root", "long":"root", "short":"r", "required":"false", "default":"scripts", "description":"specify the root folder where scripts can be found"},
				 {"option": "ami", "default":"ami-bf62a9d6", "long":"ami", "short":"a", "description":"the AMI name that will form the basis of the new images"},
				 {"flag": "publish", "long":"publish", "short":"p", "default":"false", "description":"if set, the resulting AMI(s) will be made public"}],
			"returns": 
				[{"name":"ami", "description":"Amazon AMI Image Id, e.g. ami-bf62a9d6"} ]
		},
		{
			"name": "scripts",
			"synopsis": "Lists available scripts for use in gen",
			"description": "Finds the available scripts, which are stored in subfolders of the root (see root option)",
			"verb": "GET",
			"options": 
				[{"option": "root", "required":"false", "long":"root", "default":"scripts", "short":"r"}],
			"returns": 
				[{"name":"scripts", "type":"list", "description":"List of scripts relative to the root path"} ]
		}
	], 
	"path": "apis",
	"environment": [
		{"parameter": "AWS_ACCESS_KEY_ID", "long":"awskeyid", "short":"k", "required":"true"},
		{"parameter": "AWS_SECRET_ACCESS_KEY", "long":"awssecretkey", "short":"s", "required":"true"}
	]
}
```

The above file represents an API with 2 commands, namely `gen` and `scripts`.  The easiest way to understand this is to view the help from a command-line app that uses this configuration:

```
$ myapp --help

  Usage: myapp [options] [command]

  Commands:

    gen [options] <scripts>
    Generates a new Amazon EC2 image using the supplied scripts

    scripts [options]
    Lists available scripts for use in gen

  Options:

    -h, --help  output usage information
```
...and focusing on just one of the commands:

```
$ myapp gen --help

  Usage: gen [options] <scripts>

  Options:

    -h, --help         output usage information
    -r, --root <root>  specify the root folder where scripts can be found
    -a, --ami [ami]    the AMI name that will form the basis of the new images
    -p, --publish      if set, the resulting AMI(s) will be made public
```


