// TODO: Do I need a popup or just an options page?


// for listening to any message which comes from runtime
chrome.runtime.onMessage.addListener(messageReceived);

function messageReceived(msg) {
  document.getElementById('signed-in').style.display = msg.auth ? "block" : "none";
  document.getElementById('signed-out').style.display = !msg.auth ? "block" : "none";
}

// Ask if auth to update UI accordingly
chrome.runtime.sendMessage({'auth': true});


// From chrome docs
// Saves options to chrome.storage
function save_options() {
  var color = document.getElementById('color').value;
  var likesColor = document.getElementById('like').checked;
  chrome.storage.sync.set({
    favoriteColor: color,
    likesColor: likesColor
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get({
    favoriteColor: 'red',
    likesColor: true
  }, function(items) {
    document.getElementById('color').value = items.favoriteColor;
    document.getElementById('like').checked = items.likesColor;
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);
