var awfyCtrl = angular.module('awfyControllers', []);

var isFF = function(name) {
  if(name.indexOf("Ion") != -1) {
    return true;
  } else if(name.indexOf("Beta") != -1) {
    return true;
  } else if(name.indexOf("Shell") != -1) {
    return true;
  } else if(name.indexOf("no asmjs") != -1) {
    return true;
  }
  return false;
}

awfyCtrl.controller('overviewCtrl', ['$scope', '$http', '$routeParams', '$q',
  function ($scope, $http, $routeParams, $q) {

    var dataRequests = [];

    // Get master data
    dataRequests.push($http.get('../data.php?file=master.js'));
    
    // Get machine data
    var machines = $routeParams.machine.split(",");
    for(var i=0; i!=machines.length; i++) {
      if(!$routeParams.suite) {
        dataRequests.push($http.get('data.php?machine='+machines[i]));
      } else {
        dataRequests.push($http.get('data-suite.php?machine='+machines[i]+'&suiteVersion='+$routeParams.suite));
      }
    }
    
    $q.all(dataRequests).then(function(data) {

      // Extract master data into JSON data.
      var offset = data[0].data.indexOf("{");
      var endOffset = data[0].data.lastIndexOf("}");
      master = data[0].data.substring(offset, endOffset+1);
      master = JSON.parse(master);

      // Extract machine data
      var machines = [];
      for(var i=1; i!=data.length; i++) {
        var offset = data[i].data.indexOf("{");
        var endOffset = data[i].data.lastIndexOf("}");
        machine = data[i].data.substring(offset, endOffset+1);
        machine = JSON.parse(machine); 
        machines.push(machine);
      }

      // Show date
      $scope.$parent.date = machines[0].stamp*1000;

      if($routeParams.suite) {
        $scope.name = master["suiteversions"][$routeParams.suite]["name"];
        $scope.code = master["suiteversions"][$routeParams.suite]["suite"];
      }

      $scope.numMachines = data.length-1;

      // Get all testsuites ids
      var testsuites = {};
      for(var i in machines) {
        for(var j in machines[i]["data"]) {
          var suite = machines[i]["data"][j];

          if(!$routeParams.suite && suite["suiteversionid"] == -1)
            continue;
          if(suite["scores"].length == 0)
            continue;

          var name;
          if(!$routeParams.suite) {
            testsuites[suite["suiteversionid"]] = {};
          } else {
            testsuites[suite["suitetest"]] = {};
          }
        }
      }

      /*// Get all software ids 
      var softwares = {};
      for(var i in machines) {
        for(var j in machines[i]["data"]) {
          var suite = machines[i]["data"][j];

          if(!$routeParams.suite && suite["suiteversionid"] == -1)
            continue;
          if(suite["scores"].length == 0)
            continue;

          for(var k in suite["scores"]) {
            softwares[ suite["scores"][k]["modeid"] ] = {
              name: master["modes"][ suite["scores"][k]["modeid"] ]["name"],
            };
          }
        }
      }*/
      //$scope.softwares = softwares;
      
      // Create 
      for(i in testsuites) {
        var name, suite;
        if(!$routeParams.suite) {
          name = master["suiteversions"][i]["name"];
          suite = master["suiteversions"][i]["suite"];
        } else {
          name = i;
          suite = master["suiteversions"][$routeParams.suite]["suite"];
        }

        var testsuite = {
          id: i,
          name: name,
          suite: suite,
          order: master["suites"][suite]["direction"],
          machines: [],
          maxScore: 0,
        };

        for(var j in machines) {

          // Look up the key for the scores
          var key = -1;
          for(var k in machines[j]["data"]) {
            if(!$routeParams.suite) {
              if(machines[j]["data"][k]["suiteversionid"] == i) {
                key = k;
              }
            } else {
              if(machines[j]["data"][k]["suitetest"] == i) {
                key = k;
              }
            }
          }

          // Add the machine and the test scores
          if(key != -1) { 
            var machine = {
              name: master["machines"][machines[j]["machine"]]["description"],
              tests: [],
            };

            for(var k in machines[j]["data"][key]["scores"]) {
              var test = machines[j]["data"][key]["scores"][k];
              var scoreLabel = Math.round(test["score"]*100)/100;

              if(testsuite.order == -1) {
                scoreLabel += "ms";
              }

              var stamp = false;
              if(test["stamp"]*1000 != $scope.$parent.date) {
                stamp = test["stamp"]*1000;
              }

              machine.tests.push({
                name: master["modes"][test["modeid"]]["name"],
                score: Math.round(test["score"]*100)/100,
                scoreLabel: scoreLabel,
                ff: isFF(master["modes"][test["modeid"]]["name"]) ? "ff" : "",
                stamp: stamp,
              });

              testsuite.maxScore = Math.max(testsuite.maxScore, test["score"]*1);
            }

            testsuite.machines.push(machine);
          }          
        }

        $scope.testsuites.push(testsuite);
      }


      return;
    });

    $scope.machineId = $routeParams.machine;
    $scope.testsuites = [];
    $scope.hasSuite = !!$routeParams.suite;
  }
]);


awfyCtrl.controller('ffIconCtrl', function ($scope) {
  var times = 0;
  $("body").on("keypress", function(e) {
    if(e.key == "f") {
      times++;

      setTimeout(function() {
        times--;
      }, 1000);
    }

    if(times == 2) {
      $("body").addClass("ff");
    }
  });
});