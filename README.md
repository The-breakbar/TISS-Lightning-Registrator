# ⚡TISS Lightning Registrator⚡

Note: The extension is currently in development. It is functional and ready for use, as the remaining features are only for the UI, however, it is not yet fully tested and may contain bugs. If you find any bugs, please report them in the issues. Errors can be found in the console of the tab where the registration was started, and also in your installed extensions browser page. There will be an "Errors" button if any occured.

TISS Lightning Registrator is a browser extension that automatically registers for an LVA/group/exam in TISS, as soon as the registration opens. The extension detects when a registration becomes available and immediately sends the required requests to register for it, executing the registration process as fast as possible. On top of that, the extension includes these additional features:

- Registrations are done in the background, as long as the relevant tab isn't closed or refreshed, you can continue using your browser while the extension does its work.
- You can start registrations from multiple tabs, to register for multiple options at the same time.
- Time zone support, allowing you to register from anywhere in the world.

As registrations don't open regularly, to try the extension out, it can also be used to register for an LVA/group/exam which has already opened.

# Installing / Updating

The extension is available for Chrome and other Chromium browsers (Opera, Edge, etc). A Firefox version will be added after the full release. The extension is not available on the Chrome Web Store, it has to be installed manually with the following steps:

1. Download the zip of the latest release from the GitHub [releases](https://github.com/The-breakbar/TISS-Lightning-Registrator/releases) and unpack it.
2. Navigate to the browser page of your installed extensions. It can be found under "Manage extensions" in your browser options or by going to the following links depending on your browser:

   - Chrome: `chrome://extensions`
   - Opera: `opera://extensions`
   - Edge: `edge://extensions`

3. Enable "Developer mode" in the top right (left side for Edge).
4. Click the "Load unpacked extension" button and select the unpacked folder which you downloaded.
5. Done! Pin the extension to your top bar and use it by clicking on its icon.

# How it works

The extension simulates the HTTP requests that are normally sent when a user registers for something. It is based on a reverse-engineer of the internal TISS API, which is used by the TISS website. Unlike in a browser, the extension can register as soon as it receives a response from the server, instead of waiting for the rest of the page to load. This allows it to register faster than a human user. If you are interested, you can read more about the development of the extension [here](DEVELOPMENT.md).

As the extension is based on internal APIs, any changes to the TISS website in the future may break the extension.

# Bug reports

All bug reports are appreciated! If you find any bugs, you can report them in the [issues](https://github.com/The-breakbar/TISS-Lightning-Registrator/issues). Error messages can be found in the console of the tab where the registration ran. There might also be an "Errors" button on the settings page where the extension was installed. It contains errors from the pop-up, as those are not logged to the regular console.
