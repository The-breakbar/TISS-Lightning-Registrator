// Bind register callback
document.getElementById("register-button").addEventListener("click", async () => {
	let startTime = Date.now();
	let targetDateString, optionId, slot, optionInfo;
	if (pageType == "lva") {
		optionInfo = pageInfo.options[0];
		targetDateString = optionInfo.start;
	} else {
		optionId = document.getElementById("idselect").value;
		optionInfo = pageInfo.options.find((option) => option.id == optionId);
		targetDateString = optionInfo.start;
		if (optionInfo.slots) {
			slot = document.getElementById("slotselect").value.split(",");
		}
	}
	let [date, time] = targetDateString.split(", ");
	let [day, month, year] = date.split(".");
	let [hour, minute] = time.split(":");
	let targetTime = new Date(year, month - 1, day, hour, minute).getTime();
	let timeRemaining = Math.max(0, targetTime - Date.now());

	let message = {
		action: "sendRegistration",
		tabId,
		timestamp: targetTime,
		startOffset: 10000,
		stopOffset: 20000,
		maxAttempts: 7,
		optionId,
		slot
	};
	chrome.tabs.sendMessage(tabId, message);
	document.getElementById("output").textContent = `Registration started... (${Math.round(timeRemaining / 1000)}s remaining)`;

	// Store the active registration task
	let tasks = (await chrome.storage.local.get("tasks")).tasks ?? [];
	tasks.push({
		tabId,
		status: "queued",
		lva: pageInfo.lvaName,
		name: optionInfo.name,
		target: targetTime,
		expiry: targetTime + 30000,
		time: undefined,
		number: undefined
	});
	chrome.storage.local.set({ tasks });
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
