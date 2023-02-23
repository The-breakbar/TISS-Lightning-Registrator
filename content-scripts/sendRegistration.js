// This is a content script responsible for executing the registration
// The main callback, which is called with a message, sets up a refresh loop that starts some time before the registration opens
// The page is continously refreshed until the registration opens, then it attempts to register
// A single register request consists of 2 POST request:
// The first one to get the confirmation page and the second one to confirm the registration

// The following message format is required to message this script:
// {
//  action: "sendRegistration"
//  tabId: Id of the tab which is messaged
//  timestamp: Timestamp of when the requests should start sending in milliseconds
//  startOffset: How many ms before the timestamp the refresh loop should start
//  stopOffset: How many ms after the timestamp the refresh loop should stop
//  maxAttempts: Maximum number of attempts to send the register equest
//  optionId: Id of the option, starting from the first "j_id" until the colon and number (e.g. "j_id_52:0:j_id_5d:j_id_5g:0") (only for group and exam)
//  slot: A two string array containing the slot start and end time (e.g. ["10:00", "10:30"]) (only for exam)
// }

// After the registration attempts are done, the result is processed in the resultHandler.js script

// Documentation for the endpoints:

// Every request has to have these 3 session cookies: _tiss_session, TISS_AUTH, JSESSIONID
// The cookies generally do not change during the session, except for JSESSIONID, which can change if bad requests are sent

// /education/course/courseRegistration.xhtml
// This endpoint is used to get the confirmation page of lva registrations and requires the following POST data:
//  registrationForm:j_id_6t : "Register" ("Anmelden" is also valid) (the key of this parameter is the id of the register button)
//  registrationForm_SUBMIT : "1"
//  dspwid : A window id (found in the url as "dswid" or in the page)
//  javax.faces.ClientWindow : Same value as dspwid
//  javax.faces.ViewState : A valid ViewState (see below)

// /education/course/groupList.xhtml
// This endpoint is used to get the confirmation page of group registrations and requires the following POST data:
//  groupContentForm:<id>:j_id_a1 : "Register" ("Anmelden" is also valid) (the id in the key is from the html ids of the option, see getPageInfo.js)
//  groupContentForm_SUBMIT : "1"
//  dspwid : A window id (found in the url as "dswid" or in the page)
//  javax.faces.ClientWindow : Same value as dspwid
//  javax.faces.ViewState : A valid ViewState (see below)

// /education/course/examDateList.xhtml
// This endpoint is used to get the confirmation page of exam registrations and requires the following POST data:
//  examDateListForm:<id>:j_id_9u : "Register" ("Anmelden" is also valid) (the id in the key is from the html ids of the option, see getPageInfo.js)
//  examDateListForm_SUBMIT : "1"
//  dspwid : A window id (found in the url as "dswid" or in the page)
//  javax.faces.ClientWindow : Same value as dspwid
//  javax.faces.ViewState : A valid ViewState (see below)

// /education/course/register.xhtml
// This endpoint is used to confirm the registration, has to be called after one of the lva/group/exam endpoints was called
// It requires the following POST data:
//  regForm:j_id_30 : "Register" ("Anmelden" is also valid) (the key of this parameter is the id of the confirm button)
//  regForm_Submit : "1"
//  dspwid : A window id (found in the url as "dswid" or in the page)
//  javax.faces.ClientWindow : Same value as dspwid
//  javax.faces.ViewState : A valid ViewState obtained from the response to the previous request (see below)
//  regForm:subgrouplist : Number value of the exam slot selection option (has to be extracted from the response to the previous request) (only for exams with slots)

// ViewState (represents the state of the page)
// The ViewState is a unique string that is required for every request and changes every time the page is loaded
// A valid ViewState can only be used once for a request
// It can be found in the page source as a hidden input field with the name "javax.faces.ViewState"
// If a request wants to be sent to a registration that just opened, a new valid ViewState has to be obtained by refreshing the page
// The response to the first registration request will contain a new ViewState, which can be used for the confirmation request

// Set a cookie for future refresh (GET) requests, to prevent being redirected to the window handler page
// To not get redirected to a blank window handler page, the request needs a cookie containing the dsrid value and the ClientWindow id
// The dsrid value can be any 3-digit number, but the ClientWindow id has to be the same as the one in the url
// (note that the cookie name is dsrwid, not dsrid as in the url)
let windowId;
if (document.location.href.includes("dswid")) windowId = document.location.href.match(/dswid=(\d*)/)[1]; // The window handler page may not have the id
const DSRID_VALUE = 1;
document.cookie = `dsrwid-${DSRID_VALUE}=${windowId}`;

// This function "refreshes" the page with a GET request and returns a the document of the response
let getPage = async () => {
	let response = await fetch(document.location.href.replace(/dsrid=\d*/, `dsrid=${DSRID_VALUE}`));
	let pageDocument = new DOMParser().parseFromString(await response.text(), "text/html");
	return pageDocument;
};

// This is the main callback that is run when the extension initiates the registration
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	// Check if the message is a registration request
	if (message.action != "sendRegistration") return;

	// Log the time when the message was received
	console.log(new Date().toLocaleTimeString() + "." + new Date().getMilliseconds() + " - Received registration request...");

	// Continously refresh the page until the register button is found, then get the ViewState and start the registration loop
	// If the button is not found after the stopOffset specified time, the loop will stop
	let { tabId, timestamp, startOffset, stopOffset, maxAttempts, optionId, slot } = message;
	let remainingTime = Math.max(0, timestamp - Date.now() - startOffset);
	setTimeout(async () => {
		// Update the status of the registration task
		// TODO: Move elsewhere
		let updateTask = async () => {
			let task;
			while (!task) {
				task = (await chrome.storage.session.get(tabId.toString()))[tabId];
			}
			if (task.status == "queued") {
				task.status = "running";
				chrome.storage.session.set({ [tabId]: task });
			}
		};
		updateTask();

		// Log the time when the loop started
		console.log(new Date().toLocaleTimeString() + "." + new Date().getMilliseconds() + " - Starting refresh loop...");

		let stopTime = Date.now() + startOffset + stopOffset;
		while (Date.now() < stopTime) {
			// Log that a refresh is being attempted
			console.log("Refreshing page...");

			// Refresh the page and check if the button is on the page
			let pageDocument = await getPage();
			let options = pageDocument.querySelectorAll("#contentInner .groupWrapper");

			let button;
			if (pageType == "lva") button = options[0].querySelector("#registrationForm\\:j_id_6t");
			else button = Array.from(options).find((option) => option.querySelector(`input[id*="${optionId}"]`));

			// If the button was found, extract the ViewState, stop the refresh loop and start the register loop
			if (button) {
				let viewState = pageDocument.querySelector(`input[name="javax.faces.ViewState"]`).value;
				registerLoop(viewState);
				return;
			}
		}

		// Log that the refresh loop timed out
		console.log(new Date().toLocaleTimeString() + "." + new Date().getMilliseconds() + " - Refresh loop timed out, no button found...");

		// Timeout is handled in resultHandler.js
		handleRefreshTimeout();
	}, remainingTime);

	// This function is called when the first valid ViewState is obtained
	// It attempts to send the registration request until it succeeds or the maxAttempts is reached
	// The requests are sent in series
	let registerLoop = async (firstViewState) => {
		// Log the time when the page starts being refreshed
		console.log(new Date().toLocaleTimeString() + "." + new Date().getMilliseconds() + " - Valid ViewState obtained, starting register loop...");

		// Request loop
		let attempts = 0;
		let errors = [];
		let viewState = firstViewState;
		let response;
		let timeStart = Date.now();

		while (attempts < maxAttempts && !response) {
			attempts++;

			// Attempt to send the requests
			try {
				// View state is already valid for first request
				if (attempts > 1) {
					// Log the time
					console.log(new Date().toLocaleTimeString() + "." + new Date().getMilliseconds() + " - Refreshing for new ViewState...");

					// Refresh the page and get the ViewState
					viewState = (await getPage()).querySelector(`input[name="javax.faces.ViewState"]`).value;
				}

				// Throws an error here if the request fails in any way
				response = await sendRequest(viewState, optionId, slot);

				// Log success
				console.log(new Date().toLocaleTimeString() + "." + new Date().getMilliseconds() + " - Registration success with attempt number " + attempts);
			} catch (error) {
				// Log the error
				console.log(new Date().toLocaleTimeString() + "." + new Date().getMilliseconds() + " - Attempt number " + attempts + " failed");
				console.error(error);

				// If the request fails, store the error for later
				errors.push(error.message);
			}
		}

		// Calculate the time it took to finish the loop
		let time = Date.now() - timeStart;

		// Log the time it took to send the requests
		console.log(new Date().toLocaleTimeString() + "." + new Date().getMilliseconds() + ` - Registration loop finished (${time}ms)`);

		// Result is handled in resultHandler.js
		handleResult({
			response,
			tabId,
			attempts,
			errors,
			time,
			optionId
		});
	};

	// Close the message connection
	sendResponse();
});

// Define the endpoints and POST data for the requests
const LVA_ENDPOINT = "https://tiss.tuwien.ac.at/education/course/courseRegistration.xhtml";
const GROUP_ENDPOINT = "https://tiss.tuwien.ac.at/education/course/groupList.xhtml";
const EXAM_ENDPOINT = "https://tiss.tuwien.ac.at/education/course/examDateList.xhtml";
const CONFIRM_ENDPOINT = "https://tiss.tuwien.ac.at/education/course/register.xhtml";

const CONFIRM_DATA = {
	"regForm:j_id_30": "Register",
	regForm_SUBMIT: "1"
};
const LVA_DATA = {
	"registrationForm:j_id_6t": "Register",
	registrationForm_SUBMIT: "1"
};
// The group and exam data needs the id of the option to be inserted
let getGroupData = (groupId) => {
	let data = { groupContentForm_SUBMIT: "1" };
	let idKey = `groupContentForm:${groupId}:j_id_a1`;
	data[idKey] = "Register";
	return data;
};
let getExamData = (examId) => {
	let data = { examDateListForm_SUBMIT: "1" };
	let idKey = `examDateListForm:${examId}:j_id_9u`;
	data[idKey] = "Register";
	return data;
};

// This function attempts to send the two POST requests required to register and returns a promise of the body of the second request
// If any of the requests fail, it will throw an error (caused by the validateResponse function)
let sendRequest = async (viewState, optionId, slot) => {
	// Define the request body
	let bodyData = {
		dspwid: windowId,
		"javax.faces.ClientWindow": windowId,
		"javax.faces.ViewState": viewState
	};

	// Create the body together with the additional required data and define endpoint
	let targetUrl, body;
	if (pageType == "lva") {
		targetUrl = LVA_ENDPOINT;
		body = { ...bodyData, ...LVA_DATA };
	} else if (pageType == "group") {
		targetUrl = GROUP_ENDPOINT;
		body = { ...bodyData, ...getGroupData(optionId) };
	} else if (pageType == "exam") {
		targetUrl = EXAM_ENDPOINT;
		body = { ...bodyData, ...getExamData(optionId) };
	}

	// Define the request payload
	let payload = {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded"
		},
		body: new URLSearchParams(body).toString() // Encode the body as a query string
	};

	// Log the time when the first request is sent
	console.log(new Date().toLocaleTimeString() + "." + new Date().getMilliseconds() + " - Sending register request with body: ", body);

	// Send the first request
	let firstResponse = await fetch(targetUrl, payload);
	validateResponse(firstResponse);
	let pageDocument = new DOMParser().parseFromString(await firstResponse.text(), "text/html");

	// Get the new ViewState from the response and add it to the payload
	bodyData["javax.faces.ViewState"] = pageDocument.querySelector(`input[name="javax.faces.ViewState"]`).value;

	// If the registration option has slots, get the slot id from the response and add it to the payload
	if (slot) {
		let slotOptions = pageDocument.querySelectorAll(`select[id="regForm:subgrouplist"] option`);
		let option = Array.from(slotOptions).find((option) => option.textContent.includes(slot[0]) && option.textContent.includes(slot[1]));
		bodyData["regForm:subgrouplist"] = option.value;
	}

	// Update the body with the new data and encode it
	payload.body = new URLSearchParams({ ...bodyData, ...CONFIRM_DATA }).toString();

	// Log the time when the second request is sent
	console.log(new Date().toLocaleTimeString() + "." + new Date().getMilliseconds() + " - Sending confirm request with body: ", { ...bodyData, ...CONFIRM_DATA });

	// Send the second request
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
