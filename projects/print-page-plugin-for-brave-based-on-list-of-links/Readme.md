# Link Batch Downloader

Link Batch Downloader is a Brave browser extension for collecting a list of URLs and saving the linked resources into a grouped folder under `~/Downloads`.

## Warning: Download Prompt Setting

The extension requests automatic saving with `saveAs: false`, but Brave's browser-level download setting can still force a save dialog for every PDF. If Brave keeps asking where to save each file, open `brave://settings/downloads` and turn off `Ask where to save each file before downloading`.

The extension also uses Chromium's debugger API to generate PDF print output. Brave may show a debugger permission or debugging notice; extension code cannot suppress that browser-controlled warning.

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

## Phase 3: Download And Folder Naming

### What changed?

- Added the Manifest V3 `debugger`, `downloads`, and `tabs` permissions.
- Implemented PDF output by opening each URL in a background tab, using Chromium's `Page.printToPDF` command, and saving the PDF with `chrome.downloads.download()`.
- Determined the grouped folder name from the most frequently occurring valid link host.
- Saved files into a subfolder of Brave's default download directory, which should be `~/Downloads` on a normal Linux desktop setup.
- Named each PDF from the full escaped URL, using underscore escapes for encoded characters, such as `https_3A_2F_2Fexample.com_2Fpage.pdf`.
- Used Brave's `uniquify` conflict handling if a PDF filename already exists.
- Kept invalid entries visible while still downloading the valid links.
- Disabled the popup button while PDFs are being generated and saved.

### How to test it?

1. Open `brave://extensions`.
2. Click the reload button for `Link Batch Downloader`.
3. If Brave asks for the new `debugger`, `downloads`, or `tabs` permissions, approve them.
4. Open the extension popup.
5. Paste real page URLs from at least two hosts, with one host appearing more often than the other.
6. Click `Prepare downloads`.
7. Confirm the popup reports progress and then says the PDFs were saved in `~/Downloads/<host>`.
8. Open `~/Downloads` and confirm a folder named after the most frequent host was created.
9. Confirm PDF files appear inside that folder.
10. Confirm each PDF filename is the full escaped URL followed by `.pdf`, with encoded characters written as underscore escapes such as `_3A` and `_2F`.
11. Test mixed input with one invalid entry and confirm the valid links still download while the invalid entry remains listed.

### Commit summary

Phase 3 was tested and approved.

Committed with:

```text
Download links into host folder
```
