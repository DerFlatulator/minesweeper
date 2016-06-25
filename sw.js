
importScripts('node_modules/sw-toolbox/sw-toolbox.js');

toolbox.router.default = toolbox.fastest;

toolbox.precache([
    '/index.html', 
    '/build/minesweeper.js', 
    '/node_modules/lodash/lodash.js',
    '/node_modules/knockout/build/output/knockout-latest.js',
    '/img/sprite-small.png',
    '/img/sprite.png',
    
    '/img/android-chrome-192x192.png',
    '/img/android-chrome-144x144.png',
    '/img/android-chrome-96x96.png',
    '/img/android-chrome-72x72.png',
    '/img/android-chrome-48x48.png',
    '/img/android-chrome-36x36.png',
]);

// based on:
// https://developers.google.com/web/showcase/2015/service-workers-iowa#offline_google_analytics

var DB_NAME = 'offline-analytics';
var EXPIRATION_TIME_DELTA = 86400000;
var ORIGIN = /https?:\/\/((www|ssl)\.)?google-analytics\.com/;

function replayQueuedAnalyticsRequests() {
  caches.open(DB_NAME).then(function(cache) {
    cache.keys().then(function (keys) {
      keys.forEach(function(request, response) {
        response.text().then(function (originalTimestamp) {
          var timeDelta = Date.now() - +originalTimestamp;
          var replayUrl = request.url + '&qt=' + timeDelta;
          fetch(replayUrl).then(function(response) {
            if (response.status >= 500) {
                return Response.error();
            }
            db.delete(url);
          }).catch(function(error) {
            if (timeDelta > EXPIRATION_TIME_DELTA) {
                cache.delete(request);
            }
          });
        })
      });
    });
  });
}

function queueFailedAnalyticsRequest(request) {
  caches.open(DB_NAME).then(function(cache) {
    cache.put(request, new Response(new Blob([Date.now()])));
  });
}

function handleAnalyticsCollectionRequest(request) {
  return fetch(request).then(function(response) {
    if (response.status >= 500) {
      return Response.error();
    }
    return response;
  }).catch(function() {
    queueFailedAnalyticsRequest(request);
  });
}

toolbox.router.get('/collect',
                   handleAnalyticsCollectionRequest,
                   {origin: ORIGIN});
toolbox.router.get('/analytics.js',
                   toolbox.networkFirst,
                   {origin: ORIGIN});

replayQueuedAnalyticsRequests();