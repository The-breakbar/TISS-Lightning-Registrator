// This is a content script responsible for handling the results of the registration attempts

let handleResult = async (message) => {
	let { response, tabId, attempts, errors, time, optionId } = message;

	// Get the count of already registered students
	let pageDocument = await getPage();
	let options = pageDocument.querySelectorAll("#contentInner .groupWrapper");
	let numberString = Array.from(options)
		.find((option) => pageType == "lva" || option.querySelector(`input[id*="${optionId}"]`))
		.querySelector(`span[id*="members"]`).innerText;
	let number = numberString.split("/")[0].trim();

	if (response) {
		console.log("Registered as number " + number);

		let update = {
			status: "success",
			expiry: Date.now() + 30000,
			number,
			time
		};
		let updateTask = async () => {
			let task;
			while (!task) {
				task = (await chrome.storage.session.get(tabId.toString()))[tabId];
			}
			if (task.status == "queued" || task.status == "running") {
				task = Object.assign(task, update);
				chrome.storage.session.set({ [tabId]: task });
			}
		};
		updateTask();
	} else {
		console.log("Registration failed");

		let update = {
			tabId,
			status: "failed",
			expiry: Date.now() + 30000,
			time
		};
		let updateTask = async () => {
			let task;
			while (!task) {
				task = (await chrome.storage.session.get(tabId.toString()))[tabId];
			}
			if (task.status == "queued" || task.status == "running") {
				task = Object.assign(task, update);
				chrome.storage.session.set({ [tabId]: task });
			}
		};
		updateTask();
	}
};

let handleRefreshTimeout = async () => {};
