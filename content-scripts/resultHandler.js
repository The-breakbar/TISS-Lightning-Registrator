// This is a content script responsible for handling the results of the registration attempts

// The script will send a message with the following format when it is done:
// {
//  action: "sendRegistrationResponse"
//  success: Boolean indicating if the registration was successful
//  attempts: Number of attempts it took to send the request
//  errors: Array of errors that occurred during the request loop
//  time: Time it took to send the requests in milliseconds
// }

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
			let task, tasks;
			while (!task) {
				tasks = (await chrome.storage.session.get("tasks")).tasks || [];
				task = tasks.find((task) => task.tabId == tabId);
			}
			if (task.status == "queued" || task.status == "running") {
				task = Object.assign(task, update);
				chrome.storage.session.set({ tasks });
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
			let task, tasks;
			while (!task) {
				tasks = (await chrome.storage.session.get("tasks")).tasks || [];
				task = tasks.find((task) => task.tabId == tabId);
			}
			if (task.status == "queued" || task.status == "running") {
				task = Object.assign(task, update);
				chrome.storage.session.set({ tasks });
			}
		};
		updateTask();
	}

	// Send the response to the popup
	chrome.runtime.sendMessage({
		action: "sendRegistrationResponse",
		success: !!response,
		attempts,
		errors,
		time,
		number
	});
};

let handleRefreshTimeout = async () => {};
