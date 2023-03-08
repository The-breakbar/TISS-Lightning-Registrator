// This is a content script responsible for handling the results of the registration attempts
const TASK_EXPIRY = 60000;

// Helper function to update the task in the session storage
let updateTask = async (tabId, update) => {
	let task;
	// Just in case the task is not stored yet
	// During regular operation it is always stored, but the execution might reach this point before it is added to session storage
	while (!task) {
		task = (await chrome.storage.session.get(tabId.toString()))[tabId];
	}
	if (task.status == "queued" || task.status == "running") {
		task = Object.assign(task, update);
		chrome.storage.session.set({ [tabId]: task });
	}
};

// Handle the case where the registration loop finished
let handleResult = async (message) => {
	let { response, tabId, attempts, time, optionId } = message;

	// Get the count of already registered students
	let pageDocument = await getPage();
	let options = pageDocument.querySelectorAll("#contentInner .groupWrapper");
	let numberString = Array.from(options)
		.find((option) => pageType == "lva" || option.querySelector(`input[id*="${optionId}"]`))
		.querySelector(`span[id*="members"]`).innerText;
	let number = numberString.split("/")[0].trim();

	if (response) {
		console.log("Registered as number " + number);
	} else {
		console.log("Registration failed");
	}

	// Update the task in the session storage
	let update = {
		status: response ? "success" : "failure",
		expiry: Date.now() + TASK_EXPIRY,
		number,
		time,
		error: response ? undefined : "registration attempted " + attempts + " times"
	};

	updateTask(tabId, update);
};

// Handle the case where the refresh loop finished
let handleRefreshTimeout = async (tabId) => {
	let update = {
		status: "failure",
		expiry: Date.now() + TASK_EXPIRY,
		error: "registration did not open"
	};

	updateTask(tabId, update);
};
