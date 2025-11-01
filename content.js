console.log("Content Script Loaded.");

// Inject Funnel Display font
const fontLink = document.createElement("link");
fontLink.href =
  "https://fonts.googleapis.com/css2?family=Funnel+Display:wght@300;400;500;600;700&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

// Inject animation styles
const style = document.createElement("style");
style.textContent = `
  @keyframes slideInUp {
    from {
      transform: translateY(100px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);

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
const descriptionContainer = document.querySelector(".elfjS");
const titleElement = document.querySelector('a[href*="/problems/"]');

if (titleElement && descriptionContainer) {
  const parts = titleElement.href.split("/").filter(Boolean);
  const title = parts.at(-1);

  fetch(chrome.runtime.getURL("resources/tags.json"))
    .then((res) => res.json())
    .then((data) => {
      let companies = [];
      for (let i = 0; i < data.length; i++) {
        if (data[i].title === title) {
          companies = data[i].companies;
          break;
        }
      }

      const companiesDiv = document.createElement("div");
      companiesDiv.style.display = "flex";
      companiesDiv.style.flexWrap = "wrap";
      companiesDiv.style.gap = "8px";
      companiesDiv.style.marginBottom = "1rem";

      const isDark = document.documentElement.classList.contains("dark");

      if (companies.length > 0) {
        companies.forEach((c) => {
          const cDiv = document.createElement("div");
          cDiv.textContent = c;
          cDiv.style.padding = "4px 10px";
          cDiv.style.borderRadius = "15px";
          cDiv.style.background = isDark ? "#383838ff" : "#e0e0e0";
          cDiv.style.fontSize = "12px";
          cDiv.style.fontFamily = "'Funnel Display', sans-serif";
          cDiv.style.fontWeight = "350";
          companiesDiv.appendChild(cDiv);
        });
      } else {
        const noneDiv = document.createElement("div");
        noneDiv.textContent = "No company data available";
        companiesDiv.appendChild(noneDiv);
      }

      descriptionContainer.append(companiesDiv);
    })
    .catch((err) => console.error("Error loading tags.json:", err));
}

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
  scroll.scrollTo({ top: 0, behavior: "instant" });
  void scroll.offsetHeight;
  await new Promise((res) => setTimeout(res, 500));

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
    await new Promise((res) => setTimeout(res, 150));
  }

  scroll.scrollTop = 0;
  scroll.scrollTo({ top: 0, behavior: "instant" });
  void scroll.offsetHeight;

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
    width: "340px",
    minHeight: "140px",
    backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
    color: isDark ? "#fff" : "hsl(222.2 84% 4.9%)",
    borderRadius: "12px",
    border: isDark ? "1px solid #333" : "1px solid hsl(214.3 31.8% 91.4%)",
    boxShadow: isDark
      ? "0 8px 24px rgba(0,0,0,0.5)"
      : "0 8px 24px rgba(0,0,0,0.15)",
    zIndex: "999999",
    padding: "20px",
    fontFamily: "'Funnel Display', sans-serif",
    animation: "slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
  });

  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "&times;";
  Object.assign(closeBtn.style, {
    position: "absolute",
    top: "8px",
    right: "12px",
    fontSize: "24px",
    background: "none",
    border: "none",
    color: "inherit",
    cursor: "pointer",
    opacity: "0.6",
    transition: "opacity 0.2s",
    fontFamily: "inherit",
  });
  closeBtn.addEventListener("mouseenter", () => (closeBtn.style.opacity = "1"));
  closeBtn.addEventListener(
    "mouseleave",
    () => (closeBtn.style.opacity = "0.6")
  );
  closeBtn.addEventListener("click", () => {
    popup.style.animation = "fadeOut 0.3s ease-out";
    setTimeout(() => popup.remove(), 300);
  });

  const content = document.createElement("div");
  content.id = "popup-content";
  content.innerHTML = `
    <h3 style="
      margin: 0 0 12px 0;
      font-size: 18px;
      font-weight: 600;
      letter-spacing: -0.02em;
    ">Analyzing...</h3>
    <p style="
      font-size: 14px;
      color: ${isDark ? "#a0a0a0" : "hsl(215.4 16.3% 46.9%)"};
      margin: 0;
    ">Please wait while we analyze your code</p>
  `;
  content.style.marginTop = "8px";

  popup.append(closeBtn, content);
  document.body.appendChild(popup);

  // Add fadeOut animation
  style.textContent += `
    @keyframes fadeOut {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(20px);
      }
    }
  `;
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
      content.innerHTML = `
        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">❌ Failed</h3>
        <p style="font-size: 14px; margin: 0;">Failed to analyze code</p>
      `;
      return;
    }

    // Handle API errors
    if (result.error) {
      content.innerHTML = `
        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">❌ Error</h3>
        <p style="font-size: 14px; margin: 0 0 4px 0;">${result.error}</p>
        ${
          result.details
            ? `<p style="font-size: 12px; color: ${
                isDark ? "#888" : "hsl(215.4 16.3% 46.9%)"
              }; margin: 0;">${result.details}</p>`
            : ""
        }
      `;
      return;
    }

    // Handle missing data
    if (!result.timeComplexity && !result.spaceComplexity) {
      content.innerHTML = `
        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">❌ No Data</h3>
        <p style="font-size: 14px; margin: 0;">No complexity data available</p>
      `;
      return;
    }

    // Success case
    content.innerHTML = `
      <div style="
        padding: 10px;
        border-radius: 8px;
        animation: fadeIn 0.3s ease-out;
      ">
        <p style="margin: 0 0 8px 0; font-size: 16px; line-height: 1.5;">
          <strong style="font-weight: 600;">Time Complexity:</strong> ${
            result.timeComplexity || "Unknown"
          }
        </p>
        <p style="margin: 0; font-size: 16px; line-height: 1.5;">
          <strong style="font-weight: 600;">Space Complexity:</strong> ${
            result.spaceComplexity || "Unknown"
          }
        </p>
      </div>
    `;
  } catch (err) {
    console.error("Error updating popup:", err);
    content.innerHTML = `
      <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">❌ Error</h3>
      <p style="font-size: 14px; margin: 0;">Unexpected error: ${err.message}</p>
    `;
  }
}
