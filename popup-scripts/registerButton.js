// This file handles the callback fo the register button, which sends the registration request to the content script
// It also handles the enabling/disabling of the button, aswell as the time zone calculation for the registration date

const TASK_EXPIRY = 30000;
let registerButton = document.getElementById("register-button");

// If an option is selected, enable the register button if the option has no slots
document.getElementById("option-select").addEventListener("change", () => {
	let optionId = document.getElementById("option-select").value;
	let optionInfo = pageInfo.options.find((option) => option.id == optionId);

	// Display a warning if the registration date is more than 10 days in the future
	let moreThan10Days = optionInfo.start > new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
	document.querySelector(`section[name="info"] p[name="long-wait"]`).hidden = !moreThan10Days;

	// Disable the button if the option has slots or the registration date is more than 10 days in the future
	registerButton.disabled = moreThan10Days || optionInfo.slots;
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

	// Send the registration request to the content script
	chrome.tabs.sendMessage(tabId, {
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

	// Disable the button and select elements
	registerButton.disabled = true;
	document.getElementById("option-select").disabled = true;
	document.getElementById("slot-select").disabled = true;

	// Show active registration info text
	document.querySelector(`section[name="info"] p[name="active-registration"]`).hidden = false;
});
