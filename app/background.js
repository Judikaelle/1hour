let interval;
// myURLs contains the blocked websites
// Format : myURLs = ["tailwindcss.com", "google.com"];
let myURLs = [];

// myURLsRedirect contains the blocked websites
// Format : myURLsRedirect = ["*://*.tailwindcss.com/*", "*://*.google.com/*"];
let myURLsRedirect = [];

/** Init Storage. */
const storage = Storage();

const tabToUrl = {}; // Monitor currently Tabs opened
let currentlyCounting = false; // Start / Stop interval

/** Set the last update to reset timer every day */
let today = new Date().toLocaleDateString(); // set today's date
let lastUpdate;

/**
 * Get urls stored in the Chrome Local Storage and hydrate
 * the myURLs & myURLsRedirect variables.
 */
(async () => {
  const websites = await storage.getItem('websites');

  lastUpdate = await storage.getItem('lastUpdate'); // get the date of the last timer update
  lastUpdate ? lastUpdate : lastUpdate = today; // if doesn't exist, set today's date as last update

  let time = (await storage.getItem('time')) || 0; // Time spent on myURLs

  if (websites instanceof Array) {
    websites.forEach((website) => {
      myURLs.push(website);
      myURLsRedirect.push('*://*.' + website + '/*');
    });

    chrome.webRequest.onBeforeRequest.addListener(
      () => {
        // If last update is not today, reset timer to 0
        if (lastUpdate != today) {
          time = 0;
        }
        // else, if time is more than 1 hour and lastUpdate is today
        else if (time > 3600 && lastUpdate === today) {
          return {
            // Redirect
            redirectUrl: 'https://one-hour-long.glitch.me/'
          };
        }
      },
      {
        urls: [...myURLsRedirect], // Redirect only URLs add by the user
        types: [
          'main_frame',
          'sub_frame',
          'stylesheet',
          'script',
          'image',
          'object',
          'xmlhttprequest',
          'other'
        ]
      },
      ['blocking']
    );
  } else {
    // If "websites" doesn't exist in Local Storage
    myURLs = ['facebook.com', 'twitter.com'];
    myURLsRedirect = ['*://*.facebook.com/*', '*://*.twitter.com/*'];
  }

  // Everytime a Tab is updated
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (
      changeInfo.status == 'complete' &&
      myURLs.some((url) => tab.url.includes(url)) && // Check if current Tab URL is in myURLs
      currentlyCounting == false // If the interval is not already launched
    ) {
      currentlyCounting = true;
      tabToUrl[tabId] = tab.url; // Add the tab, to monitor
      // Start interval to increase time by 1 every seconds
      interval = setInterval(() => {
        time++;
      }, 1000);
    }
    if (
      changeInfo.status == 'complete' &&
      myURLs.some((url) => tab.url.includes(url)) &&
      currentlyCounting == true // If the interval is already launched
    ) {
      tabToUrl[tabId] = tab.url;
    }
  });

  // When a tab is closed
  chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
    if (tabToUrl[tabId] === undefined) return;
    // If the tab is in tabToUrl

    if (myURLs.some((url) => tabToUrl[tabId].includes(url))) {
      currentlyCounting = false;
    }

    // Remove information for non-existent tab
    delete tabToUrl[tabId];

    // If all tabs from tabToUrl are closed, clear interval
    if (Object.entries(tabToUrl).length === 0) {
      clearInterval(interval);
      storage.setItem('time', time);
      storage.setItem('lastUpdate', lastUpdate);
    }
  });
})();
