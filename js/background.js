var threshold;
var audio;

var schedule = {};

var lastCount = 0;
var interval;
var token;
var notificationID;

// test the schedule before starting things up
// testSchedule();

// Update options
getOptions();

// Handle snoozing notifications
chrome.notifications.onButtonClicked.addListener(function(notifId, btnIdx) {
  if (notifId === notificationID) {
    if (btnIdx === 0) {
      chrome.notifications.clear(notificationID);
      updateInterval(true);
    }
  }
});

//for listening any message which comes from runtime
chrome.runtime.onMessage.addListener(messageReceived);

// On chrome message recieved
function messageReceived(msg) {
  // If the options page says it has new options, reload options
  if (msg.options) {
    getOptions();
  }
}


// Get auth and set interval if we have a token and valid auth
auth(true);

function getOptions() {
  chrome.storage.sync.get({
    threshold: '75',
    audio: true,

    mon: true,
    tues: true,
    wed: true,
    thurs: true,
    fri: true,
    sat:false,
    sun: false,

    start: 7,
    end: 17
  }, function(items) {
    threshold = items.threshold;
    audio = items.audio;

    schedule.sun = items.sun;
    schedule.mon = items.mon;
    schedule.tues = items.tues;
    schedule.wed = items.wed;
    schedule.thurs = items.thurs;
    schedule.fri = items.fri;
    schedule.sat = items.sat;

    schedule.start = items.start;
    schedule.end = items.end;
  });
}

function auth(tryAgain) {
  chrome.identity.getAuthToken({
    interactive: true
  }, function(token) {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        return;
      }

      var x = new XMLHttpRequest();
      x.open('GET', 'https://www.googleapis.com/oauth2/v2/userinfo?alt=json&access_token=' + token);

      x.onload = function() {
        // If there was an error, try to remove cached token and try re-auth
        var error = JSON.parse(x.response).error;
        if (error) {
          if (tryAgain) {
            chrome.identity.removeCachedAuthToken({token: token}, function() {
              // Try to auth again, but stop trying if failed
              onFailure(error);
              auth(false);
            });
          } else {
            onFailure(error);
          }
        } else {
          window.token = token;
          onSuccess();
        }
      };

      x.send();
  });
}

function onSuccess() {
  updateInterval();

  // Get inital count
  getData();
}

function onFailure(error) {
  console.error(error);
  updateInterval();
}

function getData(compare) {
  var start = new Date();
  start.setHours(0,0,0,0);

  var end = new Date(start.getTime());
  end.setHours(23,59,59,9999);

  var request = {
    "aggregateBy": [{
      "dataTypeName": "com.google.step_count.delta",
      "dataSourceId": "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"
    }],
    "bucketByTime": { "durationMillis": 87000000 }, // one day roughly, a little more just in case
    "startTimeMillis": start.getTime(),
    "endTimeMillis": end.getTime()
  };

  if (!token) return;

  var x = new XMLHttpRequest();
  x.open('POST', 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate');
  x.setRequestHeader("Authorization", "Bearer " + token);
  x.setRequestHeader("Content-Type", "application/json;encoding=utf-8");

  x.onload = function() {
    var response = JSON.parse(x.response);
    // If there was an error, try to remove cached token and try re-auth
    var error = response.error;
    if (error) {
      console.error(error);
    } else {
      // console.log(res);
      var value = 0;
      try {
        value = response.bucket[0].dataset[0].point[0].value[0].intVal;
      } catch (e) {
        console.error(e);
      }

      console.log("last value: " + lastCount + ", new value: " + value);

      var pass = checkSchedule();
      if (compare)
        console.log("check schedule: " + (pass ? "passed" : "failed"));

      if (compare) {
        if (value - lastCount < threshold) {
          console.log("time to move!");

          // Got audio file from: https://www.freesound.org/people/jgreer/sounds/333629/
          if (audio) {
            var chime = new Audio('../audio/chime.wav');
            chime.play();
          }

          // Show a notification
          chrome.notifications.create('', {
            type: 'basic',
            title:'WalkAround',
            message: 'Time to move!',
            iconUrl: 'img/walk.png',
            eventTime: Date.now(),
            priority: 1, // Keep around for a bit
            buttons: [  { title: 'Snooze 5 min' } ]
          }, function(id) {
            notificationID = id;
          });
        } else {
          console.log("you are ok");
        }
      }

      updateInterval(false);
      lastCount = value;
    }
  };

  x.send(JSON.stringify(request));
}

function testSchedule() {
  console.clear();

  var now = new Date();
  schedule.sun = now.getDay() == 0;
  schedule.mon = now.getDay() == 1;
  schedule.tues = now.getDay() == 2;
  schedule.wed = now.getDay() == 3;
  schedule.thurs = now.getDay() == 4;
  schedule.fri = now.getDay() == 5;
  schedule.sat = now.getDay() == 6;

  now.setHours(4);

  schedule.start = 0;
  schedule.end = 6;
  // 0 <= 6 && (4 < 0 || 4 > 6), T && (F || F) --> F  ~== T
  console.assert(checkSchedule(now), "schedule check failed");

  schedule.start = 4;
  schedule.end = 6;
  // 4 <= 6 && (4 < 4 || 4 > 6), T && (F || F) --> F  ~== T
  console.assert(checkSchedule(now), "schedule check failed");

  schedule.start = 6;
  schedule.end = 12;
  // 6 <= 12 && (4 < 6 || 4 > 12), T && (T || F) --> T ~== F
  console.assert(!checkSchedule(now), "schedule check failed");

  schedule.start = 6;
  schedule.end = 0;
  // 6 > 0 && (4 > 6 || 4 < 0), T && (F || F) --> F  ~== T
  console.assert(checkSchedule(now), "schedule check failed");

  schedule.start = 4;
  schedule.end = 0;
  // 4 > 0 && (4 > 4 || 4 < 0), T && (F || F) --> F  ~== T
  console.assert(checkSchedule(now), "schedule check failed");

  schedule.start = 6;
  schedule.end = 5;
  // 6 > 5 && (4 > 6 || 4 < 5), T && (T || F) --> T ~== F
  console.assert(!checkSchedule(now), "schedule check failed");

  schedule.start = 4;
  schedule.end = 4;
  // 4 > 4 && (4 > 4 || 4 < 4), F && (F || F) --> F  ~== T
  console.assert(checkSchedule(now), "schedule check failed");
}

// TODO: Check this out
function checkSchedule(time) {
  var now = new Date();
  if (time) {
    now = time;
  }

  if (schedule.start <= schedule.end && (now.getHours() < schedule.start || now.getHours() > schedule.end)) {
    return false;
  }

  if (schedule.start > schedule.end && (now.getHours() > schedule.start || now.getHours() < schedule.end)) {
    return false;
  }

  switch(now.getDay()) {
  case 0:
    return schedule.sun;
  case 1:
    return schedule.mon;
  case 2:
    return schedule.tues;
  case 3:
    return schedule.wed;
  case 4:
    return schedule.thurs;
  case 5:
    return schedule.fri;
  case 6:
    return schedule.sat;
  default:
    return true;
  }
}

function updateInterval(snooze) {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }

  if (token) {
    var delay;
    if (snooze) {
      delay = 5 * 60 * 1000;
    } else {
      // Set the interval for the start of the next hour
      var now = new Date();

      var next = new Date();
      next.setHours(now.getHours() + 1);
      next.setMinutes(0);
      next.setMilliseconds(0);

      delay = next - now;
    }

    interval = setInterval(function() { getData(true) }, delay);
  }
}
