// Global variables used for popup
let pageInfo;
let pageType;
let tabId;

// Check if tab is a registration page
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
	tabId = tabs[0].id;
	let tabUrl = tabs[0].url;
	if (!/https:\/\/.*tiss.tuwien.ac.at\/education\/course\/(courseRegistration|groupList|examDateList)/.test(tabUrl)) return;

	// Determine type of registration
	if (/courseRegistration/.test(tabUrl)) pageType = "lva";
	else if (/groupList/.test(tabUrl)) pageType = "group";
	else if (/examDate/.test(tabUrl)) pageType = "exam";

	// Get the page info from the content script
	// This is necessary because the popup can be opened before the content script has loaded
	while (!pageInfo) {
		// Catch empty because it just means the tab hasn't loaded yet
		pageInfo = await chrome.tabs.sendMessage(tabId, { action: "getPageInfo" }).catch(() => {});
	}

	// Update the option select
	let select = document.getElementById("option-select");
	pageInfo.options.forEach((option) => {
		// Create option element
		let optElement = document.createElement("option");
		optElement.value = option.id;
		optElement.textContent = option.name;

		// Add the date for exam options to be able to distinguish them
		if (pageType == "exam") optElement.textContent += ` (${option.date})`;

		// Add the option to the select
		select.appendChild(optElement);
	});
});

showTasks();
