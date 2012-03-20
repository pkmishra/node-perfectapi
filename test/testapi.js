#!/usr/bin/env node

var perfectapi = require('../api.js');  
var path = require('path');

var configPath = path.resolve(__dirname, 'testapi.json');
var parser = new perfectapi.Parser();

//handle the commands
parser.on('throw', function(config, callback) {
  callback('This is an error');
})
parser.on('simpleget', function(config, callback) {
  callback(null, 'This is a simple result');
})
parser.on('randomdelay', function(config, callback) {
  var randomdelay=Math.ceil(Math.random()*10);
  setTimeout(function() {
    callback(null, 'This is a simple result');
  }, randomdelay);
})
parser.on('getwithoptions', function(config, callback) {
  //echo back config
  var result = config;
  callback(null, result);
})
parser.on('postwithoptions', function(config, callback) {
  //echo back config
  var result = config;
  callback(null, result);
})
parser.on('defaultoption', function(config, callback) {
  //echo back config
  var result = config;
  callback(null, result);
})
parser.on('multipleParams', function(config, callback) {
  //echo back config
  var result = config;
  callback(null, result);
})
parser.on('multipleParamsPosted', function(config, callback) {
  //echo back config
  var result = config;
  callback(null, result);
})

//expose the api
module.exports = parser.parse(configPath);