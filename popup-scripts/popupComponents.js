// This file creates the components for the task elements and info messages

const STATUS_TEXT = {
	queued: "Queued",
	running: "Running...",
	success: "Success",
	failure: "Failure"
};

// Creates a task element for the given task
// A task element has the following structure:
// <div class="task">
// 	<h3>Queued <span>(header status text)</span></h3>
// 	<div class="task-content">(LVA name)</div>
// 	<div class="task-content">(Registration option name, slot and date for exams)</div>
// </div>

let getTaskElement = (task) => {
	// Define element and classes
	let element = document.createElement("div");
	element.classList.add("task");
	if (task.status == "success") element.classList.add("success");
	else if (task.status == "failure") element.classList.add("failure");
	else if (task.status == "running") element.classList.add("warning");

	// Create the header
	let header = document.createElement("h3");
	let headerStatus = document.createElement("span");
	header.textContent = STATUS_TEXT[task.status] + " ";

	// Add the status text depending on the status
	if (task.status == "queued") {
		// Queued status is how long until the registration opens
		setCountdown(headerStatus, task.timestamp);
	} else if (task.status == "success") {
		// Success status is the time it took and the place number
		headerStatus.textContent = `${task.time}ms | Number ${task.number} (or lower)`;
	} else if (task.status == "failure") {
		// Failure status is the error message
		headerStatus.textContent = task.error;
	}
	header.appendChild(headerStatus);
	element.appendChild(header);

	// Create lva name element
	let lvaName = document.createElement("div");
	lvaName.classList.add("task-content");
	lvaName.textContent = task.lva;
	element.appendChild(lvaName);

	// Create registration option name element
	let optionName = document.createElement("div");
	optionName.classList.add("task-content");
	optionName.textContent = task.name;
	// Add the slot and date if it is an exam
	if (task.date != undefined) {
		let slotText = task.slot ? `${task.slot.join("-")}, ` : "";
		optionName.textContent += ` (${slotText}${task.date})`;
	}
	element.appendChild(optionName);

	return element;
};

// Creates a countdown element for the given time
let setCountdown = (element, time) => {
	let countdown = Math.max(0, Math.round((time - Date.now()) / 1000));
	if (countdown > 0) {
		element.textContent = `starting in ${countdown}s`;
		setTimeout(() => setCountdown(element, time), 1000);
	} else {
		element.textContent = "refreshing page...";
	}
};
