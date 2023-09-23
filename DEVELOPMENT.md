# Development

This is a short summary of the technical part of the extension and how it was developed. It is meant as a reference for the internal TISS API, as well as documentation for the development of the extension.

TISS Lightning Registrator was inspired by the [TISS Quick Registration Script](https://github.com/mangei/tissquickregistrationscript) by Manuel Geier which was used by many students. The script is a great tool, however there are various parts of it which have potential for improvement (additionally it is no longer maintained). The main goal of this extension was not to make a better version of the script, but to create a completely new tool which would be faster, more reliable and easier to use.

## Overview

Development started with the mentality that everything a user can do can also be replicated with Javascript. Generally, this is true, however sometimes it might be more difficult than expected, and this case was unfortunately one of those times. TISS does have a nice REST API, however you can only do things like look up people and LVAs, but not actually register for them. The only way to register for an LVA, group or exam is to use the website itself. This means that the extension had to replicate the requests by reverse-engineering the website, which is not an easy task.

It took quite a while until the first request was replicated, and initial testing unfortunately revealed that you could not skip any steps of the registration process, and had to follow the same steps as a regular user. This resulted in this simple registration flow:

- Refresh the page until the registration is open
- Send the request for pressing the register button
- Send the request for confirming the registration

While this seems pretty basic, every step had its own challenges and problems which had to be solved. Managing to replicate the registration process for the first time was a big milestone, and took quite a bit of time and effort. The following sections will go into detail about each step of the registration process and how it was solved.

Please note that the extension does not handle authentication, it needs the user to be logged in to TISS beforehand. Authentication with the server happens over cookies, which are passed along with every request. If you are looking for a way to automatically log in to TISS, there is a great [guide](https://github.com/flofriday/TU_Wien_Addressbook#how-does-the-app-log-in-to-get-student-information) by flofriday on how to do that.

## Step 0: TISS internals

Before going into the registration process, it is important to know what TISS uses internally. The website seems to be made using [Java Server Faces](https://www.oracle.com/java/technologies/javaserverfaces.html) (JSF) or some variation of that, as well as [Apache Deltaspike](https://deltaspike.apache.org/documentation/overview.html). While it is not necessary to know how these frameworks work (I certainly don't), their documentation was very important in understanding some very specific details of the TISS website.

## Step 1: Refreshing the page

As part of the performance requirements (as well as for user experience), it was essential that all requests (including refreshes) were done inside of Javascript, so that none of the images/css of the response would start to load (since only the HTML is needed). For a refresh, this could be achieved with a simple GET request with a `fetch()` of the current url, however this causes a problem:

If you have been attentive, you might have noticed that each time you refresh the page or click on a link, the url changes while the page is loading. You are actually always redirected to a loading page first, which then redirects you to the page you wanted to go to. This is unfortunately very annoying for our fetch request, as it will receive the loading page as the response.

If you are an all-knowing entity (or have been looking through the source code of the loading page), you might deduct that the loading page is a so called "window handler" from the ["Multi-Window Handling" part of the JSF Module from Deltaspike](https://deltaspike.apache.org/documentation/jsf.html#Multi-WindowHandling). Fortunately their documentation explains how the window handler works:

> Each GET request results in an intermediate small HTML page (aka "windowhandler").

> ... a unique token (called dsrid) will be generated for the current request and added to the URL. In addition a cookie with with the dsrid/dswid will be added. On the server side, the verified windowId will be extracted from the cookie. For POST request detection, the windowId will be added as hidden input to all forms.

So if we generate this unique token and create the cookie before sending our GET request, we should immediately receive the page we wanted to go to, instead of the loading page. For this we have to make a small detour and explain how the token is generated.

At this point there was serious concern that it might not be possible to replicate the token generation on the client side, as it might be using some server side magic. Additionally the documentation had no mention of how the token is generated, so the only way to find out was to look through the source code.

At the bottom of the window handler page, there is a small script which is responsible for the redirect:

```javascript
window.onload = function () {
	handleWindowId(newWindowId, redirectUrl);
};
```

The `handleWindowId` function is found in [`windowIdHandling.js`](https://tiss.tuwien.ac.at/education/faces/javax.faces.resource/1695205112000/js/windowIdHandling.js?v=4.7.3), which contains all the code that creates the cookie, but also this line:

```javascript
var requestToken = dswh.utils.generateNewRequestToken();
```

`dswh` obviously stands for "Deltaspike Window Handler", so this uses the utilities of that module. Those utilities are found in [`windowhandler.js`](https://tiss.tuwien.ac.at/education/javax.faces.resource/windowhandler.js.xhtml?ln=deltaspike), and while difficult to read, the file is fortunately only minimized, but not obfuscated. After a quick search you can find the sophisticated token generation algorithm in this function:

```javascript
generateNewRequestToken:function(){return""+Math.floor(999*Math.random())}
```

So it turns out that the token is just a random number between 0 and 999. This is great news, as it means that we don't even have to replicate the token generation, we can just hardcode it. Checking the cookies of the site reveals the exact format of the cookie, which results in the following code for the extension (the `windowId` is extracted from the url parameters):

```javascript
const DSRID_VALUE = 1;
document.cookie = `dsrwid-${DSRID_VALUE}=${windowId}`;
```

Now that the cookie is set, the page can be fetched with the modified url (replacing the `dsrid` value with our own).

```javascript
fetch(document.location.href.replace(/dsrid=\d*/, `dsrid=${DSRID_VALUE}`));
```

This is what the extension uses to refresh a page without loading any unnecessary resources and without being redirected to the loading page. Onto the next step!

## Step 2: Sending the first request

The first request is the one that mimics the register button. Taking a look at the network tab of the browser reveals a POST request with the following body:

```
groupContentForm:j_id_52:0:j_id_5d:j_id_5g:65:j_id_a1: Anmelden
groupContentForm_SUBMIT: 1
javax.faces.ViewState: M0Q5MzlFERTCNTY5NEJCQjAwMDAwMDFD
javax.faces.ClientWindow: 8203
dspwid: 8203
```

> See the [API Docs](#api-docs) for a detailed description of the request body.

Although this specific body is for a group registration, they don't vary much between LVA/group/exam. Most of the body is pretty straightforward, the first entry is just the HTML id of the register button as the key, and the text of the button as the value. The second entry is always the same, and the last 2 entries are just the window id, which can be extracted from the url.

### ViewState

The only thing that is not clear is the ViewState. It changes for every request and repeating an already sent request a second time doesn't work. Fortunately there is a great [article](https://book.hacktricks.xyz/pentesting-web/deserialization/java-jsf-viewstate-.faces-deserialization) by HackTricks which talks about the ViewState and its potential vulnerabilities (although they don't apply to TISS).

> JSF makes use of ViewStates (in addition to sessions) to store the current state of the view (e.g. what parts of the view should currently be displayed).

> JSF ViewStates are typically automatically embedded into HTML forms as hidden field with the name `javax.faces.ViewState`. They are sent back to the server if the form is submitted.

The ViewState string itself is a serialized Java object, although what it represents doesn't matter as we simply pass it along. The hidden field in TISS looks like this:

```html
<input type="hidden" name="javax.faces.ViewState" id="j_id__v_0:javax.faces.ViewState:2" value="NkE5RjdGMjA1QUVCQ0IFRDAwMDAwMDFG" autocomplete="off" />
```

Together with some testing, the following constraints were found:

- A ViewState "represents" the page it is found in, and can only be used for actions that can be performed on that page
- A ViewState can only be used once, repeating a request with the same ViewState will result in an error

This means that the ViewState has to be extracted from the page itself, and can't be hardcoded. This is not a problem, as the ViewState is always found in the page, and can be extracted with a simple selector:

```javascript
pageDocument.querySelector(`input[name="javax.faces.ViewState"]`).value;
```

These constraints are unfortunately also the reason why the extension can't skip any steps of the registration process. The first ViewState isn't valid until the register button exists and the second ViewState is dependant on the first request. This results in the following registration process:

- Refresh the page until the registration opens (the register button exists)
- Extract the ViewState and use it to send the first request
- Extract the ViewState from the response and use it to send the second request

For the extension, this was done with simple fetch requests and the useful `DOMParser` class, which can be used to parse the response as a HTML document and extract the ViewState from it.

```javascript
let firstResponse = await fetch(targetUrl, payload);
validateResponse(firstResponse);
let pageDocument = new DOMParser().parseFromString(await firstResponse.text(), "text/html");
bodyData["javax.faces.ViewState"] = pageDocument.querySelector(`input[name="javax.faces.ViewState"]`).value;
```

## Step 3: The second request

The second request to confirm the registration isn't much different from the first one, the button id is constant and the only thing needed is the ViewState from the previous response. While sending the request doesn't provide any other obstacles, there is still one more problem: Exam Slots. Some exams (mostly oral exams) have multiple slots, where you can register for one of them. This is done during the confirmation page (after the first request) with a dropdown menu which contains all the available slots. The value of the selected slot is then sent with the second request.

The `<option>` elements of the slot select contain two things: The text of the slot and a value attribute, which is some unique number.

```html
<select id="regForm:subgrouplist" name="regForm:subgrouplist" size="3">
	<option value="138806">01.01.2023 14:00 - 14:15</option>
	<option value="138807">01.01.2023 14:15 - 14:30</option>
	<option value="138808">01.01.2023 14:30 - 14:45</option>
</select>
```

The problem arises from the fact that we have to provide the user with a way to select a slot, but we can't parse the data from the response, as that has to be done before the registration opens. This means the slot data has to be parsed from the registration page, which unfortunately doesn't contain the value attribute.

```html
<tr>
	<td>01.01.2023</td>
	<td>14:00</td>
	<td>14:15</td>
	<td>0 / 1</td>
</tr>
```

This forces us to do string comparisons between the text of the slot and the text of the option, which while not being ideal, is the only way to do it. To keep it as simple as possible, the extension just checks if the slot start and end time are contained in the option text (it is unknown if slots can be named).

```javascript
if (slot) {
	let slotOptions = pageDocument.querySelectorAll(`select[id="regForm:subgrouplist"] option`);
	let option = Array.from(slotOptions).find((option) => option.textContent.includes(slot[0]) && option.textContent.includes(slot[1]));
	bodyData["regForm:subgrouplist"] = option.value;
}
```

With this, the registration process is complete and the extension can register for LVAs, groups and exams.

## Results

During regular conditions, the extension can register in less than a second, with the fastest times being around 250ms. The timeline looks like this:

0. Refresh loop, usually with a frequency of 100-300ms per refresh
1. (At this point the registration has openened) Refresh the page (100-300ms) (depending on the frequency of the refresh loop, there might be an extra delay, as the registration might open while the previous request is still being processed)
2. Send the first request (100-300ms)
3. Send the second request (up to 10 seconds, depending on server traffic)

The response time of the second request is highly dependent on how much traffic the TISS servers have to handle at the time, in the best case it takes 100-300ms like the other requests, but it can also take longer. Note that this does not mean that the extension is slow, it is just waiting for the server to respond (and so is every other user that is trying to register at the same time).

While there is room for improvement, about 90% of the time is spent waiting for the server to respond. An attempt could be made to time the refresh so that the registration opens just before the refresh, however this would require a lot of testing and would be difficult to get right.

## Conclusion

Hopefully this was an interesting read, even if you're not planning to implement this API yourself. Reverse-engineering the TISS website was a very interesting experience, and it turned a small project that I wanted to just make for myself into a full-fledged extension which I can easily share with others. If you have any questions or suggestions, feel free to open an issue or a pull request. Additionally you can easily reach me as "breakbar" on Discord.

# API Docs

> [!NOTE]
> While this documentation tries to be as complete as possible, certain things have not been thoroughly tested and are unknown. It is sufficient for this extension, however that might not be the case for every use case. If you find any mistakes or have additional information, please open an issue or a pull request.

## General notes

- All requests need the following 3 cookies: `_tiss_session`, `TISS_AUTH`, `JSESSIONID`. These are present after logging in to TISS and should be passed along with every request.
- To mimic the site, POST requests should have the `Content-Type` header set to `application/x-www-form-urlencoded` (and the body should be encoded as such).
- An error is generally indicated by a 302, or a redirect. Make sure you detect and don't follow any redirects, as they will lead to an error page or redirect back to the original page, making it seem like nothing happened.

As a helpful source, a Javascript implementation of all of these endpoints can be found in the [`sendRegistration.js`](content-scripts/sendRegistration.js) file.

## LVA endpoint - /education/course/courseRegistration.xhtml (POST)

Sending this request mimics the register button for an LVA registration. A successful (200) response will contain the confirmation page in the form of a `text/html` document. An unsuccessful response is generally a 302 or a redirect.

The request body needs to contain the following key-value pairs:

| Key name                   | Value                  | Notes                                                                                                                            |
| -------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `registrationForm:j_id_6t` | `"Register"`           | Key name is the HTML id of the register button<br />Value is the text of the button<br />`"Anmelden"` is also valid as the value |
| `registrationForm_SUBMIT`  | `1`                    |
| `dspwid`                   | A window id            | The id is found in the url as the "dswid" parameter                                                                              |
| `javax.faces.ClientWindow` | Same value as `dspwid` |
| `javax.faces.ViewState`    | A valid ViewState      | See [ViewState](#viewstate)                                                                                                      |

## Group endpoint - /education/course/groupList.xhtml (POST)

Sending this request mimics the register button for a group registration. The `<id>` for the first parameter has to be extracted from the id of the button from the group option which you want to register for. A successful (200) response will contain the confirmation page in the form of a `text/html` document. An unsuccessful response is generally a 302 or a redirect.

The request body needs to contain the following key-value pairs:

| Key name                        | Value                  | Notes                                                                                                                                                                                                |
| ------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `groupContentForm:<id>:j_id_a1` | `"Register"`           | Key name is the HTML id of the register button<br />The `<id>` part of the key is different for every group option<br />Value is the text of the button<br />`"Anmelden"` is also valid as the value |
| `groupContentForm_SUBMIT`       | `1`                    |
| `dspwid`                        | A window id            | The id is found in the url as the "dswid" parameter                                                                                                                                                  |
| `javax.faces.ClientWindow`      | Same value as `dspwid` |
| `javax.faces.ViewState`         | A valid ViewState      | See [ViewState](#viewstate)                                                                                                                                                                          |

## Exam endpoint - /education/course/examDateList.xhtml (POST)

Sending this request mimics the register button for an exam registration. The `<id>` for the first parameter has to be extracted from the id of the button from the exam option which you want to register for. A successful (200) response will contain the confirmation page in the form of a `text/html` document. An unsuccessful response is generally a 302 or a redirect.

The request body needs to contain the following key-value pairs:

| Key name                        | Value                  | Notes                                                                                                                                                                                               |
| ------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `examDateListForm:<id>:j_id_9u` | `"Register"`           | Key name is the HTML id of the register button<br />The `<id>` part of the key is different for every exam option<br />Value is the text of the button<br />`"Anmelden"` is also valid as the value |
| `examDateListForm_SUBMIT`       | `1`                    |
| `dspwid`                        | A window id            | The id is found in the url as the "dswid" parameter                                                                                                                                                 |
| `javax.faces.ClientWindow`      | Same value as `dspwid` |
| `javax.faces.ViewState`         | A valid ViewState      | See [ViewState](#viewstate)                                                                                                                                                                         |

## Confirm endpoint - /education/course/register.xhtml (POST)

Sending this request mimics the final confirm button on the confirmation page. A successful (200) response will contain the page with the registration result info in the form of a `text/html` document. An unsuccessful response is generally a 302 or a redirect. Note the additional parameter `regForm:subgrouplist` which is only needed if registering for an exam with slots.

The request body needs to contain the following key-value pairs:

| Key name                          | Value                  | Notes                                                                                                                                                                                                                                                                           |
| --------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `regForm:j_id_30`                 | `"Register"`           | Key name is the HTML id of the register button<br />`"Anmelden"` is also valid as the value                                                                                                                                                                                     |
| `regForm_SUBMIT`                  | `1`                    |
| `dspwid`                          | A window id            | The id is found in the url as the "dswid" parameter                                                                                                                                                                                                                             |
| `javax.faces.ClientWindow`        | Same value as `dspwid` |
| `javax.faces.ViewState`           | A valid ViewState      | See [ViewState](#viewstate)                                                                                                                                                                                                                                                     |
| `regForm:subgrouplist` (Optional) | Slot value             | **Only needed if registering for exam with slots**<br />The confirmation page contains a dropdown menu (`<select>`) with the available slots to choose from<br />The value is the value attribute of the option (e.g. `<option value="138848">`) of the slot you want to choose |

## Example curl commands

These are some example curl commands that show how to perform the requests. Make sure to replace the following values:

- Cookies (`JSESSIONID`, `TISS_AUTH`, `_tiss_session`)
- ViewState (`javax.faces.ViewState`)
- Window id (`dspwid`, `javax.faces.ClientWindow`)
- Group/Exam option id (`groupContentForm:<id>:j_id_a1` / `examDateListForm:<id>:j_id_9u`)

Also note that the [--data-urlencode](https://everything.curl.dev/http/post/url-encode) flag is used (for the `application/x-www-form-urlencoded` content type), however that requires the key of the key-value pairs to be already encoded. For example, the key `registrationForm:j_id_6t` is encoded as `registrationForm%3Aj_id_6t`.

### LVA endpoint

```bash
curl --location 'https://tiss.tuwien.ac.at/education/course/courseRegistration.xhtml' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--header 'Cookie: JSESSIONID=d7~CC38E402394034D90A28E8D77D9E0022; TISS_AUTH=fe21d3192f3bc581ce4ed9c9ghd6cd5f80707441837c4dc15b9481368fb5d0c8; _tiss_session=50d4bfd6423157d995a18e7ef6150772' \
--data-urlencode 'registrationForm%3Aj_id_6t=Register' \
--data-urlencode 'registrationForm_SUBMIT=1' \
--data-urlencode 'dspwid=8359' \
--data-urlencode 'javax.faces.ClientWindow=8359' \
--data-urlencode 'javax.faces.ViewState=REQwQTlEN0FDRUExZEEwNTAwMDAwMDI1'
```

### Group endpoint

```bash
curl --location 'https://tiss.tuwien.ac.at/education/course/groupList.xhtml' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--header 'Cookie: JSESSIONID=d7~CC38E402394034D90A28E8D77D9E0022; TISS_AUTH=fe21d3192f3bc581ce4ed9c9ghd6cd5f80707441837c4dc15b9481368fb5d0c8; _tiss_session=50d4bfd6423157d995a18e7ef6150772' \
--data-urlencode 'groupContentForm%3Aj_id_52%3A0%3Aj_id_5d%3Aj_id_5g%3A109%3Aj_id_a1=Register' \
--data-urlencode 'groupContentForm_SUBMIT=1' \
--data-urlencode 'dspwid=8359' \
--data-urlencode 'javax.faces.ClientWindow=8359' \
--data-urlencode 'javax.faces.ViewState=NkMwMUIzNTFEQzQ0IFRFNTAwMDAwMDI5'
```

### Exam endpoint

```bash
curl --location 'https://tiss.tuwien.ac.at/education/course/examDateList.xhtml' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--header 'Cookie: JSESSIONID=d7~CC38E402394034D90A28E8D77D9E0022; TISS_AUTH=fe21d3192f3bc581ce4ed9c9ghd6cd5f80707441837c4dc15b9481368fb5d0c8; _tiss_session=50d4bfd6423157d995a18e7ef6150772' \
--data-urlencode 'examDateListForm%3Aj_id_56%3Aj_id_59%3A0%3Aj_id_9u=Register' \
--data-urlencode 'examDateListForm_SUBMIT=1' \
--data-urlencode 'dspwid=8359' \
--data-urlencode 'javax.faces.ClientWindow=8359' \
--data-urlencode 'javax.faces.ViewState=NzYyNEJDQTdBODQ0BIN2QjAwMDAwMDJD'
```

### Confirm endpoint

```bash
curl --location 'https://tiss.tuwien.ac.at/education/course/register.xhtml' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--header 'Cookie: JSESSIONID=d7~CC38E402394034D90A28E8D77D9E0022; TISS_AUTH=fe21d3192f3bc581ce4ed9c9ghd6cd5f80707441837c4dc15b9481368fb5d0c8; _tiss_session=50d4bfd6423157d995a18e7ef6150772' \
--data-urlencode 'regForm%3Aj_id_30=Register' \
--data-urlencode 'regForm_SUBMIT=1' \
--data-urlencode 'dspwid=8358' \
--data-urlencode 'javax.faces.ClientWindow=8358' \
--data-urlencode 'javax.faces.ViewState=RUVBN0FTEUZEMUI3QjQzNTAwMDAwMDQw'
```
