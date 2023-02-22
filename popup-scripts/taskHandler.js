// Bind callback for clearing button
document.getElementById("clear-storage").addEventListener("click", () => {
	chrome.storage.local.clear();
});

// Remove expired registration tasks
// let tasks = (await chrome.storage.local.get("tasks")).tasks ?? [];
chrome.storage.local.get("tasks").then((result) => {
	let tasks = result.tasks ?? [];
	tasks = tasks.filter((registration) => registration.expiry > Date.now());
	chrome.storage.local.set({ tasks });

	// Show registration tasks
	let taskOutput = document.getElementById("tasks");
	tasks.forEach((task) => {
		taskOutput.textContent += `${task.lva}\n${task.name} (${Math.round((task.target - Date.now()) / 1000)}s)\n`;
	});
});
