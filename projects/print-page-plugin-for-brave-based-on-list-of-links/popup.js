"use strict";

const linksInput = document.querySelector("#links-input");
const downloadButton = document.querySelector("#download-button");
const statusMessage = document.querySelector("#status");
const parseResults = document.querySelector("#parse-results");
const concurrencySlider = document.querySelector("#concurrency-slider");
const concurrencyValue = document.querySelector("#concurrency-value");
const concurrencyWarning = document.querySelector("#concurrency-warning");
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

function isMaximumConcurrencySelected() {
  return concurrencySlider.value === concurrencySlider.max;
}

function getConcurrencyLimit() {
  if (isMaximumConcurrencySelected()) {
    return Infinity;
  }

  return Number.parseInt(concurrencySlider.value, 10);
}

function updateConcurrencyControl() {
  const validLinkCount = parseLinks(linksInput.value).validLinks.length;
  const isMaximum = isMaximumConcurrencySelected();

  concurrencyValue.value = isMaximum ? "Max" : concurrencySlider.value;
  concurrencyWarning.hidden = !isMaximum || validLinkCount <= 3;
  concurrencyWarning.textContent =
    `This setting will open ${validLinkCount} tabs and can slow down your ` +
    "system or crash the whole browser! Use with caution.";
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
    let settled = false;

    function finish(error) {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeoutId);
      tabsApi.onUpdated.removeListener(listener);

      if (error) {
        reject(error);
      } else {
        resolve();
      }
    }

    const timeoutId = setTimeout(() => {
      finish(new Error("Timed out waiting for the initial page load."));
    }, 45000);

    function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        finish();
      }
    }

    tabsApi.onUpdated.addListener(listener);

    tabsApi.get(tabId, (tab) => {
      const error = chrome.runtime.lastError;

      if (error) {
        finish(new Error(error.message));
      } else if (tab.status === "complete") {
        finish();
      }
    });
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

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function getPageReadinessState(tabId) {
  const result = await sendDebuggerCommand(tabId, "Runtime.evaluate", {
    expression: `(() => {
      const body = document.body;
      const text = body?.innerText ?? "";

      return {
        documentComplete: document.readyState === "complete",
        signature: [
          text.length,
          body?.scrollHeight ?? 0,
          document.querySelectorAll("*").length,
          document.images.length,
          document.links.length,
          performance.getEntriesByType("resource").length
        ].join(":")
      };
    })()`,
    returnByValue: true
  });

  return result.result.value;
}

async function waitForPageReady(tabId) {
  const timeoutMilliseconds = 45000;
  const pollMilliseconds = 750;
  const minimumSettleMilliseconds = 3000;
  const requiredStableChecks = 4;
  const startedAt = Date.now();
  let previousSignature = "";
  let stableChecks = 0;

  while (Date.now() - startedAt < timeoutMilliseconds) {
    const state = await getPageReadinessState(tabId);

    if (state.documentComplete && state.signature === previousSignature) {
      stableChecks += 1;
    } else {
      stableChecks = 0;
    }

    previousSignature = state.signature;

    const hasSettledLongEnough =
      Date.now() - startedAt >= minimumSettleMilliseconds;

    if (
      hasSettledLongEnough &&
      stableChecks >= requiredStableChecks
    ) {
      return;
    }

    await delay(pollMilliseconds);
  }

  throw new Error(
    "Timed out waiting for the page's dynamic content to finish rendering."
  );
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
    await sendDebuggerCommand(tab.id, "Runtime.enable");
    await waitForPageReady(tab.id);

    const pdf = await printTabToPdf(tab.id);
    return `data:application/pdf;base64,${pdf.data}`;
  } finally {
    if (isDebuggerAttached) {
      await detachDebugger(tab.id);
    }

    await removeTab(tab.id);
  }
}

async function startDownloads(validLinks, concurrencyLimit) {
  const folderName = sanitizePathPart(getMostFrequentHost(validLinks)) || "link-downloads";
  let completedCount = 0;
  let nextIndex = 0;
  const workerCount = Math.min(concurrencyLimit, validLinks.length);
  const failures = [];

  downloadButton.disabled = true;

  try {
    async function processNextLink() {
      while (nextIndex < validLinks.length) {
        const index = nextIndex;
        nextIndex += 1;
        const link = validLinks[index];
        const filename = `${folderName}/${getPdfFileName(link)}`;

        statusMessage.textContent =
          `Preparing ${workerCount} page(s) in parallel; ` +
          `${completedCount} of ${validLinks.length} saved...`;

        try {
          const pdfDataUrl = await printUrlToPdfDataUrl(link);

          await downloadLink(pdfDataUrl, filename);
          completedCount += 1;
        } catch (error) {
          failures.push({ link, error });
        }

        statusMessage.textContent =
          `Saved ${completedCount} of ${validLinks.length} PDF(s) ` +
          `to ${folderName}...`;
      }
    }

    await Promise.all(
      Array.from({ length: workerCount }, () => processNextLink())
    );

    if (failures.length > 0) {
      throw new Error(
        `${failures.length} of ${validLinks.length} PDF(s) failed. ` +
        `First failure: ${failures[0].error.message}`
      );
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
    await startDownloads(validLinks, getConcurrencyLimit());
  } catch (error) {
    statusMessage.textContent = `Download failed: ${error.message}`;
  }
});

linksInput.addEventListener("input", updateConcurrencyControl);
concurrencySlider.addEventListener("input", updateConcurrencyControl);
updateConcurrencyControl();
