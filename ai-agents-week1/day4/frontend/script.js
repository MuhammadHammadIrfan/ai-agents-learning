const chatBox = document.getElementById('chat');
const input = document.getElementById('input');
const sendButton = document.getElementById('sendBtn');

const USER_ID = 'user1';

// Convert markdown to HTML
function parseMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // **bold**
    .replace(/\*(.+?)\*/g, '<em>$1</em>') // *italic*
    .replace(/`(.+?)`/g, '<code>$1</code>') // `code`
    .replace(/\n/g, '<br>') // line breaks
    .replace(/###\s(.+)/g, '<h3>$1</h3>') // ### heading
    .replace(/##\s(.+)/g, '<h2>$1</h2>') // ## heading
    .replace(/#\s(.+)/g, '<h1>$1</h1>'); // # heading
}

//Auto-scroll to bottom
function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

sendButton.addEventListener('click', async () => {
  const message = input.value.trim();
  if (!message) return;

  chatBox.innerHTML += `<div class="msg user">${message}</div>`;
  scrollToBottom();
  input.value = '';

  const botDiv = document.createElement('div');
  botDiv.className = 'msg bot';
  botDiv.innerHTML = '...';
  chatBox.appendChild(botDiv);
  scrollToBottom();

  try {
    const response = await fetch('http://localhost:3000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: USER_ID,
        message: message,
      }),
    });

    if (!response.ok) {
      botDiv.textContent = `Error: ${response.status}`;
      return;
    }
    if (!response.body) {
      botDiv.textContent = 'Error: No response stream';
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let finalMessage = '';

    botDiv.innerHTML = ''; // Clear the "..." placeholder

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      finalMessage += chunk;
      botDiv.innerHTML = parseMarkdown(finalMessage);
      scrollToBottom();
    }
  } catch (error) {
    botDiv.innerHTML = 'Error: ' + error.message;
    scrollToBottom();
  }
});
