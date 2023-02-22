let pageInfo;
let pageType;
let tabId;

// If tab is on an appropriate TISS page, message getPageInfo.js content script in page to retrieve all the registration info
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
	// Check if tab has content script injected
	const tabUrl = tabs[0].url;
	if (!/https:\/\/.*tiss.tuwien.ac.at\/education\/course\/(courseRegistration|groupList|examDateList)/.test(tabUrl)) return;

	// Determine type of registration
	if (/courseRegistration/.test(tabUrl)) pageType = "lva";
	else if (/groupList/.test(tabUrl)) pageType = "group";
	else if (/examDate/.test(tabUrl)) pageType = "exam";
	if (!pageType) return;

	tabId = tabs[0].id;

	// Get page info on popup load
	chrome.tabs.sendMessage(tabs[0].id, { action: "getPageInfo" }).then((response) => {
		pageInfo = response;
		document.getElementById("page-info").textContent = JSON.stringify(response, null, 2);

		updateOptions();
	});
});
