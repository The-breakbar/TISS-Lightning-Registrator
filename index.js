// Global variables used for popup
let pageInfo;
let pageType;
let tabId;

// Registration tasks are handled in registrationTasks.js
initTaskRemovalTimeouts();

// Check if tab is a registration page
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
	tabId = tabs[0].id;
	let tabUrl = tabs[0].url;
	if (!/https:\/\/.*tiss.tuwien.ac.at\/education\/course\/(courseRegistration|groupList|examDateList)/.test(tabUrl)) return;

	// Determine type of registration
	if (/courseRegistration/.test(tabUrl)) pageType = "lva";
	else if (/groupList/.test(tabUrl)) pageType = "group";
	else if (/examDate/.test(tabUrl)) pageType = "exam";

	// Switch the info text from "wrong url" to "loading"
	document.getElementById("info-wrong-url").hidden = true;
	document.getElementById("info-page-load").hidden = false;

	// Get the page info from the content script
	// This is necessary because the popup can be opened before the content script has loaded
	while (!pageInfo) {
		// Catch empty because it just means the tab hasn't loaded yet
		pageInfo = await chrome.tabs.sendMessage(tabId, { action: "getPageInfo" }).catch(() => {});
	}

	// Hide loading text
	document.getElementById("info-page-load").hidden = true;

	// Option selector is handled in optionSelector.js
	initOptionSelector();
});

// Check if the user's local time differs more than 30 seconds from the server time, and show a warning if so
// This is necessary, because if the difference is too big, the registration will start too early/late
// This is not a perfect solution, if the request fails, then the time is not checked
// However this info notice itself should only very rarely be shown, most system clocks don't deviate that much
fetch("http://worldtimeapi.org/api/timezone/Europe/Vienna")
	.then((response) => {
		if (!response.ok) return;

		// If response is fine, extract the timestamp
		response.json().then((data) => {
			let currentTime = Date.now();
			let serverTime = data.unixtime; // The serverTime is received in seconds

			let timeDifference = Math.abs(currentTime - serverTime * 1000);
			if (timeDifference > 30000) {
				document.getElementById("info-time-difference").hidden = false;
			}
		});
	})
	.catch(() => {});
