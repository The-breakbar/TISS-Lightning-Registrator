// Set access level to allow content scripts to access session storage
chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" });

// Remove tasks if their tab is closed or updated
// Success and failed tasks don't need to be removed, as they are already finished and will expire
let removeTask = async (tabId) => {
	let task = (await chrome.storage.session.get(tabId.toString()))[tabId];
	if (task?.status == "success" || task?.status == "failure") return;
	chrome.storage.session.remove(tabId.toString());
};
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (changeInfo.status == "loading") removeTask(tabId);
});
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => removeTask(tabId));
