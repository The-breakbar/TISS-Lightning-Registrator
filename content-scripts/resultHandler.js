// This is a content script responsible for handling the results of the registration attempts
const TASK_EXPIRY = 60000;

// Helper function to update the task in local storage
let updateTask = async (tabId, update) => {
	let task;
	// Just in case the task is not stored yet
	// During regular operation it is always stored, but the execution might reach this point before it is added to local storage
	while (!task) {
		task = (await client.storage.local.get(tabId.toString()))[tabId];
	}
	if (task.status == "queued" || task.status == "running") {
		task = Object.assign(task, update);
		client.storage.local.set({ [tabId]: task });
	}
};

// Helper function to get the number that you registered as
let getRegisteredNumber = async (optionId, preregistration) => {
	let pageDocument = await getPage();
	let options = pageDocument.querySelectorAll("#contentInner .groupWrapper");
	let numberString = Array.from(options)
		.find((option) => pageType == "lva" || option.querySelector(`input[id*="${optionId}"]`))
		.querySelector(`span[id*="${preregistration ? "waitingList" : "members"}"]`).innerText;

	return numberString.split("/")[0].trim();
};

// Handle the case where the registration loop finished
let handleResult = async (message) => {
	let { response, tabId, attempts, time, optionId } = message;

	// Check if the registration loop received a response
	if (!response) {
		console.log("Registration failed");
		let update = {
			status: "failure",
			expiry: Date.now() + TASK_EXPIRY,
			time,
			error: `Registration attempted ${attempts} times`
		};
		updateTask(tabId, update);

		return;
	}

	// At this point we still assume that the registration was not successful, as we have to check the response message
	let success = false;
	let preregistration = false;
	let errorMessage = "Unable to register for this option";
	let responseDocument = new DOMParser().parseFromString(response, "text/html");
	let responseInfoText = responseDocument.querySelector("#confirmForm .staticInfoMessage").innerText;

	// Check if the registration wasn't fast enough and ended up on the waiting list
	if (/(warteliste|waiting list)/i.test(responseInfoText)) {
		errorMessage = "On waiting list";
	}

	// Check if the response message contains the success message
	// The most reasonable way for check this is string matching, as it is just an info message
	if (/(sie wurden erfolgreich zur.*angemeldet|you successfully registered for)/i.test(responseInfoText)) {
		success = true;
	}

	// Check if the info message says that you are already registered
	// This is just to avoid showing a failure message if this info message is shown
	if (/(Ist bereits Gruppenmitglied|Already group member)/i.test(responseInfoText)) {
		success = true;
	}

	// Check if the registration was a pre-registration
	if (
		/(Anmeldewunsch.*wurde erfasst.*Erst nach Bestätigung durch|registration request for.*has been recorded.*registration needs to be confirmed)/i.test(responseInfoText)
	) {
		success = true;
		preregistration = true;
	}

	// Get the count of already registered students
	let number;
	if (success) {
		number = await getRegisteredNumber(optionId, preregistration);
		console.log("Registered as number " + number);
	}

	// Update the task to success
	let update = {
		status: success ? "success" : "failure",
		expiry: Date.now() + TASK_EXPIRY,
		number,
		time,
		error: success ? null : errorMessage
	};
	updateTask(tabId, update);
};

// Handle the case where the refresh loop finished
let handleRefreshTimeout = async (tabId) => {
	let update = {
		status: "failure",
		expiry: Date.now() + TASK_EXPIRY,
		error: "Registration did not open"
	};

	updateTask(tabId, update);
};

// Handle the case where the registration was processed internally, but the response was an error
let handleErrorRegistration = async (tabId, optionId, time) => {
	let number = await getRegisteredNumber(optionId);
	console.log("Registered as number " + number);

	let update = {
		status: "success",
		expiry: Date.now() + TASK_EXPIRY,
		number,
		time
	};

	updateTask(tabId, update);
};
