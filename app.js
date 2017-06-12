const delay = 60 * 60 * 1000; // 60 minutes
const threshold = 75; // need to have at least 100 steps more each check
const closeDelay = 20 * 1000;
var interval;
var lastCount = 0;

window.onload = function() {
  gapi.load('client', function() {
    gapi.client.init({
      'clientId': '246815826082-f2du3c4ince352fi8fbpn2hm0i6bf2fi.apps.googleusercontent.com',
      'scope': 'profile https://www.googleapis.com/auth/fitness.activity.read',
    });
  });

  gapi.load('auth2', function() {
    gapi.signin2.render('my-signin', {
      'scope': 'profile https://www.googleapis.com/auth/fitness.activity.read',
      'onsuccess': onSuccess,
      'onfailure': onFailure
    });
  });
}

function onSuccess(googleUser) {
  updateUI();

  if (Notification.permission !== "granted")
    Notification.requestPermission();

  // Get inital count
  getData();
}

function onFailure(error) {
  console.log(error);
  updateUI();
}

function signOut() {
  var auth2 = gapi.auth2.getAuthInstance();
  auth2.signOut().then(function () {
    updateUI();
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
    "bucketByTime": { "durationMillis": 86400000 }, // one day
    "startTimeMillis": start.getTime(),
    "endTimeMillis": end.getTime()
  };

  var auth2 = gapi.auth2.getAuthInstance();
  var signedIn = gapi.auth2.getAuthInstance().isSignedIn.get();
  if (!signedIn) return;

  gapi.client.request({
    path: 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
    method: 'POST',
    body: request
  })
  .then(function(res) {
    // console.log(res);
    if (res.result.bucket.length > 0 && res.result.bucket[0].dataset.length > 0) {
      var value = res.result.bucket[0].dataset[0].point[0].value[0].intVal;
      console.log("last value: " + lastCount + ", new value: " + value);

      if (compare) {
        if (value - lastCount < threshold) {
          console.log("time to move!");

          // Got audio file from: https://www.freesound.org/people/jgreer/sounds/333629/
          var audio = new Audio('chime.wav');
          audio.play();

          // Show a notification
          if (Notification.permission === "granted") {
            var notification = new Notification('StandUp', {
              body: 'Time to move!',
              icon: 'https://s-media-cache-ak0.pinimg.com/originals/a4/93/5a/a4935a175ab347ac6c58164554ad67fa.jpg'
            });

            setTimeout(function(){notification.close();}, closeDelay);
          }

        } else {
          console.log("you are ok");
        }
      }

      lastCount = value;
    }
  }, function(err) {
    console.error(err);
  });
}

function updateUI() {
  var auth2 = gapi.auth2.getAuthInstance();
  var signedIn = gapi.auth2.getAuthInstance().isSignedIn.get();

  if (interval) {
    clearInterval(interval);
    interval = null;
  }

  if (signedIn) {
    $('#signed-in').show();
    $('#signed-out').hide();

    // Set up the interval to check things here
    interval = setInterval(function() { getData(true) }, delay);
  } else {
    $('#signed-in').hide();
    $('#signed-out').show();
  }
}
