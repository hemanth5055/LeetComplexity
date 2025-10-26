console.log("Content Script Loaded.");

const AnalyzeBtn = document.createElement("button");
AnalyzeBtn.id = "analyze-btn";

const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
Object.assign(AnalyzeBtn.style, {
  width: "31px",
  height: "31px",
  backgroundColor: isDark ? "#262626" : "#e0e0e0",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  marginLeft: "6px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0",
});

const iconImg = document.createElement("img");
iconImg.src = chrome.runtime.getURL("curve.png");
iconImg.style.width = "18px";
iconImg.style.height = "18px";
AnalyzeBtn.appendChild(iconImg);

const container = document.getElementById("ide-top-btns");
container?.appendChild(AnalyzeBtn);

AnalyzeBtn.addEventListener("click", async () => {
  showPopUp();
  const code = await scrollAndExtractMonacoCode();
  console.log(code);

  chrome.runtime.sendMessage(
    { type: "ANALYZE_CODE", payload: code },
    (response) => {
      if (chrome.runtime.lastError) return;
      updatePopupResult(response?.result);
    }
  );
});

async function scrollAndExtractMonacoCode() {
  const scroll = document.querySelector(".monaco-scrollable-element");
  if (!scroll) return "";

  const lines = new Map();
  let unchanged = 0,
    prevSize = 0;
  scroll.scrollTop = 0;
  await new Promise((res) => setTimeout(res, 200));

  for (let i = 0; i < 500; i++) {
    const view = document.querySelector(".view-lines");
    if (!view) break;

    view.querySelectorAll('div.view-line[style*="top:"]').forEach((div) => {
      const top = parseInt(div.style.top);
      if (!isNaN(top) && !lines.has(top))
        lines.set(top, div.querySelector("span")?.textContent || "");
    });

    if (lines.size === prevSize) {
      if (++unchanged >= 3) break;
    } else unchanged = 0;

    prevSize = lines.size;
    const end =
      scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 5;
    if (end && unchanged >= 2) break;

    scroll.scrollTop += Math.floor(scroll.clientHeight * 0.6);
    await new Promise((res) => setTimeout(res, 100));
  }

  scroll.scrollTop = 0;
  return [...lines.entries()]
    .sort((a, b) => a[0] - b[0])
    .map((e) => e[1])
    .join("\n");
}

function showPopUp() {
  if (document.getElementById("my-popup-container")) return;
  const popup = document.createElement("div");
  popup.id = "my-popup-container";

  Object.assign(popup.style, {
    position: "fixed",
    right: "30px",
    bottom: "20px",
    width: "300px",
    height: "100px",
    backgroundColor: isDark ? "#393939ff" : "#f2f2f2",
    color: isDark ? "#fff" : "#000",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
    zIndex: "999999",
    padding: "16px",
  });

  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "&times;";
  Object.assign(closeBtn.style, {
    position: "absolute",
    top: "8px",
    right: "12px",
    fontSize: "22px",
    background: "none",
    border: "none",
    color: "inherit",
    cursor: "pointer",
  });
  closeBtn.addEventListener("click", () => popup.remove());

  const content = document.createElement("div");
  content.id = "popup-content";
  content.innerHTML = "<h3>Analyzing...</h3>";
  content.style.marginTop = "20px";

  popup.append(closeBtn, content);
  document.body.appendChild(popup);
}

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
