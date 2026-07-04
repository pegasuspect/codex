"use strict";

const linksInput = document.querySelector("#links-input");
const downloadButton = document.querySelector("#download-button");
const statusMessage = document.querySelector("#status");

downloadButton.addEventListener("click", () => {
  const inputText = linksInput.value.trim();

  if (!inputText) {
    statusMessage.textContent = "Add one or more links before continuing.";
    return;
  }

  statusMessage.textContent = "Input parsing and downloads will be added in the next phases.";
});
