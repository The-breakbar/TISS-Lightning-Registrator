// This file handles the callback fo the register button, which sends the registration request to the content script
// It also handles the enabling/disabling of the button and the display of info messages

const TIME_DEVIATION_MAX = 30000; // 30 seconds
const TASK_EXPIRY = 120000; // 2 minutes
let registerButton = document.getElementById("register-button");

// Listener for the option select, it enables the register button if all conditions are met
document.getElementById("option-select").addEventListener("change", () => {
	let optionId = document.getElementById("option-select").value;
	let optionInfo = pageType == "lva" ? pageInfo.options[0] : pageInfo.options.find((option) => option.id == optionId);

	// Display a warning if the registration date is more than 2 hours
	let moreThan2Hours = optionInfo.start - Date.now() > 2 * 60 * 60 * 1000;
	document.getElementById("info-long-wait").hidden = !moreThan2Hours;

	// Disable the button if the option has slots
	registerButton.disabled = optionInfo.slots;
});

// Listener for the slot select, which enables the register button
// If a slot is selected, it is expected that the option is already valid
document.getElementById("slot-select").addEventListener("change", () => {
	registerButton.disabled = false;
});

// Main button callback, it expects that the selected options are valid
registerButton.addEventListener("click", async () => {
	// Get the info of the selected options
	let optionInfo, optionId, slot;
	if (pageType == "lva") {
		optionInfo = pageInfo.options[0]; // If the page is an LVA page, there is only one option
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

	// Disable the button and select elements
	registerButton.disabled = true;
	document.getElementById("option-select").disabled = true;
	document.getElementById("slot-select").disabled = true;

	// Show active registration info text
	document.getElementById("info-active-registration").hidden = false;

	// Check if the user's local time differs more than 30 seconds from the exact time
	// If the time deviates too much, the api time is used and an info notice is shown
	// This is necessary, because if the difference is too big, the registration will start too early/late
	// This is not a perfect solution, if the request fails, then the time is not checked
	// However this should only happen very rarely, as most system clocks don't deviate that much
	let timeOverride;
	const timeResponse = await fetch("https://worldtimeapi.org/api/timezone/Europe/Vienna");
	if (timeResponse.ok) {
		// If response is fine, extract the timestamp
		const data = await timeResponse.json();
		let serverTime = data.unixtime * 1000; // The serverTime is received in seconds
		let timeDifference = Math.abs(Date.now() - serverTime);

		if (timeDifference > TIME_DEVIATION_MAX) {
			document.getElementById("info-time-difference").hidden = false;
			timeOverride = serverTime;
		}
	}

	// Send the registration request to the content script
	await client.tabs.sendMessage(tabId, {
		action: "sendRegistration",
		tabId,
		timestamp: optionInfo.start,
		optionId,
		slot,
		timeOverride
	});

	// Store the active registration task
	let task = {
		tabId,
		status: "queued",
		timestamp: optionInfo.start,
		created: Date.now(),
		lva: pageInfo.lvaName,
		name: optionInfo.name,
		date: optionInfo.date,
		slot,
		expiry: Math.max(Date.now(), optionInfo.start) + TASK_EXPIRY
	};
	client.storage.local.set({ [tabId.toString()]: task });
});
