let updateOptions = () => {
	// Add select options
	// Add options to select element
	let select = document.getElementById("idselect");
	pageInfo.options.forEach((option) => {
		let opt = document.createElement("option");
		opt.value = option.id;
		opt.textContent = option.name;
		if (pageType == "exam") opt.textContent += ` (${option.date})`;
		select.appendChild(opt);
	});
};

// Bind slot selection callback
document.getElementById("idselect").addEventListener("change", (event) => {
	let optionId = event.target.value;
	let optionInfo = pageInfo.options.find((option) => option.id == optionId);
	let slotSelect = document.getElementById("slotselect");
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
