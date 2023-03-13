// This file updates the option and slot selectors of the popup, showing relevant messages based on the selection
// The selected options contain the relevant ids and slot times for the registration as the values
// The option id is stored as the html id of the option, the slot time is stored as "start,end"
// If a selector has not been selected, the value is an empty string

let optionSelect = document.getElementById("option-select");

// Main function which is called after the page info is received
// Adds the registration options to the selector and shows relevant info messages
let initOptionSelector = async () => {
	// Reveal selector section
	document.querySelector(`section[name="register"]`).hidden = false;

	// Check if there is already an ongoing registration task in this tab
	let ongoingTask = (await chrome.storage.session.get(tabId.toString()))[tabId];
	let finished = ongoingTask?.status == "success" || ongoingTask?.status == "failure";
	if (ongoingTask && !finished) {
		// Show a message
		document.getElementById("info-ongoing-task").hidden = false;
		return;
	}

	// Filter out any options which have no start time, are already registered or full
	pageInfo.options = pageInfo.options.filter((option) => {
		let full;
		if (option.participants != "unlimited") {
			let current = parseInt(option.participants.split("/")[0]);
			let max = parseInt(option.participants.split("/")[1]);
			full = current >= max;
		}
		return option.start && !option.registered && !full;
	});

	// Filter out any options which have already opened and are not available anymore
	pageInfo.options = pageInfo.options.filter((option) => !(option.start < new Date() && !option.available));

	// If there are no options left, show a message
	if (pageInfo.options.length == 0) {
		document.getElementById("info-no-options").hidden = false;
		return;
	}

	// If the options are valid, enable the option selector
	optionSelect.disabled = false;

	// If it's group options, determine if they have different block values
	let differentBlocks = pageInfo.options.some((option) => option.block != pageInfo.options[0].block);

	// Insert the registration options
	let parent = optionSelect;
	let lastBlock;
	pageInfo.options.forEach((option) => {
		// Create option element
		let optElement = document.createElement("option");
		optElement.value = option.id; // Option value is just the id
		optElement.textContent = option.name;

		// Add the date for exam options to be able to distinguish them
		if (pageType == "exam") optElement.textContent += ` (${option.date})`;

		// Add the option to the select (with an optgroup if there are different blocks)
		if (!differentBlocks) {
			parent.appendChild(optElement);
		} else {
			// If the block is different, create a new optgroup
			if (option.block != lastBlock) {
				let optGroup = document.createElement("optgroup");
				optGroup.label = option.block;
				optionSelect.appendChild(optGroup);
				parent = optGroup;
			}
			parent.appendChild(optElement);
			lastBlock = option.block;
		}
	});
};

// Called when a new option is selected
// This handled the relevant messages and adds the slots of the option has any
optionSelect.addEventListener("change", (event) => {
	// Determine the selected option (undefined if it's an lva option)
	let optionId = event.target.value;
	let optionInfo = pageInfo.options.find((option) => option.id == optionId);

	// Remove all current slots
	let slotSelect = document.getElementById("slot-select");
	while (slotSelect.firstChild) {
		slotSelect.removeChild(slotSelect.firstChild);
	}

	// If no slot, hide the slot selector
	if (!optionInfo?.slots) {
		slotSelect.hidden = true;
		return;
	}

	// If there are slots, reveal the slot selector
	slotSelect.hidden = false;

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
});
