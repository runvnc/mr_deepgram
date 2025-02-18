

// Function to dynamically insert the ChatSTT component into ChatForm
export function insertChatSTT() {
    console.log("Inserting STT")
    // Find the chat-right-insert div in any ChatForm instances
    const leftInsert = document.querySelector('chat-ai').shadowRoot.querySelector('chat-form').shadowRoot.querySelectorAll('#chat-insert-left')
    if (leftInsert) {
        console.log("Found chat-insert-left")
        // Create and insert the ChatSTT component
        const chatSTT = document.createElement('chat-tts')
        leftInsert.appendChild(chatSTT)
        leftInsert.style.display = 'flex'
        leftInsert.style.alignItems = 'center'
        leftInsert.style.marginRight = '10px'
    }
}

// Add listener to initialize STT when page loads
window.addEventListener('load', () => {
    // Small delay to ensure ChatForm is fully initialized
    console.log("Adding event listener for STT Deepgram")
    setTimeout(insertChatSTT, 100)
})

// Optional: Re-run insertion when new ChatForm elements are added
// This uses MutationObserver to watch for new chat-form elements
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeName === 'CHAT-FORM') {
                // Wait for shadow DOM to be created
                setTimeout(() => insertChatSTT(), 100)
            }
        })
    })
})

observer.observe(document.body, {
    childList: true,
    subtree: true
})
