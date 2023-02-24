// This file handles the display of registration tasks and the removal of expired tasks
// Registration tasks are an internal representation of a registration attempt
// They are not connected with the registration attempt, they only show the latest status update of the attempt
// They are stored in the session storage and are removed when they expire

// A task is stored with the following structure:
// {
//  tabId : Id of the tab that the registration is running in
//  status : Status of the registration (queued, running, success, failed)
//  lva : Name of the LVA
//  name : Name of the registration option
//  target : Time when the registration opens
//  expiry : Time when the registration task expires, incase any errors occur
//  number : The place number of the registration (if successful)
//  time : How long the registration took (if successful)
// }

let activeTimeouts = {};

// When the popup is opened, remove expired tasks and set up timeouts for the remaining tasks
// The timeouts will remove the tasks from the session storage when they expire
// This will cause the popup to update and remove the task from the list
let initTaskRemovalTimeouts = async () => {
	let taskList = Object.values(await chrome.storage.session.get(null));
	let tasksToRemove = taskList.filter((task) => task.expiry < Date.now()).map((task) => task.tabId.toString());

	// If there are any tasks that have expired, remove them
	await chrome.storage.session.remove(tasksToRemove);

	// Set up the timeouts for the remaining tasks
	taskList.forEach((task) => {
		activeTimeouts[task.tabId] = setTimeout(() => {
			chrome.storage.session.remove(task.tabId.toString());
		}, task.expiry - Date.now());
	});

	// Redraw the task elements
	showTaskElements();
};

// Draws the task elements in the popup
let showTaskElements = async () => {
	let taskOutput = document.getElementById("tasks");
	taskOutput.textContent = "";

	// Get all current tasks
	let tasks = await chrome.storage.session.get(null);
	let taskList = Object.values(tasks).sort((a, b) => a.created - b.created);

	// Add text for each task
	taskList.forEach((task) => {
		let firstLine = `[${task.status}] ${task.lva}`;
		let taskInfo = task.status == "success" ? `(${task.time}ms) (place ${task.number})` : `(${Math.max(0, Math.round((task.target - Date.now()) / 1000))}s remaining)`;
		let secondLine = `${task.name} ${taskInfo}`;
		taskOutput.textContent += `${firstLine}\n${secondLine}\n`;
	});
};

// Bind storage update callback which will be triggered every time a task is added/updated/removed
// Redraws the task elements and updates the removal timeouts
chrome.storage.onChanged.addListener((changes, area) => {
	if (area == "session") showTaskElements();

	// Check what kind of change was made to each task
	Object.keys(changes).forEach((key) => {
		// If a task was removed, clear the timeout
		if (changes[key].newValue == undefined) {
			clearTimeout(activeTimeouts[key]);
			delete activeTimeouts[key];
		}

		// If a task was added, set the timeout
		else if (changes[key].oldValue == undefined) {
			activeTimeouts[key] = setTimeout(() => {
				chrome.storage.session.remove(key);
			}, changes[key].newValue.expiry - Date.now());
		}

		// If the expiry of a task was updated, clear the old timeout and set a new one
		else if (changes[key].newValue.expiry != changes[key].oldValue.expiry) {
			clearTimeout(activeTimeouts[key]);
			activeTimeouts[key] = setTimeout(() => {
				chrome.storage.session.remove(key);
			}, changes[key].newValue.expiry - Date.now());
		}
	});
});
