# TISS Lightning Registrator

![Screenshot of the extension being shown in three different browsers](images/Screenshots.png)

Introducing TISS Lightning Registrator, a handy browser extension that takes the hassle out of TISS registrations. Automatically sign up for courses, groups, or exams as soon as they open. Start the extension before a registration begins, and experience lightning-fast registration that is often completed in less than a second.

## Installing

The extension will be available on extension stores soon, until then it has to be installed manually. The extension is available for Chrome and other Chromium browsers (Opera, Edge, etc) as well as Firefox.

### Chrome / Opera / Edge

1. Download the zip of the latest release from the GitHub [releases](https://github.com/The-breakbar/TISS-Lightning-Registrator/releases) and unpack it.
2. Navigate to the browser page of your installed extensions. It can be found under "Manage extensions" in your browser options or by going to the following links depending on your browser:

   - Chrome: `chrome://extensions`
   - Opera: `opera://extensions`
   - Edge: `edge://extensions`

3. Enable "Developer mode" in the top right (left side for Edge).
4. Click the "Load unpacked extension" button and select the unpacked folder which you downloaded (make sure you select the folder which contains all the files).
5. Done! Pin the extension to your top bar and use it by clicking on its icon.

### Firefox

Due to the manual installation process, Firefox unfortunately requires the extension to be reinstalled every time the browser is restarted. The extension will be available on the Firefox Add-ons store soon.

1. Download the zip of the latest Firefox release from the GitHub [releases](https://github.com/The-breakbar/TISS-Lightning-Registrator/releases) and unpack it.
2. Navigate to `about:debugging#/runtime/this-firefox`.
3. Click the "Load Temporary Add-on..." button and select the `manifest.json` file in the unpacked folder which you downloaded.
4. Done! Pin the extension to your top bar and use it by clicking on its icon.

### Updating

To update the extension, simply remove the existing version and install the newest version with the same steps.

## How it works

> If you are interested, see [DEVELOPMENT.md](DEVELOPMENT.md) for a more detailed explanation of the extension's development and the TISS API.

The extension essentially does the same steps a regular user would do, however it can register as soon as it receives a response from the server, instead of having to wait for the rest of the page to load. This allows it to perform the registration process much quicker and register faster than a human user would be able to.

As the extension is based very tightly on the TISS website, any future changes to the site may break the extension.

## Bug reports

All bug reports are appreciated! If you find any problems, feel free to open an [issue](https://github.com/The-breakbar/TISS-Lightning-Registrator/issues).
