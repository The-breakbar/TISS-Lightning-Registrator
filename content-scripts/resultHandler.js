// The script will send a message with the following format when it is done:
// {
// 	action: "sendRegistrationResponse"
// 	success: Boolean indicating if the registration was successful
// 	attempts: Number of attempts it took to send the request
// 	errors: Array of errors that occurred during the request loop
// 	time: Time it took to send the requests in milliseconds
// }

// This is a content script responsible for handling the results of the registration attempts
let handleResult = async (message) => {
	let { response, attempts, errors, time, optionId } = message;

	// Get the count of already registered students
	let pageDocument = await getPage();
	let options = pageDocument.querySelectorAll("#contentInner .groupWrapper");
	let numberString = Array.from(options)
		.find((option) => pageType == "lva" || option.querySelector(`input[id*="${optionId}"]`))
		.querySelector(`span[id*="members"]`).innerText;
	let number = numberString.split("/")[0].trim();

	// Debug
	if (response) console.log("Registered as number " + number);

	// Send the response to the popup
	chrome.runtime.sendMessage({
		action: "sendRegistrationResponse",
		success: true,
		attempts,
		errors,
		time,
		number
	});
};

let handleRefreshTimeout = async () => {};
