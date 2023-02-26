// This file handles the callback fo the register button, which sends the registration request to the content script
// It also handles the enabling/disabling of the button, aswell as the time zone calculation for the registration date

let registerButton = document.getElementById("register-button");

// If an option is selected, enable the register button if the option has no slots
document.getElementById("option-select").addEventListener("change", () => {
	let optionId = document.getElementById("option-select").value;
	let optionInfo = pageInfo.options.find((option) => option.id == optionId);
	if (optionInfo?.slots) {
		registerButton.disabled = true;
	} else {
		registerButton.disabled = false;
	}
});

// If a slot is selected, enable the register button
document.getElementById("slot-select").addEventListener("change", () => {
	registerButton.disabled = false;
});

// Bind register callback
registerButton.addEventListener("click", async () => {
	// Get the info of the selected options
	let optionInfo, optionId, slot;

	// If the page is an LVA page, there is only one option
	if (pageType == "lva") {
		optionInfo = pageInfo.options[0];
	} else {
		optionId = document.getElementById("option-select").value;
		if (!optionId) return; // Prevent error if no option is selected

		// Get the option info and check if it has slots
		optionInfo = pageInfo.options.find((option) => option.id == optionId);
		if (optionInfo.slots) {
			let slotValue = document.getElementById("slot-select").value;
			if (!slotValue) return; // Prevent error if no slot is selected
			slot = slotValue.split(",");
		}
	}

	// Get the target time
	let targetDateString = optionInfo.start;
	let [date, time] = targetDateString.split(", ");
	let [day, month, year] = date.split(".");
	let [hour, minute] = time.split(":");
	let targetTime = new Date(year, month - 1, day, hour, minute).getTime();

	// Send the registration request to the content script
	chrome.tabs.sendMessage(tabId, {
		action: "sendRegistration",
		tabId,
		timestamp: getAccurateStartTime(optionInfo.start),
		optionId,
		slot
	});

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

let getAccurateStartTime = (targetDateString) => {};
