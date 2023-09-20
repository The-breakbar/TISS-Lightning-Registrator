# Development

This is a short summary of the technical part of the extension and how it was developed. It is meant as a reference for the internal TISS API, as well as a documentation for the development of the extension.

Please note that the extension does not handle authentication, it needs the user to be logged in to TISS beforehand. Authentication with the server happens over cookies, which are passed along with every request. If you are looking for a way to automatically log in to TISS, there is a great [guide](https://github.com/flofriday/TU_Wien_Addressbook#how-does-the-app-log-in-to-get-student-information) by flofriday on how to do that.

## Overview

## Step 1: Refreshing the page

## Step 2: Performing the registration

# API Docs

> [!NOTE]
> While this documentation tries to be as complete as possible, everything is based on manual observations and "trial and error". Certain things have not been thoroughly tested and are unknown. It is good enough for this extension, however that might not be the case for every use case. If you find any mistakes or have additional information, please open an issue or a pull request.

## General notes

- All requests need the following 3 cookies: `_tiss_session`, `TISS_AUTH`, `JSESSIONID`. These are present after logging in to TISS and should be passed along with every request.
- To mimic the site, POST requests should have the `Content-Type` header set to `application/x-www-form-urlencoded` (and the body should be encoded as such).
- An error is generally indicated by a 302, or a redirect. Make sure you detect and don't follow any redirects, as they will lead to an error page.

As a helpful source, a Javascript implementation of all of these endpoints can be found in the [sendRegistration.js](content-scripts/sendRegistration.js) file.

## LVA endpoint - /education/course/courseRegistration.xhtml (POST)

This endpoint mimics the register button for an LVA registration. A successful (200) response will contain the confirmation page in the form of a `text/html` document. An unsuccessful (302 or redirect) response will contain a redirect to the error page.

| Key name                   | Value                  | Notes                                                                                                                                |
| -------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `registrationForm:j_id_6t` | `"Register"`           | Key name is the HTML id of the registration button<br />Value is the text of the button<br />`"Anmelden"` is also valid as the value |
| `registrationForm_SUBMIT`  | `1`                    |
| `dspwid`                   | A window id            | The id is found in the url as the "dswid" parameter                                                                                  |
| `javax.faces.ClientWindow` | Same value as `dspwid` |
| `javax.faces.ViewState`    | A valid ViewState      |

## Group endpoint - /education/course/groupList.xhtml (POST)

This endpoint mimics the register button for a group registration. The `<id>` for the first parameter has to be extracted from the id of the button from the group option which you want to register for. A successful (200) response will contain the confirmation page in the form of a `text/html` document. An unsuccessful (302 or redirect) response will contain a redirect to the error page.

| Key name                        | Value                  | Notes                                                                                                                                                                                                    |
| ------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `groupContentForm:<id>:j_id_a1` | `"Register"`           | Key name is the HTML id of the registration button<br />The `<id>` part of the key is different for every group option<br />Value is the text of the button<br />`"Anmelden"` is also valid as the value |
| `groupContentForm_SUBMIT`       | `1`                    |
| `dspwid`                        | A window id            | The id is found in the url as the "dswid" parameter                                                                                                                                                      |
| `javax.faces.ClientWindow`      | Same value as `dspwid` |
| `javax.faces.ViewState`         | A valid ViewState      |

## Exam endpoint - /education/course/examDateList.xhtml (POST)

This endpoint mimics the register button for an exam registration. The `<id>` for the first parameter has to be extracted from the id of the button from the exam option which you want to register for. A successful (200) response will contain the confirmation page in the form of a `text/html` document. An unsuccessful (302 or redirect) response will contain a redirect to the error page.

| Key name                        | Value                  | Notes                                                                                                                                                                                                   |
| ------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `examDateListForm:<id>:j_id_9u` | `"Register"`           | Key name is the HTML id of the registration button<br />The `<id>` part of the key is different for every exam option<br />Value is the text of the button<br />`"Anmelden"` is also valid as the value |
| `examDateListForm_SUBMIT`       | `1`                    |
| `dspwid`                        | A window id            | The id is found in the url as the "dswid" parameter                                                                                                                                                     |
| `javax.faces.ClientWindow`      | Same value as `dspwid` |
| `javax.faces.ViewState`         | A valid ViewState      |

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
--header 'Cookie: JSESSIONID=d7~CC38E402394034D90A28E8D77D9E0022; TISS_AUTH=fe21d3192f3bc581ce4ed9c9ghd6cd5f80707441837c4dc15b9481368fb5d0c8;  _tiss_session=50d4bfd6423157d995a18e7ef6150772' \
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
