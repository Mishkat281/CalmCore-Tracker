document.addEventListener("DOMContentLoaded", () => {
  const chatBody = document.querySelector(".chat-body");
  const messageInput = document.querySelector(".message-input");
  const sendMessage = document.querySelector("#send-message");

  const chatHistory = [];

  const API_URL = `${window.location.origin}/AI_Chat`;

  let isUserScrolling = false;

  chatBody.addEventListener("scroll", () => {
    isUserScrolling =
      chatBody.scrollTop + chatBody.clientHeight < chatBody.scrollHeight;
  });

  const scrollToBottom = () => {
    if (!isUserScrolling) {
      chatBody.scrollTo({
        top: chatBody.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const createMessageElement = (content, className) => {
    const div = document.createElement("div");
    div.className = `message ${className}`;
    div.innerHTML = `<div class="message-text">${content}</div>`;
    return div;
  };

  const handleOutgoingMessage = async (e) => {
    e.preventDefault();

    const userMessage = messageInput.value.trim();
    if (!userMessage) return;

    chatBody.appendChild(createMessageElement(userMessage, "user-message"));

    // ✅ FIXED (user message)
    chatHistory.push({
      role: "user",
      content: userMessage,
    });

    messageInput.value = "";
    scrollToBottom();

    await generateBotResponse();
  };

  const generateBotResponse = async () => {
    const botMessageDiv = createMessageElement("Thinking...", "bot-message");

    chatBody.appendChild(botMessageDiv);
    scrollToBottom();

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatHistory }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Server error");
      }

      botMessageDiv.querySelector(".message-text").innerHTML =
        data.text.replace(/\n/g, "<br>");

      // ✅ FIXED (assistant role)
      chatHistory.push({
        role: "assistant",
        content: data.text,
      });

    } catch (error) {
      botMessageDiv.querySelector(".message-text").innerHTML =
        "❌ Error connecting to AI";
      console.error(error);
    }

    scrollToBottom();
  };

  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleOutgoingMessage(e);
    }
  });

  sendMessage.addEventListener("click", handleOutgoingMessage);
});