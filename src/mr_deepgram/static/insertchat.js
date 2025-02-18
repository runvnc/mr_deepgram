

// Function to dynamically insert the ChatSTT component into ChatForm
export function insertChatSTT() {
    console.log("Inserting STT")
    // Find the chat-right-insert div in any ChatForm instances
    const chatForms = document.querySelectorAll('chat-form')
    
    chatForms.forEach(form => {
        const rightInsert = form.shadowRoot.querySelector('#chat-right-insert')
        if (rightInsert) {
            console.log("Found chat-right-insert")
            // Create and insert the ChatSTT component
            const chatSTT = document.createElement('chat-tts')
            rightInsert.appendChild(chatSTT)
            rightInsert.style.display = 'flex'
            rightInsert.style.alignItems = 'center'
            rightInsert.style.marginRight = '10px'
        }
    })
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
