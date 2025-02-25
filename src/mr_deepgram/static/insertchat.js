

// Function to dynamically insert the ChatSTT component into ChatForm
export function insertChatSTT() {
    console.log("Inserting STT")
    // Find the chat-right-insert div in any ChatForm instances
    const leftInsert = document.querySelector('chat-ai').shadowRoot.querySelector('chat-form').shadowRoot.querySelectorAll('#chat-insert-top')[0]
    if (leftInsert) {
        console.log("Found chat-insert-top")
        // Create and insert the ChatSTT component
        const chatSTT = document.createElement('chat-tts')
        leftInsert.appendChild(chatSTT)
        leftInsert.style.display = "block"
        leftInsert.style.width = "50px"
        leftInsert.style.height = "50px"
        leftInsert.style.marginLeft = "auto"
        leftInsert.style.marginRight = "auto"
        leftInsert.style.marginBottm = "50px"
    }
    const uploadContainer = document.querySelector('chat-ai').shadowRoot.querySelector('chat-form').shadowRoot.querySelectorAll('.upload-container')[0]
    if (!uploadContainer) {
      console.log("Could not find uploadContainer")
    } else {
      uploadContainer.style.display = "none"
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
