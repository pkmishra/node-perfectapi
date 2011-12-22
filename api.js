
var cli=require("./cligen.js");
//var cfg=require("./config.js");
var rest=require("./restgen.js");

exports.commandline = cli.parse;
exports.rest = rest.parse;
