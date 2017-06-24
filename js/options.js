// Saves options to chrome.storage.sync
function save_options() {
  var thresholdInput = document.getElementById('threshold');
  var audio = document.getElementById('audio').checked;


  if (thresholdInput.value < 1) {
    thresholdInput.value = 1;
  }

  var threshold = thresholdInput.value;

  chrome.storage.sync.set({
    threshold: threshold,
    audio: audio
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
  }, function(items) {
    document.getElementById('threshold').value = items.threshold;
    document.getElementById('audio').checked = items.audio;
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
