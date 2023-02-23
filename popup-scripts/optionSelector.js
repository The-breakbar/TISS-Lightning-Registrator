// Bind slot selection callback
document.getElementById("option-select").addEventListener("change", (event) => {
	let optionId = event.target.value;
	let optionInfo = pageInfo.options.find((option) => option.id == optionId);
	let slotSelect = document.getElementById("slot-select");
	// Remove all options
	while (slotSelect.firstChild) {
		slotSelect.removeChild(slotSelect.firstChild);
	}
	// Add options to select element
	if (optionInfo.slots) {
		optionInfo.slots.forEach((slot) => {
			let opt = document.createElement("option");
			opt.value = slot.start + "," + slot.end;
			opt.textContent = slot.start + " - " + slot.end;
			slotSelect.appendChild(opt);
		});
	}
});
