// This file simply toggles the visibilty of the study code input field for now
// In the future this might need to sanitize the input and do other validation, but for now this should suffice

document.getElementById("hasStudyCode-input").onchange = function() {
    let input = document.getElementById("studycode-input");
    input.hidden = !input.hidden;
}