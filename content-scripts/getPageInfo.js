// This is a content script responsible for extracting the relevant information from the registration pages
// It also handles the time zone conversion of the registration dates
// The following message format is required:
// {
//  action: "getPageInfo"
// }

// The response will return the following values (some values may be undefined, depending on the page type):
// lvaNumber : LVA number
// lvaName : LVA name
// lvaSemester : LVA Semester
// options[] : All available LVA/group/exam registration options (array)
//   option.name : Name of registration option
//   option.date : Date of option (only for exams)
//   option.start : Start date of registration (as timestamp) (may be undefined)
//   option.available : If registration is already available (boolean)
//   option.registered: If the user is already registered for this option (boolean)
//   option.id : Html id of the option (only for groups and exams)
//   option.participants : Registered/available participants ("unlimited" if no limit)
//   option.block : The name of the block to which the option belongs (only for groups)
//   option.slots[] : Available timeslots for exams (only for exams, may be undefined) (array)
//     option.slot.date : Date of slot
//     option.slot.start : Start time of slot
//     option.slot.end : End time of slot
//     option.slot.participants : Registered/available participants

// Determine page type (this variable is accessible from all other content scripts)
let pageType;
if (/courseRegistration/.test(window.location.href)) pageType = "lva";
else if (/groupList/.test(window.location.href)) pageType = "group";
else if (/examDate/.test(window.location.href)) pageType = "exam";

// Remove click event listeners of the exam expand button and replace it with an alert
// Expanding the exam list will change the ids of the exam options, which will make any ongoing registrations fail
let expandElement = document.getElementById("examDateListForm:loadAllExamsLink");
if (expandElement) {
	let expandElement = document.getElementById("examDateListForm:loadAllExamsLink");
	expandElement.removeAttribute("onclick");
	let expandElementClone = expandElement.cloneNode(true);
	expandElement.parentNode.replaceChild(expandElementClone, expandElement);

	// Add new click event listener
	expandElementClone.onclick = () => {
		alert(
			`TISS Lightning Registrator Extension\n\n` +
				`The extension has disabled the functionality of the expand button. It can lead to unexpected behaviour if it is clicked while a registration is ongoing.\n\n` +
				`If you want to expand the list, please temporarily disable the extension and reload the page. After you are done, you can re-enable the extension.`
		);
	};
}

// Create object to store page info and bind main callback to message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	// Check if the message is a request to get page info
	if (message.action != "getPageInfo") return;

	sendResponse(gatherPageInfo());
});

// Extracts the relevant information from the page and stores it in the pageInfo object
let gatherPageInfo = () => {
	let pageInfo = {};

	// All elements are wrapped in a div with the id "contentInner"
	// LVA number from the main header
	pageInfo.lvaNumber = document.querySelector("#contentInner h1 span").textContent.trim();

	// LVA name from the main header, however the span containing the number and the dropdown menu have to be removed first
	let headerCopy = document.querySelector("#contentInner h1").cloneNode(true);
	Array.from(headerCopy.children).forEach((child) => child.remove());
	pageInfo.lvaName = headerCopy.textContent.trim();

	// LVA nemester from the dropdown menu (the selected option)
	pageInfo.lvaSemester = document.querySelector(`#contentInner h1 option[selected="selected"]`).value;

	// Iterate over all registration options (the expandable elements)
	let optionNodes = document.querySelectorAll("#contentInner .groupWrapper");
	pageInfo.options = [];
	optionNodes.forEach((element) => {
		let optionInfo = {};

		// Check if the register button is available
		optionInfo.available = ["Register", "Anmelden"].includes(element.querySelector(`input[type="submit"]`)?.value);

		// Check if the option is already registered
		optionInfo.registered = ["Deregistration", "Abmelden"].includes(element.querySelector(`input[type="submit"]`)?.value);

		// Option name
		optionInfo.name = element.querySelector("span").textContent.trim();

		// Option date (only for exams) from the option title after removing the child nodes
		if (pageType == "exam") {
			let wrapperCopy = element.querySelector(".groupHeaderWrapper div").cloneNode(true);
			Array.from(wrapperCopy.children).forEach((child) => child.remove());
			optionInfo.date = wrapperCopy.textContent.trim();
		}

		// Option participants
		let memberCopy = element.querySelector(`span[id*="members"]`).parentElement.cloneNode(true);
		Array.from(memberCopy.children)[0].remove();
		optionInfo.participants = /unlimited|unbegrenzt/.test(memberCopy.textContent) ? "unlimited" : memberCopy.textContent.trim();

		// Registration start
		// The ids of lva pages contain "begin", group/exam pages contain "appBeginn", so ids containing "egin" are selected
		// (this is a very vague selector, but the fields are only preceded by a "members" and "waitingList" field)
		let targetDate = element.querySelector(`span[id*="egin"]`)?.textContent;
		optionInfo.start = targetDate ? getAccurateStartTime(targetDate) : undefined;

		// Get the option id needed for the registration request (only for group and exam pages)
		// The id is obtained from the span for the participant count (only the identifying part of the id is needed)
		if (pageType == "group") {
			let idElement = element.querySelector(`span[id*=members]`);
			optionInfo.id = idElement.getAttribute("id").match(/groupContentForm:(.*):members/)[1];
		} else if (pageType == "exam") {
			let idElement = element.querySelector(`span[id*=members]`);
			optionInfo.id = idElement.getAttribute("id").match(/examDateListForm:(.*):members/)[1];
		}

		// Get the block for group options
		if (pageType == "group") {
			// The block element is a h2 element
			// Get the block element by iterating over all children of the parent element
			// Track the last h2 element and use it as the block element if the current child is the option element
			let lastH2;
			element.parentElement.childNodes.forEach((child) => {
				if (child.nodeName == "H2") lastH2 = child;
				if (child == element) optionInfo.block = lastH2.textContent.trim();
			});
		}

		// Get the timeslots by iterating over the list of option infos
		element.querySelectorAll("ol > li").forEach((listItem) => {
			// If the list item contains a label with the text "Slots", it contains the timeslots (this doesn't change between English and German)
			if (!(listItem.querySelector("label")?.textContent == "Slots")) return;

			let slots = [];

			// Iterate over all rows in the table
			listItem.querySelectorAll("tbody tr").forEach((row) => {
				// Get the text content of all table cells
				let [date, start, end, participants] = Array.from(row.querySelectorAll("td")).map((td) => td.textContent);
				slots.push({ date, start, end, participants });
			});

			// Add the timeslots to the option info
			optionInfo.slots = slots;
		});

		// Add the option info to the response
		pageInfo.options.push(optionInfo);
	});

	return pageInfo;
};

// The displayed registration start on TISS is for the timezone of Vienna
// This function takes the daylight saving time into account and returns the correct time
let getAccurateStartTime = (targetDateString) => {
	// Get the beginning of daylight saving time (last sunday in march)
	let DSTstart = new Date();
	DSTstart.setUTCMonth(2);
	DSTstart.setUTCDate(31);
	DSTstart.setUTCHours(1, 0, 0, 0);
	while (DSTstart.getUTCDay() != 0) {
		DSTstart.setUTCDate(DSTstart.getUTCDate() - 1);
	}

	// Get the end of daylight saving time (last sunday in october)
	let DSTend = new Date();
	DSTend.setUTCMonth(9);
	DSTend.setUTCDate(31);
	DSTend.setUTCHours(1, 0, 0, 0);
	while (DSTend.getUTCDay() != 0) {
		DSTend.setUTCDate(DSTend.getUTCDate() - 1);
	}

	// Create the target date
	let isDST = DSTstart < Date.now() && Date.now() < DSTend;
	let [date, time] = targetDateString.split(", ");
	let [day, month, year] = date.split(".");
	let [hour, minute] = time.split(":");
	let targetTime = new Date();
	targetTime.setUTCFullYear(year, month - 1, day);
	targetTime.setUTCHours(hour, minute, 0, 0);
	targetTime.setUTCHours(targetTime.getUTCHours() - (isDST ? 2 : 1)); // Subtract 2 hours for CEST, 1 hour for CET

	return targetTime.getTime();
};
