// Registration tasks are an internal representation of a registration attempt
// They are not connected with the registration attempt, they only show the latest status of the registration (and thus can be inaccurate)
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

let showTaskElements = async () => {
	let taskOutput = document.getElementById("tasks");
	taskOutput.textContent = "";

	let tasks = await chrome.storage.session.get(null);
	let taskList = Object.values(tasks).sort((a, b) => a.created - b.created);
	let tasksToRemove = taskList.filter((task) => task.expiry < Date.now()).map((task) => task.tabId.toString());

	// If there are any tasks that have expired, remove them
	// Return early because the removal will trigger this callback again
	if (tasksToRemove.length > 0) {
		chrome.storage.session.remove(tasksToRemove);
		return;
	}

	taskList.forEach((task) => {
		taskOutput.textContent += `[${task.status}] ${task.lva}\n${task.name} (${Math.round((task.target - Date.now()) / 1000)}s)\n`;
	});
};

// Bind update callback which will be triggered every time a task is added/updated/removed
chrome.storage.onChanged.addListener((changes, area) => {
	if (area == "session") showTaskElements();
});
