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
studyCodeInput.addEventListener("input", () => {
	if (!studyCodeInput.value) {
		studyCodeInput.classList.remove("correct");
		studyCodeInput.classList.remove("incorrect");
		return;
	}

	let valid = studyCodeInput.value.match(/^[0-9]{6}$/);
	if (valid) {
		studyCodeInput.classList.remove("incorrect");
		studyCodeInput.classList.add("correct");
	} else {
		studyCodeInput.classList.remove("correct");
		studyCodeInput.classList.add("incorrect");
	}
});
