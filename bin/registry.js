#!/usr/bin/env node

var redis = require("redis");
//var perfectapi = require('perfectapi');  
var perfectapi = require('../../perfectapi/api.js')
var path = require('path');
var main = require('../lib/main.js');

var configPath = path.resolve(__dirname, '..', 'perfectapi.json');
var parser = new perfectapi.Parser();

//handle the commands
parser.on("registerInstance", function(config, callback) {
  var db = getRedisClient(config);
  main.registerInstance(db, config, function(err, result) {
    db.quit();
    callback(err, result);
  });
});

parser.on("unregisterInstance", function(config, callback) {
  var db = getRedisClient(config);
  main.unregisterInstance(db, config, function(err, result) {
    db.quit();
    callback(err, result);
  });
});

parser.on("getServiceInfo", function(config, callback) {
  var db = getRedisClient(config);
  main.getServiceInfo(db, config, function(err, result) {
    db.quit();
    callback(err, result);
  });
});

parser.on("listServices", function(config, callback) {
  var db = getRedisClient(config);
  main.listServices(db, config, function(err, result) {
    db.quit();
    callback(err, result);
  });
});

parser.on("listUnclaimedInstances", function(config, callback) {
  var db = getRedisClient(config);
  main.listUnclaimedInstances(db, config, function(err, result) {
    db.quit();
    callback(err, result);
  });
});

parser.on("claimInstance", function(config, callback) {
  var db = getRedisClient(config);
  main.claimInstance(db, config, function(err, result) {
    db.quit();
    callback(err, result);
  });
});

parser.on("addEnvironment", function(config, callback) {
  var db = getRedisClient(config);
  main.addEnvironment(db, config, function(err, result) {
    db.quit();
    callback(err, result);
  });
});
parser.on("removeEnvironment", function(config, callback) {
  var db = getRedisClient(config);
  main.removeEnvironment(db, config, function(err, result) {
    db.quit();
    callback(err, result);
  });
});

module.exports = parser.parse(configPath);

function getRedisClient(config) {
  var db = redis.createClient(6379, config.environment.REDIS_HOST);
  db.select(config.environment.REDIS_DB_INDEX);
  db.on("error", function (err) {
    console.log(err);
  });
  
  return db;
}