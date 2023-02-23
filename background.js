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

chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" });

let removeTask = async (tabId) => {
	let tasks = (await chrome.storage.session.get("tasks")).tasks || [];
	tasks = tasks.filter((task) => task.tabId != tabId);
	chrome.storage.session.set({ tasks });
};

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	removeTask(tabId);
});

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
	removeTask(tabId);
});
