

// Function to dynamically insert the ChatTTS component into ChatForm
export function insertChatTTS() {
    // Find the chat-right-insert div in any ChatForm instances
    const chatForms = document.querySelectorAll('chat-form')
    
    chatForms.forEach(form => {
        const rightInsert = form.shadowRoot.querySelector('#chat-right-insert')
        if (rightInsert) {
            // Create and insert the ChatTTS component
            const chatTTS = document.createElement('chat-tts')
            rightInsert.appendChild(chatTTS)
            rightInsert.style.display = 'flex'
            rightInsert.style.alignItems = 'center'
            rightInsert.style.marginRight = '10px'
        }
    })
}

// Add listener to initialize TTS when page loads
window.addEventListener('load', () => {
    // Small delay to ensure ChatForm is fully initialized
    setTimeout(insertChatTTS, 100)
})

// Optional: Re-run insertion when new ChatForm elements are added
// This uses MutationObserver to watch for new chat-form elements
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeName === 'CHAT-FORM') {
                // Wait for shadow DOM to be created
                setTimeout(() => insertChatTTS(), 100)
            }
        })
    })
})

observer.observe(document.body, {
    childList: true,
    subtree: true
})
