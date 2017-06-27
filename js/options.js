// Saves options to chrome.storage.sync
function save_options() {
  var thresholdInput = document.getElementById('threshold');
  var audio = document.getElementById('audio').checked;

  var mon = document.getElementById('mon').checked;
  var tues = document.getElementById('tues').checked;
  var wed = document.getElementById('wed').checked;
  var thurs = document.getElementById('thurs').checked;
  var fri = document.getElementById('fri').checked;
  var sat = document.getElementById('sat').checked;
  var sun = document.getElementById('sun').checked;

  var start = Number(document.getElementById('start').value);
  var end = Number(document.getElementById('end').value);

  if (thresholdInput.value < 1) {
    thresholdInput.value = 1;
  }

  var threshold = thresholdInput.value;

  chrome.storage.sync.set({
    threshold: threshold,
    audio: audio,

    mon: mon,
    tues: tues,
    wed: wed,
    thurs: thurs,
    fri: fri,
    sat: sat,
    sun: sun,

    start: start,
    end: end
  }, function() {
    // Send message to background that options were updated
    chrome.runtime.sendMessage({'options': true});

    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.innerHTML = 'Options Saved <i class="fa fa-check" aria-hidden="true"></i>';
    setTimeout(function() {
      status.innerHTML = '';
    }, 1500);
  });
}

// Restores preferences stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and likesColor = true.
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
    document.getElementById('threshold').value = items.threshold;
    document.getElementById('audio').checked = items.audio;

    document.getElementById('mon').checked = items.mon;
    document.getElementById('tues').checked = items.tues;
    document.getElementById('wed').checked = items.wed;
    document.getElementById('thurs').checked = items.thurs;
    document.getElementById('fri').checked = items.fri;
    document.getElementById('sat').checked = items.sat;
    document.getElementById('sun').checked = items.sun;

    document.getElementById('start').value = Number(items.start);
    document.getElementById('end').value = Number(items.end);
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
