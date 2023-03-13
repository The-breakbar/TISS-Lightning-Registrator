// This file handles the callback fo the register button, which sends the registration request to the content script
// It also handles the enabling/disabling of the button and the display of info messages

const TASK_EXPIRY = 70000;
let registerButton = document.getElementById("register-button");

// Listener for the option select, it enables the register button if all conditions are met
document.getElementById("option-select").addEventListener("change", () => {
	let optionId = document.getElementById("option-select").value;
	let optionInfo = pageType == "lva" ? pageInfo.options[0] : pageInfo.options.find((option) => option.id == optionId);

	// Display a warning if the registration date is more than 10 days in the future
	let moreThan10Days = optionInfo.start > new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
	document.getElementById("info-long-wait").hidden = !moreThan10Days;

	// Disable the button if the option has slots or the registration date is more than 10 days in the future
	registerButton.disabled = moreThan10Days || optionInfo.slots;
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

	// Send the registration request to the content script
	await chrome.tabs.sendMessage(tabId, {
		action: "sendRegistration",
		tabId,
		timestamp: optionInfo.start,
		optionId,
		slot
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
	chrome.storage.session.set({ [tabId.toString()]: task });
});
