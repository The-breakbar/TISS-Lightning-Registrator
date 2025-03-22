// This file handles the display of registration tasks and the removal of expired tasks
// Registration tasks are an internal representation of a registration attempt
// They are not connected with the registration attempt, they only show the latest status update of the attempt
// They are stored in the local storage and are removed when they expire

// A task is stored with the following structure:
// {
//  tabId : Id of the tab that the registration is running in
//  status : Status of the registration (queued, running, success, failure)
//  lva : Name of the LVA
//  name : Name of the registration option
//  date : Date of the registration option (only for exams)
//  slot : Slot of the registration option (only for exams)
//  timestamp : Time when the registration opens
//  expiry : Time when the registration task expires, incase any errors occur
//  number : The place number of the registration (if successful)
//  time : How long the registration took (if successful)
//  error : Error message (if failed)
// }

const client = typeof browser === "undefined" ? chrome : browser;
let activeTimeouts = {};

// When the popup is opened, remove expired tasks and set up timeouts for the remaining tasks
// The timeouts will remove the tasks from local storage when they expire
// This will cause the popup to update and remove the task from the list
let initTaskRemovalTimeouts = async () => {
	// Remove expired tasks from local storage
	let currentTasks = (await client.storage.local.get("tasks")).tasks;
	Object.keys(currentTasks).forEach((key) => {
		let task = currentTasks[key];
		if (task.expiry < Date.now()) {
			delete currentTasks[key];
		}
	});
	await client.storage.local.set({ tasks: currentTasks });

	// Set up the timeouts for the remaining tasks
	Object.values(currentTasks).forEach((task) => {
		addTaskTimeout(task);
	});

	// Redraw the task elements
	showTaskElements();
};

// Draws the task elements in the popup
let showTaskElements = async () => {
	let taskOutput = document.querySelector(`section[name="tasks"]`);

	// Get all current tasks
	let currentTasks = (await client.storage.local.get("tasks")).tasks;
	let taskList = Object.values(currentTasks).sort((a, b) => a.created - b.created);

	// Clear all elements with the task class
	let taskElements = taskOutput.querySelectorAll(".task");
	taskElements.forEach((element) => element.remove());

	// Add task elements
	taskList.forEach((task) => {
		taskOutput.appendChild(getTaskElement(task));
	});
};

let addTaskTimeout = async (task) => {
	// Set the timeout for the task
	activeTimeouts[task.tabId] = setTimeout(async () => {
		// Remove the task from local storage
		let currentTasks = (await client.storage.local.get("tasks")).tasks;
		delete currentTasks[task.tabId];
		await client.storage.local.set({ tasks: currentTasks });

		// Remove from timeouts
		delete activeTimeouts[task.tabId];
	}, task.expiry - Date.now());
};

// Bind storage update callback which will be triggered every time a task is added/updated/removed
// Redraws the task elements and updates the removal timeouts
client.storage.onChanged.addListener((changes, area) => {
	if (area != "local") return;

	// If the update is not for tasks, return
	if (!changes.tasks) return;

	// Redraw the task elements
	showTaskElements();

	Object.keys(changes.tasks.newValue).forEach((key) => {
		let task = changes.tasks.newValue[key];

		// Added
		if (changes.tasks.oldValue == undefined) {
			addTaskTimeout(task);
		}

		// Updated
		else if (changes.tasks.oldValue[key] != undefined) {
			// If the task was updated, clear the old timeout and set a new one
			clearTimeout(activeTimeouts[key]);
			addTaskTimeout(task);
		}
	});

	Object.keys(changes.tasks.oldValue).forEach((key) => {
		let task = changes.tasks.oldValue[key];

		// Removed
		if (changes.tasks.newValue == undefined) {
			clearTimeout(activeTimeouts[key]);
			delete activeTimeouts[key];
		}
	});
});
