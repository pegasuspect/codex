# Link Batch Downloader

## Purpose

Link Batch Downloader is a Brave browser extension for collecting a list of
URLs and saving the linked resources into a grouped folder under `~/Downloads`
as PDF files.

## Status

Implemented and documented.

## Architecture

The project is a plain Brave/Chromium Manifest V3 extension. `popup.html`,
`popup.css`, and `popup.js` provide the browser action UI and workflow.

The extension parses pasted `http` and `https` URLs, validates them through the
browser `URL` parser, opens valid links in background tabs, uses Chromium's
debugger `Page.printToPDF` command, and saves the generated PDFs with
`chrome.downloads.download()`.

The output folder is named from the most frequently occurring valid URL host.
PDF filenames are based on the full URL with filename-hostile characters
replaced by dashes. Existing files are not overwritten; Brave uniquifies
conflicts.

## Commands

There is no build step. Load the project folder directly as an unpacked
extension:

```text
brave://extensions
```

Development verification commands:

```bash
node --check popup.js
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('manifest ok')"
```

## Testing

Manual test flow:

1. Open `brave://extensions`.
2. Enable `Developer mode`.
3. Load this project folder as an unpacked extension.
4. Open the `Link Batch Downloader` extension popup.
5. Paste `http` or `https` URLs separated by commas, new lines, spaces, or a
   mixture of those separators.
6. Choose how many tabs to process in parallel. The default and minimum is
   three. The `Max` position opens every valid link at once.
7. Click `Prepare downloads`.
8. Confirm valid links appear in order and invalid entries remain visible.
9. Confirm generated PDFs are saved under `~/Downloads/<most-frequent-host>/`.

## Deployment

Deploy by loading this directory as an unpacked Brave extension for local use.
For distribution, package the Manifest V3 extension through the normal
Chromium-compatible extension release process.

## Security

The extension requests `debugger`, `downloads`, and `tabs` permissions. The
debugger permission is required for Chromium's PDF print command and can cause
Brave to show a browser-controlled debugging notice.

The extension requests automatic saving with `saveAs: false`, but Brave's
browser-level download setting can still force a save dialog for every PDF. If
Brave keeps asking where to save each file, open `brave://settings/downloads`
and turn off `Ask where to save each file before downloading`.

The extension waits for the initial page load and then for the page's text,
height, element count, images, links, and loaded resources to stop changing
before printing. This readiness check is the same for every website and does
not depend on site-specific routes, selectors, or page text.

The parallel-tabs slider processes three through nine tabs concurrently. Its
final `Max` position removes the concurrency limit and opens all valid links at
once. When Max is selected with more than three valid links, the popup warns
that the resulting tabs may slow down the system or crash the browser.

If a page requires sign-in, blocking protection, or interactive loading, the
PDF output still depends on what Brave can load in the temporary tab. If the
initial load or dynamic content takes longer than 45 seconds, the extension
reports which readiness phase timed out instead of printing a known-incomplete
page.

## Dynamic Page Verification

After reloading the unpacked extension, test a dynamically rendered page and
confirm:

1. The status changes to `Preparing page ... for printing`.
2. The generated PDF contains the job listings, not only the page shell.
3. A normal static page still prints after a short settling period.
4. A page whose dynamic content never becomes ready reports a timeout and does
   not save a partial PDF.

## Plan

<details>
<summary>Phase 1: Discovery And Target Folder</summary>

### Goal

Create the first loadable Brave extension baseline.

### Decisions

- Treat `projects/print-page-plugin-for-brave-based-on-list-of-links` as a
  Brave/Chromium Manifest V3 extension, not a Codex plugin and not a Firefox
  extension.
- Use plain JavaScript, HTML, and CSS.
- Start with a popup where the user pastes links into a textarea and presses a
  button to start the download workflow.
- Name the grouped folder from the most frequently occurring URL host.

### Changes

- Added `manifest.json` with a browser action popup.
- Added `popup.html`, `popup.css`, and `popup.js` for the first loadable
  extension UI.

### Verification

1. Open Brave and go to `brave://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select `projects/print-page-plugin-for-brave-based-on-list-of-links`.
5. Confirm the extension appears as `Link Batch Downloader`.
6. Click the extension action icon.
7. Confirm the popup opens with a `Links` textarea and `Prepare downloads`
   button.
8. Click `Prepare downloads` with an empty textarea and confirm it asks for
   links.
9. Add any text and click `Prepare downloads`; confirm it shows the placeholder
   message for later phases.

### Result

Phase 1 was tested and approved. Committed with `Add Brave extension baseline`.

</details>

<details>
<summary>Phase 2: Link Input And Parsing</summary>

### Goal

Parse user input into valid and invalid link groups.

### Decisions

- Accept links separated by new lines, commas, whitespace, or a mixture of
  those separators.
- Normalize valid `http` and `https` links through the browser `URL` parser.
- Reject invalid entries and unsupported protocols instead of silently dropping
  them.

### Changes

- Implemented link parsing in `popup.js`.
- Added a popup results section that shows valid links and invalid entries.

### Verification

1. Open `brave://extensions`.
2. Click the reload button for `Link Batch Downloader`.
3. Open the extension popup.
4. Paste comma-separated links, such as
   `https://example.com/a, https://example.com/b`.
5. Click `Prepare downloads` and confirm both links appear under `Valid links`.
6. Paste newline-separated links and confirm they also appear under
   `Valid links`.
7. Paste mixed input such as
   `https://example.com/a, not-a-link ftp://example.com/file`.
8. Confirm `https://example.com/a` appears as valid and the other entries
   appear under `Invalid entries`.
9. Confirm empty input still asks for one or more links.

### Result

Phase 2 was tested and approved. Committed with `Parse and validate popup
links`.

</details>

<details>
<summary>Phase 3: Download And Folder Naming</summary>

### Goal

Generate PDFs from valid links and save them into a grouped download folder.

### Decisions

- Use Manifest V3 `debugger`, `downloads`, and `tabs` permissions.
- Open each URL in a background tab and call Chromium's `Page.printToPDF`.
- Save PDFs into a subfolder of Brave's default download directory.
- Keep invalid entries visible while still downloading valid links.
- Disable the popup button while PDFs are being generated and saved.

### Changes

- Implemented PDF output and grouped folder naming.
- Named each PDF from the full URL with filename-hostile characters replaced by
  dashes.
- Used Brave's `uniquify` conflict handling if a PDF filename already exists.

### Verification

1. Open `brave://extensions`.
2. Click the reload button for `Link Batch Downloader`.
3. If Brave asks for the new `debugger`, `downloads`, or `tabs` permissions,
   approve them.
4. Open the extension popup.
5. Paste real page URLs from at least two hosts, with one host appearing more
   often than the other.
6. Click `Prepare downloads`.
7. Confirm the popup reports progress and then says the PDFs were saved in
   `~/Downloads/<host>`.
8. Open `~/Downloads` and confirm a folder named after the most frequent host
   was created.
9. Confirm PDF files appear inside that folder.
10. Confirm each PDF filename is based on the full URL followed by `.pdf`, with
    filename-hostile characters replaced by dashes.
11. Test mixed input with one invalid entry and confirm the valid links still
    download while the invalid entry remains listed.

### Result

Phase 3 was tested and approved. Committed with `Download links into host
folder`.

</details>

<details>
<summary>Phase 4: Docs, Verification, And Polish</summary>

### Goal

Document usage, browser caveats, and final verification.

### Decisions

- Put the Brave download prompt setting and debugger warning before the phase
  history so users see them before testing.
- Keep filename documentation aligned with the current implementation.
- Verify JavaScript syntax and Manifest V3 JSON without adding a build system.

### Changes

- Added top-level usage, behavior, and troubleshooting documentation.
- Updated the filename documentation to match the current implementation.

### Verification

1. Read the usage, behavior, and troubleshooting sections at the top of this
   file.
2. Open `brave://extensions`.
3. Reload `Link Batch Downloader`.
4. Run one final test with comma-separated and newline-separated page URLs.
5. Confirm PDFs are saved under `~/Downloads/<most-frequent-host>/`.
6. Confirm the popup still reports invalid entries without blocking valid URLs.
7. Confirm the documentation matches the behavior you see in Brave.

### Result

Phase 4 was tested and approved. Committed with `Polish Brave extension
documentation`.

</details>
