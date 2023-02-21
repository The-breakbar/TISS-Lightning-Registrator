// If tab is on an appropriate TISS page, message getPageInfo.js content script in page to retrieve all the registration info
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
	// Check if tab has content script injected
	const tabUrl = tabs[0].url;
	if (!/https:\/\/.*tiss.tuwien.ac.at\/education\/course\/(courseRegistration|groupList|examDateList)/.test(tabUrl)) return;

	// Determine type of registration
	let registrationTask;
	if (/courseRegistration/.test(tabUrl)) registrationTask = "lva";
	else if (/groupList/.test(tabUrl)) registrationTask = "group";
	else if (/examDate/.test(tabUrl)) registrationTask = "exam";
	if (!registrationTask) return;

	let startTime;
	// Bind register callback
	document.getElementById("register-button").addEventListener("click", async () => {
		startTime = Date.now();
		let targetDateString, optionId, slot, optionInfo;
		if (registrationTask == "lva") {
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
			tabId: tabs[0].id,
			timestamp: targetTime,
			startOffset: 10000,
			stopOffset: 20000,
			maxAttempts: 7,
			optionId,
			slot
		};
		chrome.tabs.sendMessage(tabs[0].id, message);
		document.getElementById("output").textContent = `Registration started... (${Math.round(timeRemaining / 1000)}s remaining)`;

		// Store the active registration task
		let tasks = (await chrome.storage.local.get("tasks")).tasks ?? [];
		tasks.push({
			tabId: tabs[0].id,
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

	let pageInfo;
	// Get page info on popup load
	chrome.tabs.sendMessage(tabs[0].id, { action: "getPageInfo" }).then((response) => {
		pageInfo = response;
		document.getElementById("page-info").textContent = JSON.stringify(response, null, 2);

		// Add select options
		// Add options to select element
		let select = document.getElementById("idselect");
		pageInfo.options.forEach((option) => {
			let opt = document.createElement("option");
			opt.value = option.id;
			opt.textContent = option.name;
			if (registrationTask == "exam") opt.textContent += ` (${option.date})`;
			select.appendChild(opt);
		});

		return;
	});

	// Bind slot selection callback
	document.getElementById("idselect").addEventListener("change", (event) => {
		let optionId = event.target.value;
		let optionInfo = pageInfo.options.find((option) => option.id == optionId);
		let slotSelect = document.getElementById("slotselect");
		// Remove all options
		while (slotSelect.firstChild) {
			slotSelect.removeChild(slotSelect.firstChild);
		}
		// Add options to select element
		if (optionInfo.slots) {
			optionInfo.slots.forEach((slot) => {
				let opt = document.createElement("option");
				opt.value = slot.start + "," + slot.end;
				opt.textContent = slot.start + " - " + slot.end;
				slotSelect.appendChild(opt);
			});
		}
	});

	// Bind callback for clearing button
	document.getElementById("clear-storage").addEventListener("click", () => {
		chrome.storage.local.clear();
	});

	// Remove expired registration tasks
	let tasks = (await chrome.storage.local.get("tasks")).tasks ?? [];
	tasks = tasks.filter((registration) => registration.expiry > Date.now());
	chrome.storage.local.set({ tasks });

	// Show registration tasks
	let taskOutput = document.getElementById("tasks");
	tasks.forEach((task) => {
		taskOutput.textContent += `${task.lva}\n${task.name} (${Math.round((task.target - Date.now()) / 1000)}s)\n`;
	});
});
