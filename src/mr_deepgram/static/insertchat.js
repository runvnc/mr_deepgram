

// Function to dynamically insert the ChatSTT component into ChatForm
export async function insertChatSTT() {
    console.log("Inserting STT")
    
    // Fetch toggle mode setting from server
    let toggleMode = false
    try {
        const response = await fetch('/deepgram/toggle-mode')
        if (response.ok) {
            const data = await response.json()
            toggleMode = data.enabled
            console.log('Toggle mode enabled:', toggleMode)
        }
    } catch (error) {
        console.warn('Could not fetch toggle mode setting:', error)
    }
    
    const chatForm = document.querySelector('chat-ai').shadowRoot.querySelector('chat-form')
    const topInsert = chatForm.shadowRoot.querySelectorAll('#chat-insert-top')[0]
    chatForm.style.display = "block"
    console.log("ok 1")
    if (topInsert) {
        console.log("Found chat-insert-top")
        // Create and insert the ChatSTT component
        const chatSTT = document.createElement('chat-tts')
        
        // Apply toggle mode if enabled
        if (toggleMode) {
            chatSTT.setAttribute('toggle-mode', '')
        }
        
        topInsert.appendChild(chatSTT)
        topInsert.style.display = "block"
        topInsert.style.width = "50px"
        topInsert.style.height = "50px"
        topInsert.style.marginLeft = "auto"
        topInsert.style.marginRight = "auto"
        topInsert.style.marginBottm = "50px"
    }
    const uploadContainer = chatForm.shadowRoot.querySelectorAll('.upload-container')[0]
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
