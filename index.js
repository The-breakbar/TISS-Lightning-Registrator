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
