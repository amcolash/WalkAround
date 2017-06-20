console.log("loaded")

// Auth and try again if failed
auth(true);

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
        if (tryAgain && JSON.parse(x.response).error) {
          chrome.identity.removeCachedAuthToken({token: token}, function() {
            // Try to auth again, but stop trying if failed
            auth(false);
          });
        }
      };

      x.send();
  });
}
