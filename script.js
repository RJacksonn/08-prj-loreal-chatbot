/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Store the conversation history
let messages = [
  {
    role: "system",
    content:
      "You are a helpful assistant for L'Oréal. Only answer questions about L'Oréal products and skincare routines. If asked about anything else, politely explain you can only discuss L'Oréal products and skincare.",
  },
];

// Show a welcome message
chatWindow.innerHTML = `<div class="msg ai">👋 Hello! How can I help you with L'Oréal products or skincare today?</div>`;

// Function to add a message to the chat window
function addMessage(role, text) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `msg ${role}`;
  msgDiv.textContent = text;
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Helper function to check if user input is on-topic
function isOnTopic(text) {
  // Simple keyword check for L'Oréal, skincare, or routine
  const keywords = [
    "l'oréal",
    "loreal",
    "skincare",
    "skin care",
    "routine",
    "product",
    "serum",
    "moisturizer",
    "cleanser",
    "cream",
    "makeup",
    "hair",
    "shampoo",
    "conditioner",
  ];
  const lower = text.toLowerCase();
  return keywords.some((word) => lower.includes(word));
}

// Function to call the API with retry logic
async function fetchWithRetry(messages, maxRetries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      if (!response.ok) {
        lastError = `Server error: ${response.status}`;
        continue;
      }
      const data = await response.json();
      if (data.error && data.error.message) {
        lastError = `API error: ${data.error.message}`;
        continue;
      }
      return data;
    } catch (err) {
      lastError = err.message || "Unknown error";
    }
  }
  throw new Error(lastError || "Failed to connect after retries.");
}

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userText = userInput.value.trim();
  if (!userText) return;

  // Add user message to chat
  addMessage("user", userText);
  messages.push({ role: "user", content: userText });
  userInput.value = "";

  // Check if the question is on-topic before calling the API
  if (!isOnTopic(userText)) {
    addMessage(
      "ai",
      "Sorry, I can only answer questions about L'Oréal products and skincare."
    );
    return;
  }

  // Show loading message
  addMessage("ai", "Thinking...");

  try {
    // Use retry logic for API call
    const data = await fetchWithRetry(messages, 2);
    // Remove the loading message
    const loadingMsg = chatWindow.querySelector(".msg.ai:last-child");
    if (loadingMsg) chatWindow.removeChild(loadingMsg);

    // Get the assistant's reply
    const aiReply =
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
        ? data.choices[0].message.content.trim()
        : "Sorry, I couldn't get a response. Please try again.";
    addMessage("ai", aiReply);
    messages.push({ role: "assistant", content: aiReply });
  } catch (err) {
    // Remove the loading message
    const loadingMsg = chatWindow.querySelector(".msg.ai:last-child");
    if (loadingMsg) chatWindow.removeChild(loadingMsg);
    addMessage(
      "ai",
      `Sorry, there was a problem connecting to the assistant. (${err.message}) Please try again later.`
    );
  }
});
