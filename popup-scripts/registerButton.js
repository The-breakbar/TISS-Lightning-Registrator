// Bind register callback
document.getElementById("register-button").addEventListener("click", async () => {
	// Get the info of the selected option
	let optionInfo, optionId, slot;
	if (pageType == "lva") {
		optionInfo = pageInfo.options[0];
	} else {
		optionId = document.getElementById("option-select").value;
		optionInfo = pageInfo.options.find((option) => option.id == optionId);
		if (optionInfo.slots) {
			slot = document.getElementById("slot-select").value.split(",");
		}
	}

	// Get the target time
	let targetDateString = optionInfo.start;
	let [date, time] = targetDateString.split(", ");
	let [day, month, year] = date.split(".");
	let [hour, minute] = time.split(":");
	let targetTime = new Date(year, month - 1, day, hour, minute).getTime();

	// Send the registration request to the content script
	let message = {
		action: "sendRegistration",
		tabId,
		timestamp: targetTime,
		startOffset: 30000,
		stopOffset: 20000,
		maxAttempts: 5,
		optionId,
		slot
	};
	chrome.tabs.sendMessage(tabId, message);

	// Store the active registration task
	let task = {
		tabId,
		status: "queued",
		created: Date.now(),
		lva: pageInfo.lvaName,
		name: optionInfo.name,
		target: targetTime,
		expiry: Math.max(Date.now(), targetTime) + 30000
	};
	chrome.storage.session.set({ [tabId.toString()]: task });
});
