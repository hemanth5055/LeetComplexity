console.log("Content Script Loaded.");

const AnalyzeBtn = document.createElement("button");
AnalyzeBtn.id = "analyze-btn";

// Button styling
AnalyzeBtn.style.width = "31px";
AnalyzeBtn.style.height = "31px";
AnalyzeBtn.style.backgroundColor = "#262626";
AnalyzeBtn.style.border = "none";
AnalyzeBtn.style.borderRadius = "4px";
AnalyzeBtn.style.cursor = "pointer";
AnalyzeBtn.style.marginLeft = "6px";
AnalyzeBtn.style.display = "flex";
AnalyzeBtn.style.alignItems = "center";
AnalyzeBtn.style.justifyContent = "center";
AnalyzeBtn.style.padding = "0";

// Add icon image
const iconImg = document.createElement("img");
iconImg.src = chrome.runtime.getURL("curve.png"); 
iconImg.style.width = "18px";
iconImg.style.height = "18px";
iconImg.style.pointerEvents = "none";

AnalyzeBtn.appendChild(iconImg);

// Insert into container
const container = document.getElementById("ide-top-btns");
if (container) {
  container.appendChild(AnalyzeBtn);
} else {
  console.warn("ide-top-btns not found!");
}

// Click handler
AnalyzeBtn.addEventListener("click", async () => {
  console.log("🚀 Analyze button clicked!");
  const code = await scrollAndExtractMonacoCode();
  console.log(code);
});

/**
 * Extracts code from Monaco editor by scrolling and maintaining an ordered set of lines
 * @returns {Promise<string>} The complete code from the editor
 */
async function scrollAndExtractMonacoCode() {
  const scrollContainer = document.querySelector(".monaco-scrollable-element");
  if (!scrollContainer) {
    console.error("❌ Monaco scroll container not found!");
    return "";
  }

  // Ordered set: Map with line position as key
  const orderedLines = new Map();
  let unchangedCount = 0;
  let previousSize = 0;

  // Start from top
  scrollContainer.scrollTop = 0;
  await new Promise((resolve) => setTimeout(resolve, 200));

  let iteration = 0;
  const maxIterations = 500;

  while (iteration < maxIterations) {
    iteration++;

    const viewLines = document.querySelector(".view-lines");
    if (!viewLines) break;

    // Get all visible line divs
    const lineDivs = viewLines.querySelectorAll('div.view-line[style*="top:"]');

    // Add lines to ordered set
    lineDivs.forEach((lineDiv) => {
      const topValue = parseInt(lineDiv.style.top);
      if (isNaN(topValue)) return;

      // Skip if we already have this line position
      if (orderedLines.has(topValue)) return;

      // Extract text from the outer span only (avoids nested duplicates)
      const outerSpan = lineDiv.querySelector("span");
      if (!outerSpan) return;

      const lineText = outerSpan.textContent || "";

      // Add to ordered set
      orderedLines.set(topValue, lineText);
    });

    const currentSize = orderedLines.size;
    // console.log(`Iteration ${iteration}: ${currentSize} lines`);

    // Check if we found new lines
    if (currentSize === previousSize) {
      unchangedCount++;
      if (unchangedCount >= 3) break;
    } else {
      unchangedCount = 0;
      previousSize = currentSize;
    }

    // Check if at bottom
    const isAtBottom =
      scrollContainer.scrollTop + scrollContainer.clientHeight >=
      scrollContainer.scrollHeight - 5;
    if (isAtBottom && unchangedCount >= 2) break;

    // Scroll down
    scrollContainer.scrollTop += Math.floor(scrollContainer.clientHeight * 0.6);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Sort by position and extract text
  const sortedLines = Array.from(orderedLines.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([_, text]) => text);

  const finalCode = sortedLines.join("\n");
  //   console.log(`✅ Extracted ${sortedLines.length} lines`);

  // Reset scroll
  scrollContainer.scrollTop = 0;

  return finalCode;
}
