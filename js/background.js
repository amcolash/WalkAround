const delay = 60 * 60 * 1000; // 60 minutes

var threshold;
var audio;

var lastCount = 0;
var interval;
var token;
var notificationID;

window.onload = function() {
  // Update options
  getOptions();

  // Get auth and set interval if we have a token and valid auth
  auth(true);
}

function getOptions() {
  chrome.storage.sync.get({
    threshold: '75',
    notifications: true,
    audio: true,
  }, function(items) {
    threshold = items.threshold;
    audio = items.audio;
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
  console.log(error);
  updateInterval();
}

// TODO: Remove this?
function signOut() {
  var auth2 = gapi.auth2.getAuthInstance();
  auth2.signOut().then(function () {
    updateInterval();
  });
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
      if (response.bucket.length > 0 && response.bucket[0].dataset.length > 0) {
        var value = response.bucket[0].dataset[0].point[0].value[0].intVal;
        console.log("last value: " + lastCount + ", new value: " + value);

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

        lastCount = value;
      }
    }
  };

  x.send(JSON.stringify(request));
}

function updateInterval(snooze) {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }

  if (token) {
    interval = setInterval(function() { getData(true) }, snooze ? 60 *1000 * 5 : delay);
  }
}

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

function messageReceived(msg) {
  if (msg.optons) {
    getOptions();
  }
}
