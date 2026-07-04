# Link Batch Downloader

Link Batch Downloader is a Brave browser extension for collecting a list of URLs and saving the linked resources into a grouped folder under `~/Downloads`.

## Phase 1: Discovery And Target Folder

### What changed?

- Confirmed `projects/print-page-plugin-for-brave-based-on-list-of-links` is the empty target folder.
- Treated this project as a Brave/Chromium Manifest V3 extension, not a Codex plugin and not a Firefox extension.
- Added `manifest.json` with a browser action popup.
- Added `popup.html`, `popup.css`, and `popup.js` for the first loadable extension UI.
- Chose the initial user flow: open the extension popup, paste links into a textarea, and press a button to start the download workflow.

### Baseline assumptions

- Brave can load this project as an unpacked Chromium extension through `brave://extensions`.
- The implementation will use plain JavaScript, HTML, and CSS.
- Later phases will add URL parsing, validation, grouped download folder naming, and real downloads.
- The grouped folder name will be based on the most frequently occurring URL host.

### How to test it?

1. Open Brave and go to `brave://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select `projects/print-page-plugin-for-brave-based-on-list-of-links`.
5. Confirm the extension appears as `Link Batch Downloader`.
6. Click the extension action icon.
7. Confirm the popup opens with a `Links` textarea and `Prepare downloads` button.
8. Click `Prepare downloads` with an empty textarea and confirm it asks for links.
9. Add any text and click `Prepare downloads`; confirm it shows the placeholder message for later phases.

### Commit summary

Phase 1 was tested and approved.

Committed with:

```text
Add Brave extension baseline
```
