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
	let timeRemaining = Math.max(0, targetTime - Date.now());

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

	document.getElementById("output").textContent = `Registration started... (${Math.round(timeRemaining / 1000)}s remaining)`;

	// Store the active registration task
	let task = {
		tabId,
		status: "queued",
		lva: pageInfo.lvaName,
		name: optionInfo.name,
		target: targetTime,
		expiry: Math.max(Date.now(), targetTime) + 30000
	};
	await chrome.storage.session.set({ [tabId.toString()]: task });
	showTasks();
});

// Bind response callback
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action != "sendRegistrationResponse") return;
	let { success, attempts, errors, time, number } = message;
	if (success) {
		document.getElementById("output").textContent = `Registration successful with ${attempts} attempt${attempts == 1 ? "" : "s"} (place ${number}) (${time}ms)`;
	} else {
		document.getElementById("output").textContent = `Registration failed: Max attempts reached (${time}ms)`;
	}

	if (errors.length > 0) {
		errors.forEach((errorMessage) => {
			document.getElementById("output").textContent += `\n${errorMessage}`;
		});
	}

	sendResponse();
});
