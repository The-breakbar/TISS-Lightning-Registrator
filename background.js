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
