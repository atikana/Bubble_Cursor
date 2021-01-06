// Number of targets
var numTargets = 0;
// Min/Max radius of targets
var minRadius = 10,
  maxRadius = 50;
// Min separation between targets
var minSep = 20;
// Canvas size
var w = 1366,
  h = 768;

// enum for the task type
const tasks = {
  TASK1: 'select any',
  TASK2: 'Select specific',
  TASK3: 'Select any in the area',
  TASK4: 'Select specific in the area',
}

const sizes = {
  VARIED: 'varied',
  SMALL: '20 px',
  BIG: '40 px'
}

const distances = {
  FIXED: 'fixed',
  VARIEDSMAll: 'clustered',
  VARIEDBIG: 'wide'
}

// Experiment variables, modify or define your own vars here.
var participant = prompt("Please enter the participant number:", "");
var techinque = prompt("Please enter the technique, from 1 to 3:", "");
// ask users to select indepedent variable 1 
var conditionA = prompt("Please select value for condition A, from 1 to 3:", "");
// ask users to select indepedent variable 2 
var conditionB = prompt("Please select value for condition B, from 1 to 3:", "");
// var conditionC = prompt("Please select value for condition C, from 1 to 2:", "");
var totalBlock = 5;
var currentBlock = 1;
var totalTrials = 16;
var currentTrial = 0;
var trialFileContent = "participant\ttrial\ttechnique\tsize\tdistance\ttask\t\t\t\tclickCount\t\t\ttime\n";
var trialStartTime;
var currentTechnique = setTechnique();
// set indepedent variable 1
var currentConditionA = setConditionA();
// set indepedent variable 2
var currentConditionB = setConditionB();
// 50 is too big 
var areaRadius = 100;
var isStudyRunning = true;
var isRestBeforeBlock = true;
var rand = 0;
// random the tasks 

var task = setTasks();

// record number of clicks
var clickCount = 0;

// Define the bubble cursor interface
var svg = d3.select("div").append("svg:svg").attr("width", w).attr("height", h);
// Make a white background rectangle
svg
  .append("rect")
  .attr("class", "backgroundRect")
  .attr("width", w)
  .attr("height", h)
  .attr("fill", "white")
  .attr("stroke", "black");
//Calculate the distance between two points
function distance(ptA, ptB) {
  var diff = [ptB[0] - ptA[0], ptB[1] - ptA[1]];
  return Math.sqrt(diff[0] * diff[0] + diff[1] * diff[1]);
}



// Initialize position and radius of all targets.
function initTargets(numTargets, minRadius, maxRadius, minSep) {

  // set the size of the circle -> used this for varied

  var radRange = maxRadius - minRadius;
  var minX = maxRadius + 10,
    maxX = w - maxRadius - 10,
    xRange = maxX - minX;
  var minY = maxRadius + 10,
    maxY = h - maxRadius - 10,
    yRange = maxY - minY;


  // Make a vertices array storing position and radius of each
  // target point.
  var targets = [];
  for (var i = 0; i < numTargets; i++) {
    var ptCollision = true;
    while (ptCollision) {

      // modify here base on each case

      switch (currentConditionA)
      {
        case sizes.VARIED:
          var rad = Math.random() * radRange + minRadius;
          break;
        case sizes.SMALL:
          var rad = 25;
          break;
        case sizes.BIG:
          var rad = 40;
          break;
          
      }
      
      switch (currentConditionB)
      {
        case distances.FIXED:
          if (targets.length == 0) {
            var pt = [minX*4, minY*3];
          } else if (targets[i-1][0][0] + areaRadius > xRange - minX*2) {
            var pt = [minX*4,  targets[i-1][0][1] + areaRadius];
          } else {
            var pt = [targets[i-1][0][0] + areaRadius,  targets[i-1][0][1]];
          }
          break;
        case distances.VARIEDBIG:
          var pt = [Math.random() * xRange + minX, Math.random() * yRange + minY];
          break;
        case distances.VARIEDSMAll:
          var pt = [Math.random() * xRange + minX, Math.random() * yRange + minY];
          break;

      }


      // Check for collisions with all targets made earlier.
      ptCollision = false;
      for (var j = 0; j < targets.length && !ptCollision; j++) {
        var ptJ = targets[j][0];
        var radPtJ = targets[j][1];
        var separation = distance(pt, ptJ);
        switch (currentConditionB)
        {
          case distances.FIXED:
            if (separation < rad + radPtJ + minSep) {
              ptCollision = true;
            }
            break;
          case distances.VARIEDBIG:
            if (separation < rad + radPtJ + minSep || separation - rad + radPtJ + minSep < 130) {
              ptCollision = true;
            }
            break;
          case distances.VARIEDSMAll:
            if (separation < rad + radPtJ + minSep || separation - rad + radPtJ + minSep > 900) {
              ptCollision = true;
            }
            break;
        }
      }
      if (!ptCollision) {
        targets.push([pt, rad]);
      }
    }
  }
  return targets;
}

// Update the fillcolor of the targetcircles
function updateTargetsFill(currentCapturedTarget, clickTarget) {
  svg.selectAll(".targetCircles").attr("fill", function (d, i) {
    var clr = "white";
    if (i === currentCapturedTarget) {
      clr = "limegreen";
    }
    for (var j = 0; j < clickTarget.length; j++) {
      if (i === clickTarget[j]) clr = "lightsalmon";
      if (i === clickTarget[j] && i === currentCapturedTarget) clr = "darkred";
    }
    return clr;
  });
}

// The following three getTargetCapturedBy* functions are used to
// calculate and render the cursor technique we will be using for
// the experiement.
function getTargetCapturedByBubbleCursor(mouse, targets) {
  if (!isStudyRunning) {
    svg
      .select(".cursorCircle")
      .attr("cx", mouse[0])
      .attr("cy", mouse[1])
      .attr("r", 0);
    svg.select(".cursorMorphCircle").attr("cx", 0).attr("cy", 0).attr("r", 0);
    return -1;
  }

  // Compute distances from mouse to center, outermost, innermost
  // of each target and find currMinIdx and secondMinIdx;
  var mousePt = [mouse[0], mouse[1]];
  var dists = [],
    containDists = [],
    intersectDists = [];
  var currMinIdx = 0;
  for (var idx = 0; idx < numTargets; idx++) {
    var targetPt = targets[idx][0];
    var currDist = distance(mousePt, targetPt);
    dists.push(currDist);
    targetRadius = targets[idx][1];
    containDists.push(currDist + targetRadius);
    intersectDists.push(currDist - targetRadius);
    if (intersectDists[idx] < intersectDists[currMinIdx]) {
      currMinIdx = idx;
    }
  }

  // Find secondMinIdx
  var secondMinIdx = (currMinIdx + 1) % numTargets;
  for (var idx = 0; idx < numTargets; idx++) {
    if (
      idx != currMinIdx &&
      intersectDists[idx] < intersectDists[secondMinIdx]
    ) {
      secondMinIdx = idx;
    }
  }

  var cursorRadius = Math.min(
    containDists[currMinIdx],
    intersectDists[secondMinIdx]
  );
  svg
    .select(".cursorCircle")
    .attr("cx", mouse[0])
    .attr("cy", mouse[1])
    .attr("r", cursorRadius);
  if (cursorRadius < containDists[currMinIdx]) {
    svg
      .select(".cursorMorphCircle")
      .attr("cx", targets[currMinIdx][0][0])
      .attr("cy", targets[currMinIdx][0][1])
      .attr("r", targets[currMinIdx][1] + 5);
  } else {
    svg.select(".cursorMorphCircle").attr("cx", 0).attr("cy", 0).attr("r", 0);
  }
  return currMinIdx;
}

function getTargetCapturedByPointCursor(mouse, targets) {
  //PointCursor tests if the point cursor is inside a target
  var mousePt = [mouse[0], mouse[1]];
  var capturedIdx = -1;
  for (var idx = 0; idx < numTargets; idx++) {
    var targetPt = targets[idx][0];
    var currDist = distance(mousePt, targetPt);
    targetRadius = targets[idx][1];
    if (currDist <= targetRadius) {
      capturedIdx = idx;
    }
  }
  svg
    .select(".cursorCircle")
    .attr("cx", mouse[0])
    .attr("cy", mouse[1])
    .attr("r", 0);
  svg.select(".cursorMorphCircle").attr("cx", 0).attr("cy", 0).attr("r", 0);
  return capturedIdx;
}

function getTargetCapturedByAreaCursor(mouse, targets) {
  // AreaCursor tests how many targets are captured by the area cursor.
  // If multiple targets are captured test if the center is inside a target.
  var mousePt = [mouse[0], mouse[1]];
  var capturedAreaIdx = -1;
  var capturedPointIdx = -1;
  var numCaptured = 0;
  for (var idx = 0; idx < numTargets; idx++) {
    var targetPt = targets[idx][0];
    var currDist = distance(mousePt, targetPt);
    targetRadius = targets[idx][1];
    if (currDist <= targetRadius + areaRadius) {
      capturedAreaIdx = idx;
      numCaptured++;
    }
    if (currDist <= targetRadius) capturedPointIdx = idx;
  }
  var capturedIdx;
  if (capturedPointIdx > -1) capturedIdx = capturedPointIdx;
  else if (numCaptured == 1) capturedIdx = capturedAreaIdx;

  var rad = areaRadius;
  if (!isStudyRunning) rad = 0;

  svg
    .select(".cursorCircle")
    .attr("cx", mouse[0])
    .attr("cy", mouse[1])
    .attr("r", rad)
    .attr("fill", "lightgray");

  svg.select(".cursorMorphCircle").attr("cx", 0).attr("cy", 0).attr("r", 0);

  return capturedIdx;
}

// Setting the techniqe based on your experimental variable
function setTechnique() {
  if (techinque == "1") return "BUBBLE";
  if (techinque == "2") return "POINT";
  if (techinque == "3") return "AREA";
  return "POINT";
}

// Setting indepedent variable 1
function setConditionA() {
  if (conditionA == "1") return sizes.VARIED;
  if (conditionA == "2") return sizes.SMALL;
  if (conditionA == "3") return sizes.BIG;
  return sizes.VARIED;
}

// Setting indepedent variable 2
function setConditionB() {
  if (conditionB == "1") return distances.FIXED;
  if (conditionB == "2") return distances.VARIEDSMAll;
  if (conditionB == "3") return distances.VARIEDBIG;
  return distances.FIXED;
}

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

// Setting the tasks
var conditionC = "2";

var currentTask = null;
var taskCount = 0;
var tested = [];
var count = 0;
var taskList = [tasks.TASK1, tasks.TASK2, tasks.TASK3, tasks.TASK4];
function setTasks() {
    if (currentBlock == 1) {
      return tasks.TASK1;
    } else if (currentBlock == 2) {
      return tasks.TASK2;
    } else if (currentBlock == 3) {
      return tasks.TASK3;
    } else if (currentBlock == 4) {
      return tasks.TASK4;
    } else if (currentBlock == 5) {
      if (taskCount < 4) {
        if (taskCount == 0) {
          currentTask = shuffle(taskList);
          taskList = currentTask;
          taskCount = taskCount + 1;
          return currentTask[taskList.length - 1]; 
        } else if (taskCount > 0 && taskCount < 3) {
          taskCount = taskCount + 1;
          return currentTask[taskList.length - 1]; 
        } else  {
          var result = taskList[taskList.length - 1];
          taskList = taskList.slice(0, 3);
          taskCount = taskCount + 1;
          return result;
        }
      } else if (taskCount >= 4 && taskCount < 8 ) {
        if (taskCount == 4) {
          currentTask = shuffle(taskList);
          taskList = currentTask;
          taskCount = taskCount + 1;
          return currentTask[taskList.length - 1]; 
        } else if (taskCount > 4 && taskCount < 7) {
          taskCount = taskCount + 1;
          return currentTask[taskList.length - 1]; 
        } else  {
          var result = taskList[taskList.length - 1];
          taskList = taskList.slice(0, 2);
          taskCount = taskCount + 1;
          return result;
        }
      } else if (taskCount >= 8 && taskCount < 12 ) {
        if (taskCount == 8)
        {
          currentTask = shuffle(taskList);
          taskList = currentTask;
          taskCount = taskCount + 1;
          return currentTask[taskList.length - 1]; 
        } else if (taskCount > 8 && taskCount < 11) {
          taskCount = taskCount + 1;
          return currentTask[taskList.length - 1]; 
        } else  {
          var result = taskList[taskList.length - 1];
          taskList = taskList.slice(0, 1);
          taskCount = taskCount + 1;
          return result;
        }
      } else if (taskCount >= 12 && taskCount < 16 ) {
        if (taskCount == 12) {
          currentTask = shuffle(taskList);
          taskList = currentTask;
          taskCount = taskCount + 1;
          return currentTask[0]; 
        } else {
          var result = taskList[0];
          taskCount = taskCount + 1;
          return result;
        }
      }
    }
}

var clicked = [];
 
function launchTasks() {
  var minX = maxRadius + 10,
    maxX = w - maxRadius - 10,
    xRange = maxX - minX;
  var minY = maxRadius + 10,
    maxY = h - maxRadius - 10,
    yRange = maxY - minY;

  var clickTargets;
  var region1 = [];
  var region2 = [];
  var region3 = [];
  var region4 = [];
  for (var j = 0; j < targets.length; j++) {
    if (targets[j][0][0] <= xRange/2 && targets[j][0][1] <= yRange/2) {
      region1.push(j)
    } else if (targets[j][0][0] > xRange/2 && targets[j][0][1] <= yRange/2) {
      region2.push(j)
    }else if (targets[j][0][0] <= xRange/2 && targets[j][0][1] > yRange/2) {
      region3.push(j)
    } else if (targets[j][0][0] > xRange/2 && targets[j][0][1] > yRange/2) {
      region4.push(j)
    }
  }
  var region = [region1, region2, region3, region4];
  var newRand = Math.floor(Math.random() * ( region.length ) );
  while (newRand == rand) {
    newRand = Math.floor(Math.random() * ( region.length) );
  }
  rand = newRand
  clickTargets = region[rand];
  switch (task) {  
    case tasks.TASK1:
      var result = Array.from(Array(targets.length).keys());
      var result2 = [];
      for (var j = 0; j < result.length; j++) {
        if (!clicked.includes(j)) {
          result2.push(j)
        }
      }
      return result2;
    case tasks.TASK2:
      var result = [Math.floor(Math.random() * targets.length)];
      while (clicked.includes(result[0])) {
        result = [Math.floor(Math.random() * targets.length)]
      }
      return result;
    case tasks.TASK3:
      var result2 = [];
      for (var j = 0; j < clickTargets.length; j++) {
        if (!clicked.includes(clickTargets[j])) {
          result2.push(clickTargets[j])
        }
      }
      if (result2.length === 0) {
        for (var j = 0; j < region.length; j++) {
          if (result2.length !== 0) {
            break;
          }
          for (var i = 0; i < region[j].length; i++) {
            if (!clicked.includes(region[j][i])) {
              result2.push(region[j][i])
            }
          }
        }
      }
      if (result2.length === 0) {
        alert("TRY AGAIN")
      }  
      return result2;
    case tasks.TASK4:
      var result = [clickTargets[Math.floor(Math.random() * clickTargets.length)]];
      while (clicked.includes(result[0])) {
        result = [clickTargets[Math.floor(Math.random() * clickTargets.length)]]
      }
  
      if (result.length === 0) {
        for (var j = 0; j < region.length; j++) {
          for (var i = 0; i < region[j].length; i++) {
            if (!clicked.includes(region[j][i])) {
              result.push(region[j][i])
              break;
            }
          }
        }
      }    
      if (result.length === 0) {
        alert("TRY AGAIN")
      }  
      return result;
  };
}

// Renders three lines of texts to indicate the study status.
function setStatusText(text1, text2, text3) {
  svg.select(".studyStatusText1").text(text1);
  svg.select(".studyStatusText2").text(text2);
  svg.select(".studyStatusText3").text(text3);
}
 
// Below initiates neccesary UI elements for the study.
// Make the targets
var targets = initTargets(numTargets, minRadius, maxRadius, minSep);


// Choose the target that should be clicked
task = setTasks();
var clickTarget = launchTasks();

// implement the other click target


// how to do the area?


// how to select one with in the area
svg
  .append("text")
  .attr("class", "studyStatusText1")
  .attr("x", 20)
  .attr("y", 20)
  .text("Cursor Set to " + currentTechnique);
svg
  .append("text")
  .attr("class", "studyStatusText2")
  .attr("x", 20)
  .attr("y", 40)
  .text("Click to Begin Block " + currentBlock + " of " + totalBlock);
svg
  .append("text")
  .attr("class", "studyStatusText3")
  .attr("x", 20)
  .attr("y", 60)
  .text("The block has " + totalTrials + " Trials");
// Add in the cursor circle at 0,0 with 0 radius
// We add it first so that it appears behind the targets
svg
  .append("circle")
  .attr("class", "cursorCircle")
  .attr("cx", 0)
  .attr("cy", 0)
  .attr("r", 0)
  .attr("fill", "lightgray");
//  Add in cursorMorph circle  at 0,0 with 0 radius.
//  We add it first so that it appears behind the targets
svg
  .append("circle")
  .attr("class", "cursorMorphCircle")
  .attr("cx", 0)
  .attr("cy", 0)
  .attr("r", 0)
  .attr("fill", "lightgray");

// Below binds events to UI elements to implement the study work flow.
// Handle mousemove events. There should be different visuals preseneted when moving the cursor.
svg.on("mousemove", function (d, i) {
  var capturedTargetIdx;
  if (currentTechnique == "BUBBLE")
    capturedTargetIdx = getTargetCapturedByBubbleCursor(
      d3.mouse(this),
      targets
    );
  else if (currentTechnique == "POINT")
    capturedTargetIdx = getTargetCapturedByPointCursor(d3.mouse(this), targets);
  else if (currentTechnique == "AREA")
    capturedTargetIdx = getTargetCapturedByAreaCursor(d3.mouse(this), targets);
  // Update the fillcolor of the targetcircles
  updateTargetsFill(capturedTargetIdx, clickTarget);
});

// Handle a mouse click. Mouse clicks have different effect depending on the study status
svg.on("click", function (d, i) {
  // If current status is the rest before a block, a click would initiate new target circles and start the study.
  if (isRestBeforeBlock) {
    isRestBeforeBlock = false;
    setStatusText("", "", "");
    isStudyRunning = true;
    var d = new Date();
    trialStartTime = d.getTime();
    numTargets = 36;
    // Make the targets
    targets = initTargets(numTargets, minRadius, maxRadius, minSep);
    // Choose the target that should be clicked
    task = setTasks();
    clickTarget = launchTasks();
    // Add in the target circles
    svg
      .selectAll("targetCircles")
      .data(targets)
      .enter()
      .append("circle")
      .attr("class", "targetCircles")
      .attr("cx", function (d, i) {
        return d[0][0];
      })
      .attr("cy", function (d, i) {
        return d[0][1];
      })
      .attr("r", function (d, i) {
        return d[1] - 1;
      })
      .attr("stroke-width", 2)
      .attr("stroke", "limegreen")
      .attr("fill", "white");
    svg.select(".cursorCircle").style("visibility", function () {
      return "visible";
    });
    svg.select(".cursorMorphCircle").style("visibility", function () {
      return "visible";
    });
    // Update the fill color of the targets
    updateTargetsFill(-1, clickTarget);
  }
  // Otherwise if the current status is study-running, a click should be handled based on currentTechnique .
  else if (isStudyRunning) {
    var capturedTargetIdx;
    clickCount++;
    if (currentTechnique == "BUBBLE")
      capturedTargetIdx = getTargetCapturedByBubbleCursor(
        d3.mouse(this),
        targets
      );
    else if (currentTechnique == "POINT")
      capturedTargetIdx = getTargetCapturedByPointCursor(
        d3.mouse(this),
        targets
      );
    else if (currentTechnique == "AREA") {
      capturedTargetIdx = getTargetCapturedByAreaCursor(
        d3.mouse(this),
        targets
      );
    }

    // If user clicked on the clickTarget then choose a new clickTarget
    if (clickTarget.includes(capturedTargetIdx)) {

      clicked.push(capturedTargetIdx);
      // var newClickTarget = clickTarget;
      // // Make sure newClickTarget is not the same as the current clickTarget
      // while (newClickTarget == clickTarget)

      // clickTarget = newClickTarget;

      // Calculate the time taken for a trial and append it to the trialFileContent string.
      var d = new Date();
      var trialEndTime = d.getTime();
      var trialTotalTime = trialEndTime - trialStartTime;
      console.log(task)
      trialFileContent =
        trialFileContent +
        participant +
        "\t\t" +
        currentTrial +
        "\t" +
        currentTechnique +
        "\t\t" +
        currentConditionA +
        "\t" +
        currentConditionB +
        "\t\t" +
        task +
        "\t\t" +
        clickCount +
        "\t\t\t" +
        trialTotalTime +
        "\n";
      currentTrial++;
      clickCount = 0;
      task = setTasks();
      clickTarget = launchTasks();
      if (currentTrial == totalTrials) {
        // A block is finished when currentTrial == totalTrials,
        // add a dashline to for data readability.
        trialFileContent += "------\n";

        if (currentBlock == totalBlock) {
          // Current condition is finished when currentBlock == totalBlock,
          var blob = new Blob([trialFileContent], {
            type: "text/plain;charset=utf-8;",
          });
          // Download the study data as a txt file.
          saveAs(
            blob,
            "P" + participant + "_" + currentTechnique + "_size_" + currentConditionA + "_distance_"+  currentConditionB +"_data.txt"
          );
          // Clear the visualization.
          isStudyRunning = false;
          svg.selectAll(".targetCircles").remove();
          numTargets = 0;
          setStatusText(
            "Study Complete!",
            "Please Ensure the Data File Has Been Downloaded",
            ""
          );
        } else {
          // Finished one block, the participants should be allowed to rest.
          setStatusText(
            "Block "+ currentBlock + " Complete!",
            (totalBlock - currentBlock) + " block(s) to go",
            "Click to continue to the next block",
            ""
          );
          isRestBeforeBlock = true;
          currentBlock += 1;
          clicked = [];
          currentTrial = 0;
          svg.selectAll(".targetCircles").remove();
          svg.select(".cursorCircle").style("visibility", function () {
            return "hidden";
          });
          svg.select(".cursorMorphCircle").style("visibility", function () {
            return "hidden";
          });
        }
      } else {
        // Still within a block, update drawing of targets and the trialStartTime.
        updateTargetsFill(capturedTargetIdx, clickTarget);
        trialStartTime = trialEndTime;
      }
    }
  }
});
