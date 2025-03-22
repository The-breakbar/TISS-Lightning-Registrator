// This script handles the settings UI, input and validation

// Toggling of settings button
let settingsButton = document.getElementById("settings-button");
let settingsHidden = true;
settingsButton.addEventListener("click", () => {
	settingsHidden = !settingsHidden;
	if (settingsHidden) {
		document.getElementById("settings-container").hidden = true;
		settingsButton.innerText = "▼ Show advanced settings";
	} else {
		document.getElementById("settings-container").hidden = false;
		settingsButton.innerText = "▲ Hide advanced settings";
	}
});

// Study code input validation
let studyCodeInput = document.getElementById("study-code-input");
studyCodeInput.addEventListener("input", async () => {
	let settings = (await client.storage.local.get("settings")).settings;

	if (!studyCodeInput.value) {
		settings.studyCode = undefined;
		studyCodeInput.classList.remove("correct");
		studyCodeInput.classList.remove("incorrect");
	} else if (studyCodeInput.value.match(/^[0-9]{6}$/)) {
		settings.studyCode = studyCodeInput.value;
		studyCodeInput.classList.remove("incorrect");
		studyCodeInput.classList.add("correct");
	} else {
		settings.studyCode = undefined;
		studyCodeInput.classList.remove("correct");
		studyCodeInput.classList.add("incorrect");
	}

	// Save the settings
	await client.storage.local.set({ settings });
});

// Load settings from local storage
client.storage.local.get("settings").then((result) => {
	if (result.settings.studyCode) {
		studyCodeInput.value = result.settings.studyCode;
		studyCodeInput.classList.add("correct");
	}
});
