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

let showTasks = () => {
	let taskOutput = document.getElementById("tasks");
	taskOutput.textContent = "";

	chrome.storage.session.get(null).then((tasks) => {
		Object.values(tasks).forEach((task) => {
			taskOutput.textContent += `[${task.status}] ${task.lva}\n${task.name} (${Math.round((task.target - Date.now()) / 1000)}s)\n`;
		});
	});
};

// Bind task update callback
chrome.storage.onChanged.addListener((changes, area) => {
	if (area == "session") showTasks();
});
