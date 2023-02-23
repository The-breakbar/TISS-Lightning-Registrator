// Task:
// {
//  tabId : Id of the tab that the registration is running in
//  status : Status of the registration (queued, running, success, failed)
//  lva : Name of the LVA
//  name : Name of the registration option
//  target : Time when the registration opens
//  expiry : Time when the registration task expires, incase any errors occur
//  number : The place number of the registration
//  time : How long the registration took
// }

// Service worker to manage active registration tasks
let tasks = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action == "addRegistrationTask") {
		addTask(message);
		sendResponse();
	} else if (message.action == "getRegistrationTasks") {
		tasks = tasks.filter((task) => task.expiry > Date.now());
		sendResponse(tasks);
	} else if (message.action == "updateRegistrationTask") {
		updateTask(message);
		sendResponse();
	}
});

// Add a new registration task
let addTask = ({ task }) => {
	tasks.unshift(task);
};

// Update an existing registration task
let updateTask = ({ task }) => {
	// Find the task with the same tabId
	// Then take all the values from task and overwrite the existing task
	let index = tasks.findIndex((t) => t.tabId == task.tabId);
	tasks[index] = { ...tasks[index], ...task };
};
