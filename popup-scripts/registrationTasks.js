chrome.runtime.sendMessage({ action: "getRegistrationTasks" }).then((tasks) => {
	// Show registration tasks
	let taskOutput = document.getElementById("tasks");
	tasks.forEach((task) => {
		taskOutput.textContent += `[${task.status}] ${task.lva}\n${task.name} (${Math.round((task.target - Date.now()) / 1000)}s)\n`;
	});
});
