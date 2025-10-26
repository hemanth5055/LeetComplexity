chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ANALYZE_CODE") {
    const code = message.payload;

    (async () => {
      try {
        // Get API key from storage
        const { geminiApiKey } = await chrome.storage.sync.get([
          "geminiApiKey",
        ]);

        if (!geminiApiKey) {
          sendResponse({
            result: {
              error: "API Key not set",
              details: "Please add your Google API key in the extension popup",
            },
          });
          return;
        }

        const response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": geminiApiKey,
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `Analyze the following JavaScript code and return ONLY XML with TimeComplexity and SpaceComplexity tags. No additional text.\n\nCode:\n${code}\n\nFormat:\n<Analysis>\n<TimeComplexity>O(n)</TimeComplexity>\n<SpaceComplexity>O(1)</SpaceComplexity>\n</Analysis>`,
                    },
                  ],
                },
              ],
            }),
          }
        );

        const data = await response.json();
        console.log("API Response:", data);

        let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        console.log("Extracted text:", text);

        // Remove markdown code blocks if present
        text = text
          .replace(/```xml\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();

        // Extract using regex
        const timeMatch = text.match(/<TimeComplexity>(.*?)<\/TimeComplexity>/);
        const spaceMatch = text.match(
          /<SpaceComplexity>(.*?)<\/SpaceComplexity>/
        );

        const result = {
          timeComplexity: timeMatch ? timeMatch[1] : "Unknown",
          spaceComplexity: spaceMatch ? spaceMatch[1] : "Unknown",
        };

        sendResponse({ result });
      } catch (err) {
        sendResponse({
          result: { error: "Failed to call API", details: err.message },
        });
      }
    })();

    return true;
  }
});
