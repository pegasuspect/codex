"use strict";

const linksInput = document.querySelector("#links-input");
const downloadButton = document.querySelector("#download-button");
const statusMessage = document.querySelector("#status");
const parseResults = document.querySelector("#parse-results");

function tokenizeLinks(inputText) {
  return inputText
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function parseLinks(inputText) {
  const validLinks = [];
  const invalidEntries = [];

  for (const token of tokenizeLinks(inputText)) {
    try {
      const url = new URL(token);

      if (url.protocol !== "http:" && url.protocol !== "https:") {
        invalidEntries.push(token);
        continue;
      }

      validLinks.push(url.href);
    } catch {
      invalidEntries.push(token);
    }
  }

  return {
    validLinks: [...new Set(validLinks)],
    invalidEntries
  };
}

function renderParseResults(validLinks, invalidEntries) {
  parseResults.replaceChildren();

  if (validLinks.length > 0) {
    parseResults.appendChild(createResultGroup("Valid links", validLinks));
  }

  if (invalidEntries.length > 0) {
    parseResults.appendChild(createResultGroup("Invalid entries", invalidEntries, "invalid"));
  }

  parseResults.hidden = validLinks.length === 0 && invalidEntries.length === 0;
}

function createResultGroup(title, entries, className) {
  const group = document.createElement("div");
  const heading = document.createElement("h2");
  const list = document.createElement("ul");

  if (className) {
    group.className = className;
  }

  heading.textContent = title;
  group.appendChild(heading);

  for (const entry of entries) {
    const item = document.createElement("li");
    item.textContent = entry;
    list.appendChild(item);
  }

  group.appendChild(list);
  return group;
}

downloadButton.addEventListener("click", () => {
  const inputText = linksInput.value.trim();

  if (!inputText) {
    statusMessage.textContent = "Add one or more links before continuing.";
    parseResults.hidden = true;
    parseResults.replaceChildren();
    return;
  }

  const { validLinks, invalidEntries } = parseLinks(inputText);

  renderParseResults(validLinks, invalidEntries);

  if (validLinks.length === 0) {
    statusMessage.textContent = "No valid http or https links found.";
    return;
  }

  if (invalidEntries.length > 0) {
    statusMessage.textContent = `${validLinks.length} valid link(s), ${invalidEntries.length} invalid entry/entries.`;
    return;
  }

  statusMessage.textContent = `${validLinks.length} valid link(s) ready for the download phase.`;
});
