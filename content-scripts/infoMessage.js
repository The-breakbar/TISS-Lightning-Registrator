// This content script shows a small message in the bottom right corner of the page
// It is used to show the user that the extension is active and displays the status of the registration in that tab
// The styles for the element are defined in infoMessageStyle.css which is also injected into the page
const STATUS_TEXT = {
	queued: "Queued",
	running: "Running...",
	success: "Success",
	failure: "Failure"
};

chrome.storage.onChanged.addListener((changes, area) => {
	if (area != "session") return;

	// If the update is for this tab, update the message (tabId is from sendRegistration.js)
	if (!changes[tabId]?.newValue) return;
	let task = changes[tabId].newValue;

	// Remove previous element
	let old = document.getElementById("LightningRegistratorInfoPopup");
	if (old) old.remove();

	// Info element
	let element = document.createElement("div");
	element.id = "LightningRegistratorInfoPopup";
	if (task.status == "success") element.classList.add("LightningRegistratorSuccess");
	else if (task.status == "failure") element.classList.add("LightningRegistratorFailure");
	else if (task.status == "running") element.classList.add("LightningRegistratorWarning");

	// Status header
	let status = document.createElement("h3");
	status.textContent = STATUS_TEXT[task.status];
	element.appendChild(status);

	// Status message
	let message = document.createElement("div");
	if (task.status == "queued") {
		setCountdown(message, task.timestamp);
	} else if (task.status == "success") {
		message.textContent = `Refresh the page to see`;
	} else if (task.status == "failure") {
		message.textContent = `Error: ${task.error}`;
	} else if (task.status == "running") {
		message.textContent = `Sending registration`;
	}
	element.appendChild(message);

	// Add the element to the page
	document.body.appendChild(element);
});

// Creates a countdown element for the given time
let setCountdown = (element, time) => {
	let countdown = Math.max(0, Math.round((time - Date.now()) / 1000));
	if (countdown > 0) {
		element.textContent = `Starting in ${countdown}s`;
		setTimeout(() => setCountdown(element, time), 1000);
	} else {
		element.textContent = "Refreshing page...";
	}
};
