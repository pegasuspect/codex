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

## Phase 2: Link Input And Parsing

### What changed?

- Implemented link parsing in `popup.js`.
- Accepted links separated by new lines, commas, whitespace, or a mixture of those separators.
- Normalized valid `http` and `https` links through the browser `URL` parser.
- Rejected invalid entries and unsupported protocols instead of silently dropping them.
- Added a popup results section that shows valid links and invalid entries.

### How to test it?

1. Open `brave://extensions`.
2. Click the reload button for `Link Batch Downloader`.
3. Open the extension popup.
4. Paste comma-separated links, such as `https://example.com/a, https://example.com/b`.
5. Click `Prepare downloads` and confirm both links appear under `Valid links`.
6. Paste newline-separated links and confirm they also appear under `Valid links`.
7. Paste mixed input such as `https://example.com/a, not-a-link ftp://example.com/file`.
8. Confirm `https://example.com/a` appears as valid and the other entries appear under `Invalid entries`.
9. Confirm empty input still asks for one or more links.

### Commit summary

Phase 2 was tested and approved.

Committed with:

```text
Parse and validate popup links
```
