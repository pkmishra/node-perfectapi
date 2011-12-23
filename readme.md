Goal
===============

The goal of this package is to allow a developer to easily enable PerfectAPI configuration support for their own package.  The benefits of doing this are that you obtain the following with little or no additional work:
 * expose JSON+REST-based interface to your package's API
 * expose Command-line-interface (CLI) to your package's API
 * automated documentation of your API (FUTURE)
 * gain the benefit of PerfectAPI bindings (FUTURE), which allow your code to be called from any of the many programming languages that have PerfectAPI binding support.

Still a WIP
---------
This package is still in early alpha.  Don't even consider using it yet.


Install
-------

The usual for Node.js stuff

    $ npm install perfectapi

Command-line Usage
-----
First, create a configuration file.  See next section for how to do that in detail.   Once you have a configuration file, a sample usage for command-line is:

```
#!/usr/bin/env node

var perfectapi = require('perfectapi'); 
var path = require('path');
var configFilePath =  path.resolve(__dirname, 'perfectapi.json');

perfectapi.commandline(configFilePath, function(commandName, config) {
	switch (commandName) {
		case 'command1': 
			doSomething(config);
			break;
		case 'command2':
			doSomethingElse(config);
			break;
	}
});
```

Server Usage
----
First, create a configuration file.  See next section for how to do that in detail.   Once you have a configuration file, a sample usage for server (using express) is:

```
var perfectapi = require('perfectapi');
var path = require('path');
var configFilePath =  path.resolve(__dirname, 'perfectapi.json');

var perfectapi = require('./../perfectapi/api.js');
var express = require('express');

var app = express.createServer();

app.configure(function(){
	app.use(express.bodyParser());
	app.use(perfectapi.restify(path.resolve(__dirname + '/perfectapi.json')));
});

app.post('/gen', function(req, res) {
	var config = req.perfectapi.config;
	
	res.end('We can do something here...we have the config etc.');
});

app.post('/scripts', function(req, res) {
	var config = req.perfectapi.config;
	
	res.end('We can do something here...');
});

app.listen(3000);
```

Configuration File
-----------

The PerfectAPI configuration file is a JSON-formatted file that usually lives in your package root folder.  It can be called anything, but we recommend `perfectapi.json`.  An example file is:

```
{"signature": [
	{ 
		"name": "gen",
		"synopsis": "Generates a new Amazon EC2 image using the supplied scripts",
		"description": "Using a baseAMI and a set of scripts, builds up (or finds existing) AMI image that matches the criteria",
		"path": "/apis/gen",
		"verb": "POST",
		"environment": 
			[{"parameter": "AWS_ACCESS_KEY_ID", "long":"awskeyid", "short":"k", "required":"true"},
			 {"parameter": "AWS_SECRET_ACCESS_KEY", "long":"awssecretkey", "short":"s", "required":"true"}],
		"parameter": {"name": "scripts", "required":"true", "type":"multi"},
		"options": 
			[{"option": "root", "long":"root", "short":"r", "required":"false", "default":"scripts", "description":"specify the root folder where scripts can be found"},
			 {"option": "ami", "default":"ami-bf62a9d6", "long":"ami", "short":"a", "description":"the AMI name that will form the basis of the new images"},
			 {"flag": "publish", "long":"publish", "short":"p", "default":"false", "description":"if set, the resulting AMI(s) will be made public"}]
	},
	{
		"name": "scripts",
		"synopsis": "Lists available scripts for use in gen",
		"description": "Finds the available scripts, which are stored in subfolders of the root (see root option)",
		"path": "/apis/scripts",
		"verb": "GET",
		"environment": 
			[{"parameter": "AWS_ACCESS_KEY_ID", "required":"true"},
			 {"parameter": "AWS_SECRET_ACCESS_KEY", "required":"true"}],
		"options": 
			[{"option": "root", "required":"false", "long":"root", "default":"scripts", "short":"r"}]
	}]
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


