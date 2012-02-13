var async = require('async');

exports.registerInstance = function(db, config, callback) {
  //add to the set of instances for that app
  db.incr("nextid", function(err, res) {
    if (err) return callback(err);
    var id = res;
    
    var instance = {
      id: id,
      name: config.name,
      path: config.options.path,
      giturl: config.options.giturl,
      hostmax: config.options.hostmax || 'cpus',
      max: config.options.max
    };
    
    async.parallel([
      function(cb) {db.sadd("instances.ids", id, cb); },
      function(cb) {db.sadd("instances.ids.by.name." + config.name, id, cb); },
      function(cb) {db.hset("instances", id, JSON.stringify(instance), cb); }
    ], function(err, results) {
      callback(err, '');
    })

  })
}

exports.unregisterInstance = function(db, config, callback) {
  db.smembers("instances.ids.by.name." + config.name, function(err, res) {
    var foundMatch = false;
    
    async.forEach(res, function(id, cb) {
      db.hget("instances", id, function(err, res) {
        var instance = JSON.parse(res);
        
        if (!foundMatch 
        && instance.path == config.options.path 
        && (config.options.host == '' || config.options.host == instance.path)
        && (config.options.port == '' || config.options.port == instance.port)) {
          //we have a match
          db.srem("instances.ids", id);
          db.srem("instances.ids.by.name." + config.name, id);
          db.hdel("instances", id);
          
          //console.log('Found matching instance - removed id ' + id + ' for service ' + config.name);
          
          foundMatch = true;
        }
        
        cb();
      })      
    }, function(err) {
      callback(null, '');
    })
  })
}


exports.getServiceInfo = function(db, config, callback) {
  db.smembers("instances.ids", function(err, res) {
    async.map(res, function(id, cb) {
      db.hget("instances", id, function(err, instance) {
        cb(null, JSON.parse(instance));
      });
      
    }, function(err, instances) {
      if (err) return callback(err);
      
      async.filter(instances, function(instance, cb) {
        cb(instance && instance.name == config.name);
      }, function(filteredInstances) {
      
        if (filteredInstances.length > 0) {
          var path = filteredInstances[0].path;
          db.hvals("environment.variables." + path, function(err, variables) {
            if (err) return callback(err);
            
            var environment = variables.map(function(json) {
              return JSON.parse(json);
            })
            filteredInstances.forEach(function(instance) {
              instance.environment = environment;
            })
            
            callback(err, filteredInstances);
          })      
        } else {
          callback(err, filteredInstances);
        }
        
      })
      


    })
      
  });
  
}

exports.listServices = function(db, config, callback) {
  db.smembers("instances.ids", function(err, res) {
    async.map(res, function(id, cb) {
      db.hget("instances", id, function(err, instance) {
        cb(null, JSON.parse(instance));
      });
      
    }, function(err, instances) {
      
      async.reduce(instances, {}, function(memo, instance, cb) {
        memo[instance.name] = '';
        cb(null, memo);
      }, function(err, memo) {
        //http://stackoverflow.com/questions/8376938/deduplicating-using-nodejs
        callback(err, Object.keys(memo));
      })
      
    })
  });
}

exports.listUnclaimedInstances = function(db, config, callback) {

  db.smembers("instances.ids", function(err, res) {
    async.map(res, function(id, cb) {
      db.hget("instances", id, function(err, instance) {
        cb(null, JSON.parse(instance));
      });
      
    }, function(err, instances) {
      
      async.filter(instances, function(instance, cb) {
        cb((instance.host || '') == '');
      }, function(filteredInstances) {
        callback(err, filteredInstances);
      })
      
    })
  });

}

exports.claimInstance = function(db, config, callback) {

  db.smembers("instances.ids", function(err, res) {
    async.map(res, function(id, cb) {
      db.hget("instances", id, function(err, instance) {
        cb(null, JSON.parse(instance));
      });
      
    }, function(err, instances) {
      
      async.filter(instances, function(instance, cb) {
        cb((instance.host || '') == '' && instance.name == config.name);
      }, function(filteredInstances) {
      
        if (filteredInstances.length == 0) return callback('Could not find unclaimed instance')
        var instance = filteredInstances[0];
        
        instance.host = config.options.host;
        instance.port = config.options.port;
        
        db.hset("instances", instance.id, JSON.stringify(instance));
        
        callback(null, instance.id)
      })
    })
  });
}

exports.addEnvironment = function(db, config, callback) {
  var pair = config.variable.split('=');
  if (pair.length != 2) {
    return callback('variable must be in format X=Y, with no spaces');
  }
  var variable = {
    name: pair[0],
    value: pair[1]
  };
  
  db.hset("environment.variables." + config.options.path, variable.name, JSON.stringify(variable), function(err, res) {
    if (err) return callback(err);
    
    //return all variables as result
    db.hvals("environment.variables." + config.options.path, function(err, variables) {
      if (err) return callback(err);
      
      var result = variables.map(function(json) {
        return JSON.parse(json);
      })
      
      callback(null, result);
    })
  })
}

exports.removeEnvironment = function(db, config, callback) {

  db.hdel("environment.variables." + config.options.path, config.name, function(err, res) {
    if (err) return callback(err);
    
    //return remaining variables as result
    db.hvals("environment.variables." + config.options.path, function(err, variables) {
      if (err) return callback(err);
      
      var result = variables.map(function(json) {
        return JSON.parse(json);
      })
      
      callback(null, result);
    })
  })
}



