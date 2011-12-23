
var cli=require("./cligen.js");
//var cfg=require("./config.js");
var connect=require("./connect.js");

exports.commandline = cli.parse;
exports.restify = connect.restify;
