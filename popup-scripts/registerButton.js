// This file handles the callback fo the register button, which sends the registration request to the content script
// It also handles the enabling/disabling of the button, aswell as the time zone calculation for the registration date

const TASK_EXPIRY = 30000;
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

	let timestamp = getAccurateStartTime(optionInfo.start);

	// Send the registration request to the content script
	chrome.tabs.sendMessage(tabId, {
		action: "sendRegistration",
		tabId,
		timestamp,
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
		date: optionInfo.date,
		slot,
		target: timestamp,
		expiry: Math.max(Date.now(), timestamp) + TASK_EXPIRY
	};
	chrome.storage.session.set({ [tabId.toString()]: task });

	// Disable the button and select elements
	registerButton.disabled = true;
	document.getElementById("option-select").disabled = true;
	document.getElementById("slot-select").disabled = true;

	// Show active registration info text
	document.querySelector(`section[name="info"] p[name="active-registration"]`).hidden = false;
});

// The displayed registration start on TISS is for the timezone of Vienna
// This function takes the daylight saving time into account and returns the correct time
let getAccurateStartTime = (targetDateString) => {
	// Get the beginning of daylight saving time (last sunday in march)
	let DSTstart = new Date();
	DSTstart.setUTCMonth(2);
	DSTstart.setUTCDate(31);
	DSTstart.setUTCHours(1, 0, 0, 0);
	while (DSTstart.getUTCDay() != 0) {
		DSTstart.setUTCDate(DSTstart.getUTCDate() - 1);
	}

	// Get the end of daylight saving time (last sunday in october)
	let DSTend = new Date();
	DSTend.setUTCMonth(9);
	DSTend.setUTCDate(31);
	DSTend.setUTCHours(1, 0, 0, 0);
	while (DSTend.getUTCDay() != 0) {
		DSTend.setUTCDate(DSTend.getUTCDate() - 1);
	}

	// Create the target date
	let isDST = DSTstart < Date.now() && Date.now() < DSTend;
	let [date, time] = targetDateString.split(", ");
	let [day, month, year] = date.split(".");
	let [hour, minute] = time.split(":");
	let targetTime = new Date();
	targetTime.setUTCFullYear(year, month - 1, day);
	targetTime.setUTCHours(hour, minute, 0, 0);
	targetTime.setUTCHours(targetTime.getUTCHours() - (isDST ? 2 : 1)); // Subtract 2 hours for CEST, 1 hour for CET

	return targetTime.getTime();
};
