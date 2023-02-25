// This file updates the option and slot selectors of the popup
// The selected options contain the relevant ids and slot times for the registration as the values
// The option id is stored as the html id of the option, the slot time is stored as "start,end"
// If a selector has not been selected, the value is an empty string

// Add the registration options to the selector when the popup is opened
let initOptionSelector = () => {
	// Insert select prompt element
	let prompt = document.createElement("option");
	prompt.textContent = "Select a registration option";
	prompt.value = "";
	prompt.selected = true;
	prompt.hidden = true;
	document.getElementById("option-select").appendChild(prompt);

	// Insert the registration options
	pageInfo.options.forEach((option) => {
		// Create option element
		let optElement = document.createElement("option");
		optElement.value = option.id; // Option value is just the id
		optElement.textContent = option.name;

		// Add the date for exam options to be able to distinguish them
		if (pageType == "exam") optElement.textContent += ` (${option.date})`;

		// Add the option to the select
		document.getElementById("option-select").appendChild(optElement);
	});
};

// If option is selected, check if it has slots and add them to the slot selector
document.getElementById("option-select").addEventListener("change", (event) => {
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
