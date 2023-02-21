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

		// Update the registration task
		chrome.storage.local.get("tasks").then(({ tasks }) => {
			let task = tasks.find((task) => task.tabId == tabId);
			task.status = "success";
			task.number = number;
			task.time = time;
			chrome.storage.local.set({ tasks });
		});
	} else {
		console.log("Registration failed");

		// Update the registration task
		chrome.storage.local.get("tasks").then(({ tasks }) => {
			let task = tasks.find((task) => task.tabId == tabId);
			task.status = "failed";
			task.time = time;
			chrome.storage.local.set({ tasks });
		});
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
