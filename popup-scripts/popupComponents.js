// This file creates the components for the task elements and info messages

// Creates a task element for the given task
let getTaskElement = (task) => {
	// Define element and classes
	let taskElement = document.createElement("div");
	taskElement.classList.add("task");
	if (task.status == "success") taskElement.classList.add("success");
	else if (task.status == "failure") taskElement.classList.add("failure");
	else if (task.status == "running") taskElement.classList.add("warning");

	let taskText = {
		queued: "Queued",
		running: "Running...",
		success: "Success",
		failure: "Failure"
	};

	// Header
	let taskHeader = document.createElement("h3");
	let taskHeaderStatus = document.createElement("span");
	taskHeader.textContent = taskText[task.status] + " ";
	if (task.status == "queued") {
		taskHeaderStatus.textContent = `starting in ${Math.max(0, Math.round((task.target - Date.now()) / 1000))}s`;
	} else if (task.status == "success") {
		taskHeaderStatus.textContent = `${task.time}ms | Number ${task.number} (or lower)`;
	}
	taskHeader.appendChild(taskHeaderStatus);
	taskElement.appendChild(taskHeader);

	// LVA and registration option
	let taskContentLVA = document.createElement("div");
	taskContentLVA.classList.add("task-content");
	taskContentLVA.textContent = task.lva;
	taskElement.appendChild(taskContentLVA);

	let taskContentName = document.createElement("div");
	taskContentName.classList.add("task-content");
	taskContentName.textContent = task.name;
	if (task.date != undefined) {
		let slotText = task.slot ? `${task.slot.join("-")}, ` : "";
		taskContentName.textContent += ` (${slotText}${task.date})`;
	}
	taskElement.appendChild(taskContentName);

	return taskElement;
};

// Creates an info message element
let getInfoMessage = (type, text) => {
	let infoMessage = document.createElement("p");
	infoMessage.textContent = "There are no valid registration options available on this page.";
	infoMessage.classList.add("info-text");
	infoMessage.classList.add(type);
	return infoMessage;
};
