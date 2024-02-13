let button = document.querySelector("#register-button");
let select = document.querySelector("#option-select");
let task2 = document.querySelector("#task2");
let task3 = document.querySelector("#task3");

document.addEventListener("keydown", function (event) {
	if (event.key === "1") {
		// Before starting a registration, green button with "LVA-Anmeldung" selected
		task2.hidden = true;
		task3.hidden = true;

		button.disabled = false;
		let option = document.createElement("option");
		option.value = "lva";
		option.text = "LVA-Anmeldung";
		select.appendChild(option);
		select.disabled = false;
		select.selectedIndex = 1;
	} else if (event.key === "2") {
		// After a registration has been queued, button and select disabled

		task2.hidden = false;
		task3.hidden = true;

		button.disabled = true;
		select.disabled = true;

		select.querySelectorAll("option").forEach((option) => {
			if (option.value !== "default") {
				option.remove();
			}
		});
	} else if (event.key === "3") {
		// After a registration has been completed, button and select disabled

		task2.hidden = true;
		task3.hidden = false;

		button.disabled = true;
		select.disabled = true;

		select.querySelectorAll("option").forEach((option) => {
			if (option.value !== "default") {
				option.remove();
			}
		});
	}
});
