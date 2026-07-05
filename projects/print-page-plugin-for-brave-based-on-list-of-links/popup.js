"use strict";

const linksInput = document.querySelector("#links-input");
const downloadButton = document.querySelector("#download-button");
const statusMessage = document.querySelector("#status");
const parseResults = document.querySelector("#parse-results");
const downloadsApi = chrome.downloads;
const debuggerApi = chrome.debugger;
const tabsApi = chrome.tabs;

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
  const list = document.createElement("ol");

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

function getMostFrequentHost(validLinks) {
  const hostCounts = new Map();
  let winningHost = "";
  let winningCount = 0;

  for (const link of validLinks) {
    const host = new URL(link).hostname.toLowerCase();
    const nextCount = (hostCounts.get(host) ?? 0) + 1;

    hostCounts.set(host, nextCount);

    if (nextCount > winningCount) {
      winningHost = host;
      winningCount = nextCount;
    }
  }

  return winningHost;
}

function sanitizePathPart(value) {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function getPdfFileName(link) {
  return `${escapeFullUrlForFileName(link)}.pdf`;
}

function escapeFullUrlForFileName(link) {
  return link.replace(/[:\/\?=]/g, '-').replaceAll('---', '-');
}

function downloadLink(url, filename) {
  return new Promise((resolve, reject) => {
    downloadsApi.download(
      {
        url,
        filename,
        conflictAction: "uniquify",
        saveAs: false
      },
      (downloadId) => {
        const error = chrome.runtime.lastError;

        if (error) {
          reject(new Error(error.message));
          return;
        }

        resolve(downloadId);
      }
    );
  });
}

function createTab(url) {
  return new Promise((resolve, reject) => {
    tabsApi.create({ active: false, url }, (tab) => {
      const error = chrome.runtime.lastError;

      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve(tab);
    });
  });
}

function removeTab(tabId) {
  return new Promise((resolve) => {
    tabsApi.remove(tabId, () => {
      resolve();
    });
  });
}

function waitForTabComplete(tabId) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      tabsApi.onUpdated.removeListener(listener);
      reject(new Error("Timed out waiting for page load."));
    }, 45000);

    function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        clearTimeout(timeoutId);
        tabsApi.onUpdated.removeListener(listener);
        resolve();
      }
    }

    tabsApi.onUpdated.addListener(listener);
  });
}

function attachDebugger(tabId) {
  return new Promise((resolve, reject) => {
    debuggerApi.attach({ tabId }, "1.3", () => {
      const error = chrome.runtime.lastError;

      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve();
    });
  });
}

function detachDebugger(tabId) {
  return new Promise((resolve) => {
    debuggerApi.detach({ tabId }, () => {
      resolve();
    });
  });
}

function sendDebuggerCommand(tabId, method, params = {}) {
  return new Promise((resolve, reject) => {
    debuggerApi.sendCommand({ tabId }, method, params, (result) => {
      const error = chrome.runtime.lastError;

      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve(result);
    });
  });
}

function printTabToPdf(tabId) {
  return sendDebuggerCommand(tabId, "Page.printToPDF", {
    printBackground: true,
    preferCSSPageSize: true
  });
}

async function printUrlToPdfDataUrl(link) {
  const tab = await createTab(link);
  let isDebuggerAttached = false;

  try {
    await waitForTabComplete(tab.id);
    await attachDebugger(tab.id);
    isDebuggerAttached = true;

    const pdf = await printTabToPdf(tab.id);
    return `data:application/pdf;base64,${pdf.data}`;
  } finally {
    if (isDebuggerAttached) {
      await detachDebugger(tab.id);
    }

    await removeTab(tab.id);
  }
}

async function startDownloads(validLinks) {
  const folderName = sanitizePathPart(getMostFrequentHost(validLinks)) || "link-downloads";
  let completedCount = 0;

  downloadButton.disabled = true;

  try {
    for (const [index, link] of validLinks.entries()) {
      const filename = `${folderName}/${getPdfFileName(link)}`;
      const pdfDataUrl = await printUrlToPdfDataUrl(link);

      statusMessage.textContent = `Saving PDF ${index + 1} of ${validLinks.length} to ${folderName}...`;
      await downloadLink(pdfDataUrl, filename);
      completedCount += 1;
    }

    statusMessage.textContent = `Saved ${completedCount} PDF(s) in ~/Downloads/${folderName}.`;
  } finally {
    downloadButton.disabled = false;
  }
}

downloadButton.addEventListener("click", async () => {
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

  try {
    await startDownloads(validLinks);
  } catch (error) {
    statusMessage.textContent = `Download failed: ${error.message}`;
  }
});
