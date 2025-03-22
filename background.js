const client = typeof browser === "undefined" ? chrome : browser;

// Local storage schema:
// {
// 	"tasks": { *contains all active tasks* },
// 	"settings": { *contains all settings* }
// }

// Set default storage values if they don't exist
client.storage.local.get("tasks").then((result) => {
	if (!result.tasks) {
		client.storage.local.set({ tasks: {} });
	}
});

client.storage.local.get("settings").then((result) => {
	if (!result.settings) {
		client.storage.local.set({ settings: {} });
	}
});

// Remove tasks if their tab is closed or updated
// Success and failed tasks don't need to be removed, as they are already finished and will expire
let removeTask = async (tabId) => {
	let currentTasks = (await client.storage.local.get("tasks")).tasks;
	let task = currentTasks[tabId.toString()];
	if (task?.status == "success" || task?.status == "failure") return;
	delete currentTasks[tabId.toString()];
	await client.storage.local.set({ tasks: currentTasks });
};
client.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (changeInfo.status == "loading") removeTask(tabId);
});
client.tabs.onRemoved.addListener(async (tabId, removeInfo) => removeTask(tabId));
