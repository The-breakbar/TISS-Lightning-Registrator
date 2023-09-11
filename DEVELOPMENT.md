# Overview

This is a short summary of the technical part of the extension and how it was developed. It is meant as a reference for the internal TISS API, as well as a documentation for the development of the extension. You can find the exact documentation of the API in the [sendRegistration.js](content-scripts/sendRegistration.js) file.

Please note that the extension does not handle authentication, it needs the user to be logged in to TISS beforehand. Authentication with the server happens over cookies, which are passed along with every request. If you are looking for a way to automatically log in to TISS, there is a great [guide](https://github.com/flofriday/TU_Wien_Addressbook#how-does-the-app-log-in-to-get-student-information) by flofriday on how to do that.

## TISS Internals