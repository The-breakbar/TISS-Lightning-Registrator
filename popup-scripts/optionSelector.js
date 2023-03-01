// This file updates the option and slot selectors of the popup
// The selected options contain the relevant ids and slot times for the registration as the values
// The option id is stored as the html id of the option, the slot time is stored as "start,end"
// If a selector has not been selected, the value is an empty string

let optionSelect = document.getElementById("option-select");

// Add the registration options to the selector when the popup is opened
let initOptionSelector = () => {
	// Reveal selector section
	document.querySelector(`section[name="register"]`).hidden = false;

	// Filter out any options which already started and are not available anymore (getAccurateStartTime is defined in registerButton.js)
	pageInfo.options = pageInfo.options.filter((option) => !(getAccurateStartTime(option.start) < new Date() && !option.available));
	// Filter out any options which are already registered or full
	pageInfo.options = pageInfo.options.filter((option) => {
		console.log(option);
		let full;
		if (option.participants != "unlimited") {
			let current = parseInt(option.participants.split("/")[0]);
			let max = parseInt(option.participants.split("/")[1]);
			full = current >= max;
		}
		return !option.registered && !full;
	});

	// If there are no options left, show a message
	if (pageInfo.options.length == 0) {
		document.querySelector(`section[name="info"] p[name="no-options"]`).hidden = false;
		return;
	}

	// If the options are valid, enable the option selector
	optionSelect.disabled = false;

	// Insert the registration options
	pageInfo.options.forEach((option) => {
		// Create option element
		let optElement = document.createElement("option");
		optElement.value = option.id; // Option value is just the id
		optElement.textContent = option.name;

		// Add the date for exam options to be able to distinguish them
		if (pageType == "exam") optElement.textContent += ` (${option.date})`;

		// Add the option to the select
		optionSelect.appendChild(optElement);
	});
};

// If option is selected, check if it has slots and add them to the slot selector
optionSelect.addEventListener("change", (event) => {
	// Determine the selected option
	let optionId = event.target.value;
	let optionInfo = pageInfo.options.find((option) => option.id == optionId);

	let slotSelect = document.getElementById("slot-select");
	if (optionInfo?.slots) {
		// Show the slot selector if the option has slots
		slotSelect.hidden = false;

		// Remove all options
		while (slotSelect.firstChild) {
			slotSelect.removeChild(slotSelect.firstChild);
		}

		// Add a prompt option
		let prompt = document.createElement("option");
		prompt.textContent = "Select a slot";
		prompt.value = "";
		prompt.selected = true;
		prompt.hidden = true;
		slotSelect.appendChild(prompt);

		// Add the slots to the select
		optionInfo.slots.forEach((slot) => {
			let slotOption = document.createElement("option");
			slotOption.value = slot.start + "," + slot.end; // Option value is start and end time separated by a comma
			slotOption.textContent = slot.start + " - " + slot.end;
			slotSelect.appendChild(slotOption);
		});
	} else {
		// Hide the slot selector if the option has no slots
		slotSelect.hidden = true;
	}
});
