const client = typeof browser === "undefined" ? chrome : browser;

// Set access level to allow content scripts to access session storage
//client.storage.local.setAccessLevel({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" });

// Remove tasks if their tab is closed or updated
// Success and failed tasks don't need to be removed, as they are already finished and will expire
let removeTask = async (tabId) => {
	let task = (await client.storage.local.get(tabId.toString()))[tabId];
	if (task?.status == "success" || task?.status == "failure") return;
	client.storage.local.remove(tabId.toString());
};
client.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (changeInfo.status == "loading") removeTask(tabId);
});
client.tabs.onRemoved.addListener(async (tabId, removeInfo) => removeTask(tabId));

// Remove all tasks when the browser starts (to ignore tasks from previous sessions)
client.runtime.onStartup.addListener(async () => {
	let tasks = await client.storage.local.get(null);
	for (let task in tasks) {
		client.storage.local.remove(task);
	}
});
