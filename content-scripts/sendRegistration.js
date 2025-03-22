// This is a content script responsible for executing the registration
// The main callback, which is called with a message, sets up a refresh loop that starts some time before the registration opens
// The page is continously refreshed until the registration opens, then it attempts to register
// A single register request consists of 2 POST request:
// The first one to get the confirmation page and the second one to confirm the registration
// If the registration attempt is not the first one, it will also do a refresh (GET) before sending the two requests

// The following message format is required to message this script:
// {
//  action: "sendRegistration"
//  tabId: Id of the tab which is messaged
//  timestamp: Timestamp of when the requests should start sending in milliseconds
//  optionId: Id of the option, starting from the first "j_id" until the colon and number (e.g. "j_id_52:0:j_id_5d:j_id_5g:0") (only for group and exam)
//  slot: A two string array containing the slot start and end time (e.g. ["10:00", "10:30"]) (only for exam)
// }

// After the registration attempts are done, the result is processed in the resultHandler.js script

// Define general registration parameters
const START_OFFSET = 70000; // How many ms before the timestamp the refresh loop should start
const STOP_OFFSET = 70000; // How many ms after the timestamp the refresh loop should stop (if it hasn't started to registrate by then)
const MAX_ATTEMPTS = 5; // Maximum number of attempts to try to register (the first attempt is always expected to succeed, others are just incase something unexpected happens)

// Set a cookie for future refresh (GET) requests, to prevent being redirected to the window handler page
// To not get redirected to a blank window handler page, the request needs a cookie containing the dsrid value and the ClientWindow id
// The dsrid value can be any 3-digit number, but the ClientWindow id has to be the same as the one in the url
// The cookie is set with a fixed value, to avoid creating an unnecessary amount of cookies
let windowId;
if (document.location.href.includes("dswid")) windowId = document.location.href.match(/dswid=(\d*)/)[1]; // The window handler page may not have the id
const DSRID_VALUE = 1;
document.cookie = `dsrwid-${DSRID_VALUE}=${windowId}`; // note that the cookie name is "dsrwid", not "dsrid" as in the url

// This function "refreshes" the page with a GET request and returns a the document of the response
// The url is modified to include the dsrid value that was set in the cookie
let getPage = async () => {
	let response = await fetch(document.location.href.replace(/dsrid=\d*/, `dsrid=${DSRID_VALUE}`));
	let pageDocument = new DOMParser().parseFromString(await response.text(), "text/html");
	return pageDocument;
};

// Utility function to log the time with milliseconds
let logExactTime = (...message) => {
	console.log(`${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, "0")} -`, ...message);
};

// Tab id is initialized with a register request, it is used by infoMessage.js to display the correct message
let tabId;

// This is the main callback that is run when the extension initiates the registration
client.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
	if (message.action != "sendRegistration") return;
	logExactTime("Received registration request...");

	// Set a timeout that will run START_OFFSET milliseconds before the registration opens
	// This will start the refresh loop, which will then start the register loop
	tabId = message.tabId;
	let { timestamp, optionId, slot } = message;
	let currentTime = await getSyncedTime(); // From timeSync.js
	let remainingTime = Math.max(0, timestamp - currentTime - START_OFFSET);

	// Refresh the page every 30 minutes to keep the session alive
	// This is done to avoid having to login again, as the session expires after a certain amount of time
	// The refresh is done in the background, so it doesn't interfere with the registration
	let sessionRefresh = setInterval(() => {
		logExactTime("Refreshing page to keep session alive...");
		getPage();
	}, 30 * 60 * 1000);

	setTimeout(async () => {
		logExactTime("Starting refresh loop...");

		// Clear the session refresh interval
		clearInterval(sessionRefresh);

		// Start the refresh loop
		refreshLoop(optionId, slot);
	}, remainingTime);

	// Close the message connection
	sendResponse();
});

// Helper function for getting the register button
let getButtonFromPage = (page, optionId) => {
	let options = page.querySelectorAll("#contentInner .groupWrapper");
	let button;
	if (pageType == "lva") button = options[0].querySelector(`input[id^="registrationForm"]`);
	else {
		button = Array.from(options)
			// See issue #6, the selector is more specific than just id*={optionId} to avoid false positives
			// There can be the rare case that the selected optionId is included in another id (as a substring), so this accounts for that
			.map((option) => option.querySelector(`input[id*="Form:${optionId}:j_id_"]`))
			.find((button) => button);
	}
	return button;
};

// Continously refresh the page until the register button is found, then get the ViewState and start the registration loop
// Requests are sent in series at, if the button is not found after the specified time, the loop will stop
let refreshLoop = async (optionId, slot) => {
	let stopTime = Date.now() + START_OFFSET + STOP_OFFSET;
	let viewState, buttonId;

	while (!viewState && Date.now() < stopTime) {
		logExactTime("Refreshing page...");
		// Refresh the page and check if the button is on the page
		let pageDocument = await getPage();
		let button = getButtonFromPage(pageDocument, optionId);

		if (button) {
			viewState = pageDocument.querySelector(`input[name="jakarta.faces.ViewState"]`).value;
			buttonId = button.id;
		}
	}

	// If the button was not found, the loop timed out
	if (!viewState) {
		logExactTime("Refresh loop timed out, no button found...");

		// Timeout is handled in resultHandler.js
		handleRefreshTimeout(tabId);

		return;
	}

	// Start the registration loop
	registerLoop(viewState, buttonId, optionId, slot);
};

// Updates the status of the registration task
// This is a possible race condition for a visual bug, however the requests would have to be faster than the updating (which is highly unlikely)
let updateTaskToRunning = async () => {
	let task, currentTasks;
	while (!task) {
		currentTasks = (await client.storage.local.get("tasks")).tasks;
		task = currentTasks[tabId.toString()];
	}
	if (task.status == "queued") {
		task.status = "running";
		currentTasks[tabId.toString()] = task;
		client.storage.local.set({ tasks: currentTasks });
	}
};

// This function is called when the first valid ViewState is obtained
// It attempts to send the registration request until it succeeds or the maxAttempts is reached
// The requests are currently sent in series, for the following reasons:
// - Multiple requests at once will only get a response from the server one at a time, and might possibly also slow down the response rate
// - It is generally expected that the first request succeeds, as it almost always does, the other attempts are just incase something unexpected happens
// - While sending many requests at once, it has been observed that the response is an error, even if the registration was successfully processed internally
//   All the following requests will then get a response which says they're already registered, which causes issues for the result handler
// The observed issues are not fully understood, so it could be considered to change this to a parallel request loop in the future, if it's faster
let registerLoop = async (firstViewState, buttonId, optionId, slot) => {
	logExactTime("Valid ViewState obtained, starting register loop...");

	// Update the status of the registration task
	updateTaskToRunning();

	// Request loop
	let attempts = 0;
	let viewState = firstViewState;
	let response;
	let timeStart = Date.now();

	while (attempts < MAX_ATTEMPTS && !response) {
		attempts++;

		// Attempt to send the requests
		try {
			// View state is already valid for first request
			if (attempts > 1) {
				// Refresh the page and get the ViewState
				logExactTime("Refreshing for new ViewState...");
				let pageDocument = await getPage();
				let button = getButtonFromPage(pageDocument, optionId);

				// If the button says we're already registered, stop the loop
				// This handles the exceptionally rare case that the registration was processed internally, but the response was an error
				if (["Deregistration", "Abmelden"].includes(button?.value)) {
					logExactTime("Registered already through error response, stopping...");
					let time = Date.now() - timeStart;
					logExactTime(`Registration loop finished (${time}ms)`);
					handleErrorRegistration(tabId, optionId, time);
					return;
				}

				// Otherwise just get the ViewState and continue
				viewState = pageDocument.querySelector(`input[name="jakarta.faces.ViewState"]`).value;
			}

			// Throws an error here if the request fails in any way
			response = await sendRequest(viewState, buttonId, slot);

			// Reaching this point means the request succeeded
			// (Note that this doesn't mean the registration was successful, as the response has to be checked)
			logExactTime("Registration request finished with attempt " + attempts);
		} catch (error) {
			// This is for the very rare case that the request fails, due to unknown reasons
			// At this point the loop will just try again, however generally at this point the other requests will also fail
			console.log(error);
			logExactTime(`Attempt number ${attempts} failed`);
		}
	}

	// Pass of result to resultHandler.js
	let time = Date.now() - timeStart;
	logExactTime(`Registration loop finished (${time}ms)`);

	handleResult({
		response,
		tabId,
		attempts,
		time,
		optionId
	});
};

// Define the endpoints and POST data for the requests
const LVA_ENDPOINT = "https://tiss.tuwien.ac.at/education/course/courseRegistration.xhtml";
const GROUP_ENDPOINT = "https://tiss.tuwien.ac.at/education/course/groupList.xhtml";
const EXAM_ENDPOINT = "https://tiss.tuwien.ac.at/education/course/examDateList.xhtml";
const CONFIRM_ENDPOINT = "https://tiss.tuwien.ac.at/education/course/register.xhtml";

// This function attempts to send the two POST requests required to register and returns a promise of the body of the second request
// If any of the requests fail, it will throw an error (caused by the validateResponse function)
let sendRequest = async (viewState, buttonId, slot) => {
	// Define the request body
	let bodyData = {
		"jakarta.faces.ClientWindow": windowId,
		"jakarta.faces.ViewState": viewState
	};

	// Create the body together with the additional required data and define endpoint
	let targetUrl, firstBody;
	if (pageType == "lva") {
		targetUrl = LVA_ENDPOINT;
		firstBody = { ...bodyData, registrationForm_SUBMIT: "1" };
	} else if (pageType == "group") {
		targetUrl = GROUP_ENDPOINT;
		firstBody = { ...bodyData, groupContentForm_SUBMIT: "1" };
	} else if (pageType == "exam") {
		targetUrl = EXAM_ENDPOINT;
		firstBody = { ...bodyData, examDateListForm_SUBMIT: "1" };
	}
	firstBody[buttonId] = "Register";

	// Define the request payload
	let payload = {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded"
		},
		body: new URLSearchParams(firstBody).toString() // Encode the body as a query string
	};

	// Send the first request
	logExactTime("Sending register request with body: ", firstBody);
	let firstResponse = await fetch(targetUrl, payload);
	validateResponse(firstResponse);
	let pageDocument = new DOMParser().parseFromString(await firstResponse.text(), "text/html");

	// Get the new ViewState and button id from the response and add it to the payload
	let secondBody = { ...bodyData, regForm_SUBMIT: "1" };
	secondBody["jakarta.faces.ViewState"] = pageDocument.querySelector(`input[name="jakarta.faces.ViewState"]`).value;
	let confirmButton = pageDocument.querySelector(`#contentInner #regForm input`);
	secondBody[confirmButton.id] = "Register";

	// If the registration option has slots, get the slot id from the response and add it to the payload
	if (slot) {
		let slotOptions = pageDocument.querySelectorAll(`select[id="regForm:subgrouplist"] option`);
		let option = Array.from(slotOptions).find((option) => option.textContent.includes(slot[0]) && option.textContent.includes(slot[1]));
		secondBody["regForm:subgrouplist"] = option.value;
	}

	// If there is a study code setting, add it to the payload
	let settings = (await client.storage.local.get("settings")).settings;
	if (settings.studyCode) {
		secondBody["regForm:studyCode"] = settings.studyCode;
	}

	// Update the body with the new data and encode it
	payload.body = new URLSearchParams(secondBody).toString();

	// Send the second request
	logExactTime("Sending confirm request with body: ", secondBody);
	let secondResponse = await fetch(CONFIRM_ENDPOINT, payload);
	validateResponse(secondResponse);

	// If both requests succeed, return the body of the second request
	return secondResponse.text();
};

// Function to validate the responses for either a redirect or a non-ok status
let validateResponse = (response) => {
	// Check if the response is a redirect, mostly redirects to a 404 or "Invalid session" page
	// Caused by an invalid request or because the action can not be performed
	if (response.redirected) {
		let errorCode = response.url.match(/errorCode=(.*)/)[1];
		throw new Error(`Response failed, redirected to ${errorCode} error page.`);
	}

	// Check if the response is not ok, generally happens if the cookies or ViewState are invalid
	// (usually it is a 302, but a 500 has also been observed)
	if (!response.ok) {
		throw new Error(`Response failed with status ${response.status}.`);
	}
};
