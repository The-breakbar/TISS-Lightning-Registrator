# TISS Lightning Registrator

[![Screenshot of the extension being shown in three different browsers](images/Screenshots.png)](https://chromewebstore.google.com/detail/aafcdagpbbpnjpnfofompbhefgpddimi)

TISS Lightning Registrator is a browser extension that takes the hassle out of TISS registrations. Automatically sign up for courses, groups, or exams as soon as they open. Start the extension before a registration begins, and experience lightning-fast registration that is often completed in less than a second.

## Download

### Chrome / Opera / Edge

[**Download from the Chrome Web Store**](https://chromewebstore.google.com/detail/aafcdagpbbpnjpnfofompbhefgpddimi)

### Firefox

> [!NOTE]
> The firefox version is verified and behaves exactly the same way as an extension installed from the Firefox Add-ons store. **You will receive automatic updates and don't have to manually install new versions.** The extension was unfortunately rejected from the store due to the limited audience it serves.

Navigate to the [latest release](https://github.com/The-breakbar/TISS-Lightning-Registrator/releases/latest) and download the `TISS-Lightning-Registrator-<version>-Firefox.xpi` file (note the `.xpi` file extension) to install the extension.

### Manual installation

<details>
<summary>Show manual installation instructions</summary>

**This installation method is not recommended for regular users, as you will not receive updates this way.** This method should only be used for development purposes or if you are unable to use the other installation methods. New updates will have to be manually downloaded and installed.

### Chrome / Opera / Edge

1. Download the zip of the latest `Unpacked` release from the GitHub [releases](https://github.com/The-breakbar/TISS-Lightning-Registrator/releases) and extract it (or clone the repo).
2. Navigate to the browser page of your installed extensions. It can be found under "Manage extensions" in your browser options or by going to the following links depending on your browser:

   - Chrome: `chrome://extensions`
   - Opera: `opera://extensions`
   - Edge: `edge://extensions`

3. Enable "Developer mode" in the top right (left side for Edge).
4. Click the "Load unpacked extension" button and select the unpacked folder which you downloaded (make sure you select the folder which contains all the files).

### Firefox

Due to the manual installation process, Firefox unfortunately requires the extension to be reinstalled every time the browser is restarted.

1. Download the zip of the latest `Unpacked` Firefox release from the GitHub [releases](https://github.com/The-breakbar/TISS-Lightning-Registrator/releases) and unpack it. Alternatively, clone the repo, delete `manifest.json` and rename `manifest-firefox.json` to `manifest.json`.
2. Navigate to `about:debugging#/runtime/this-firefox`.
3. Click the "Load Temporary Add-on..." button and select the `manifest.json` file in the unpacked folder which you downloaded.

</details>

## How it works

> If you are interested, see [DEVELOPMENT.md](DEVELOPMENT.md) for a more detailed explanation of the extension's development and the TISS API.

The extension essentially does the same steps a regular user would do, however it can register as soon as it receives a response from the server, instead of having to wait for the rest of the page to load. This allows it to perform the registration process much quicker and register faster than a human user would be able to.

As the extension is based very tightly on the TISS website, any future changes to the site may break the extension.

## Bug reports

All bug reports are appreciated! If you find any problems, feel free to open an [issue](https://github.com/The-breakbar/TISS-Lightning-Registrator/issues).

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.
