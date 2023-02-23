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

let showTasks = async () => {
	let taskOutput = document.getElementById("tasks");
	taskOutput.textContent = "";

	let tasks = await chrome.storage.session.get(null);
	let taskList = Object.values(tasks).sort((a, b) => a.created - b.created);
	Object.values(taskList).forEach((task) => {
		// Remove if expired
		if (task.expiry < Date.now()) {
			chrome.storage.session.remove(task.tabId.toString());
			return;
		}

		taskOutput.textContent += `[${task.status}] ${task.lva}\n${task.name} (${Math.round((task.target - Date.now()) / 1000)}s)\n`;
	});
};

// Bind task update callback
chrome.storage.onChanged.addListener((changes, area) => {
	if (area == "session") showTasks();
});
