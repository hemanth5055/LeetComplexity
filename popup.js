// Load saved API key on popup open
document.addEventListener("DOMContentLoaded", async () => {
  const apiKeyInput = document.getElementById("api-key-input");
  const saveButton = document.getElementById("save-api-key");
  const statusDiv = document.getElementById("api-key-status");

  // Load existing API key
  try {
    const result = await chrome.storage.sync.get(["geminiApiKey"]);
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
      statusDiv.textContent = "✓ API Key loaded";
      statusDiv.className = "status success";
    }
  } catch (err) {
    console.error("Failed to load API key:", err);
  }

  // Save API key
  saveButton.addEventListener("click", async () => {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      statusDiv.textContent = "⚠ Please enter an API key";
      statusDiv.className = "status error";
      return;
    }

    try {
      await chrome.storage.sync.set({ geminiApiKey: apiKey });
      statusDiv.textContent = "✓ API Key saved successfully";
      statusDiv.className = "status success";
    } catch (err) {
      console.error("Failed to save API key:", err);
      statusDiv.textContent = "✗ Failed to save API key";
      statusDiv.className = "status error";
    }
  });
});

// Update popup with analysis results
function updatePopupResult(result) {
  console.log(result);
  const content = document.getElementById("popup-content");

  if (!content) {
    console.error("popup-content element not found");
    return;
  }

  try {
    // Handle no result
    if (!result) {
      content.innerHTML = "<p>❌ Failed to analyze code</p>";
      return;
    }

    // Handle API errors
    if (result.error) {
      content.innerHTML = `
        <p>❌ Error: ${result.error}</p>
        ${
          result.details
            ? `<p style="font-size: 12px; color: #666;">${result.details}</p>`
            : ""
        }
      `;
      return;
    }

    // Handle missing data
    if (!result.timeComplexity && !result.spaceComplexity) {
      content.innerHTML = "<p>❌ No complexity data available</p>";
      return;
    }

    // Success case
    content.innerHTML = `
      <p><strong>Time Complexity:</strong> ${
        result.timeComplexity || "Unknown"
      }</p>
      <p><strong>Space Complexity:</strong> ${
        result.spaceComplexity || "Unknown"
      }</p>
    `;
  } catch (err) {
    console.error("Error updating popup:", err);
    content.innerHTML = `<p>❌ Unexpected error: ${err.message}</p>`;
  }
}
