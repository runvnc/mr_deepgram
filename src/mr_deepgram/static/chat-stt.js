import { LitElement, html, css } from './lit-core.min.js'
import { BaseEl } from './base.js'
const { createClient } = deepgram;

class ChatSTT extends BaseEl {
  static properties = {
    isRecording: { type: Boolean, reflect: true, attribute: 'recording' },
    transcript: { type: String },
    dontInterrupt: { type: Boolean },
    isInitialized: { type: Boolean }
  }

  static styles = css`
    :host {
      display: block;
    }

    #debug-overlay {
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(255, 0, 0, 0.9);
      color: white;
      padding: 10px;
      border-radius: 5px;
      z-index: 9999;
      max-width: 80%;
      max-height: 200px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 12px;
      pointer-events: none;
      text-shadow: 1px 1px 2px black;
    }

    .debug-line {
      margin: 2px 0;
      white-space: pre-wrap;
    }

    .object {
      display: flex;
      flex: 0 1 100%;
      justify-content: center;
      align-items: center;
      align-content: stretch;
      position: relative;
      width: 100px;
    }

    .outline {
      display: none;
    }

    :host([recording]) .outline {
      display: block;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: 8px solid #b5a4a4;
      animation: pulse 3s;
      animation-timing-function: ease-out;
      animation-iteration-count: infinite;
      position: absolute;
    }

    .button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #50cddd;
      box-shadow: 0px 0px 40px #0084f9;
      position: absolute;
    }

    :host([recording]) .button {
      background: #dd5050;
      box-shadow: 0px 0px 40px #f90000;
    }

    @keyframes pulse {
      0% {
        transform: scale(0);
        opacity: 0;
        border: 65px solid #000000;
      }
      50% {
        border: solid #ffffff;
        opacity: 0.8;
      }
      90% {
        transform: scale(3.2);
        opacity: 0.2;
        border: 3px solid #000000;
      }
      100% {
        transform: scale(3.3);
        opacity: 0;
        border: 1px solid #ffffff;
      }
    }

    #delayed {
      animation-delay: 1.5s;
    }

    #circlein {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #6bd6e1;
      box-shadow: 0px -2px 15px #e0ff94;
      position: absolute;
    }

    :host([recording]) #circlein {
      background: #e16b6b;
      box-shadow: 0px -2px 15px #e0ff94;
    }

    .mic-icon {
      height: 30px;
      position: absolute;
      margin: 10px;
    }
  `

  _debugLog(msg) {
    try {
      const overlay = this.shadowRoot.getElementById('debug-overlay');
      //if (!overlay) return;
      console.log('Debug:', msg); // Backup console log
      const line = document.createElement('div');
      line.className = 'debug-line';
      line.textContent = `${new Date().toLocaleTimeString()}: ${msg}`;
      
      overlay.insertBefore(line, overlay.firstChild);
      
      // Keep only last 10 messages
      while (overlay.children.length > 10) {
        overlay.removeChild(overlay.lastChild);
      }
      
      // Auto-clear after 5 seconds
      setTimeout(() => line.remove(), 5000);
    } catch (e) {
      console.error("Error logging debug message:", e, msg)
    }
  }

  constructor() {
    super()
    this.isRecording = false
    this.transcript = ''
    this.dontInterrupt = true
    this.isInitialized = false
    this.deepgramToken = null
    this.initializing = false
    this.userMedia = null
    this.fetchTempToken().then(key => { this.deepgramToken = key })
    this.microphone = null
    this.socket = null
    this.deepgram = null
    this.name = "chat-stt"
    this.keepAlive = true
    this.partialTranscript = ''
    this.chatForm = document.querySelector('chat-ai').shadowRoot.querySelector('chat-form')
    this.textInput = this.chatForm.shadowRoot.querySelectorAll('#inp_message')[0]
    this.sendButton = this.chatForm.shadowRoot.querySelectorAll('.send_msg')[0]
    console.log('textInput', this.textInput)
 
  }

  async getMicrophone() {
    try {
      // Check if we have the new API
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this._debugLog("Using modern getUserMedia API");
        this.userMedia = await navigator.mediaDevices.getUserMedia({ audio: true });
      } 
      // Fall back to older APIs
      else {
        this._debugLog("Falling back to older getUserMedia API");
        const getUserMedia = navigator.getUserMedia || 
                           navigator.webkitGetUserMedia ||
                           navigator.mozGetUserMedia ||
                           navigator.msGetUserMedia;
        
        if (!getUserMedia) {
          throw new Error('getUserMedia is not supported in this browser');
        }
        
        this.userMedia = await new Promise((resolve, reject) => {
          getUserMedia.call(navigator, { audio: true }, resolve, reject);
        });
      }
      
      this._debugLog("Got microphone access successfully");
      return new MediaRecorder(this.userMedia);
    } catch (error) {
      this._debugLog(`Microphone error: ${error.name} - ${error.message}`);
      throw error;
    }
  }

  async openMicrophone() {
    this._debugLog('Opening microphone...')
    this.transcript = ''
    this.partialTranscript = ''
    this.isRecording = true
    this.requestUpdate()
  
    try {
      window.shutUp()
    } catch (e) {
    }
    try {
      if (this.microphone) {
        try {
          this.microphone.stop()
          this.microphone.removeAllListeners()
          this.microphone = null
        } catch (e) {
          console.warn("error closing microphone", e)
        }
      }
      this._debugLog("Getting microphone access...")
      this.microphone = await this.getMicrophone()
      await this.microphone.start(25)
      
      this.microphone.onstart = () => {
        console.log("client: microphone opened")
        this.isRecording = true
        this.requestUpdate()
      }

      this.microphone.onstop = () => {
        this._debugLog("Microphone closed")
        this.isRecording = false
        this.requestUpdate()
        this.microphone = null
      }

      this.microphone.ondataavailable = (e) => {
        const data = e.data
        if (this.socket) {
          this._debugLog("Sending audio data...")
          try {
            this.socket.send(data)
          } catch (e) {
            console.error("Error sending audio data to deepgram:", e)
          }
        } else {
          console.log("client: socket not initialized, can't send audio data to deepgram")
        }
      }
    } catch (e) {
      console.error("Error opening microphone:", e)
      this._debugLog(`Error: ${e.message}`)
      this.isRecording = false 
      this.requestUpdate()
    }
  }

  async closeMicrophone() {
    console.log('---- closeMicrophone ----')
    if (!this.microphone) {
      this._debugLog("No active microphone to close")
      return
    }

    try {
      this.microphone.stop()
    } catch (e) {
      console.warn("Error stopping microphone:", e)
    }

    setTimeout(() => {
      if (this.partialTranscript != '' || this.transcript !== '') {
        console.log("Sending text to chat form")
        let inputText = this.transcript || ''
        inputText += this.partialTranscript;
        this.transcript = ""
        this.partialTranscript = ""
        
        this.textInput.value = inputText
        console.log("chatForm", this.chatForm)
        console.log("sending text to system")
        this.chatForm._send()
        console.log("text sent")
      } else {
        this._debugLog("No text to send")
      }
      this.transcript = ''
      this.partialTranscript = ''
      
      if (this.userMedia) {
        try {
          this.userMedia.getTracks().forEach((track) => {
            track.stop()
          })
        } catch (e) {
          console.warn("Error stopping media tracks:", e)
        }
      }
      
      this.userMedia = null
      this.microphone = null
      this.isRecording = false
      this.requestUpdate()
      setTimeout( () => {
        this.initSTT()
      }, 30)
    }, 150)
  }

  async fetchTempToken() {
    try {
      this._debugLog("Fetching Deepgram token...")
      const response = await fetch('/deepgram/tempkey')
      const key = await response.text()
      console.log(key)
      return key
    } catch (e) {
      console.error("Error fetching temp token:", e)
    }
  }

  async initSTT() {
    try {
      if (this.initializing) {
        this._debugLog("STT already initializing...")
        console.log("Already initializing STT")
        return
      }
      if (!this.deepgramToken) {
        await this.fetchTempToken()
      }
      if (true) { //!this.socket || this.socket.getReadyState() != 1) {
        try {
          this._debugLog("Initializing Deepgram connection...")
          try {
            this.socket.removeAllListeners()
          } catch (e) {
             console.warn("error removing socket listeners", e)
          }
          this.socket = undefined
          
          this.deepgram = undefined
          this.deepgram = createClient(this.deepgramToken)
          console.log("client: created deepgram client")
          console.log("this is", this)
          console.log("this.name is ", this.name)
          this.socket = this.deepgram.listen.live({
            model: "nova-3",
            smart_format: true,
            interim_results: true,
            punctuate: true,
            numerals: true,
            keyterm: ["Biolimitless", "Bio limitless"],
            endpointing: 10
          })
          console.log({socket: this.socket})
          this.socket.on("open", () => {
            console.log("client: deepgram connected to websocket")
          })

          this.socket.on("Results", (data) => {
            console.log("Deepgram Results:", data)
            const transcript_data = data.channel.alternatives[0].transcript

            if (transcript_data !== "") {
              console.log("Transcript:", transcript_data)
              this._debugLog(`Transcript: ${transcript_data}`)
              this.partialTranscript = transcript_data

              if (data.is_final) {
                this.transcript += transcript_data + " "
                this.textInput.value = this.transcript

                this.partialTranscript = "" 
                if (!this.dontInterrupt) {
                  this.chatForm._send()
                  this.transcript = ""
                }
              } else {
                this.textInput.value = this.transcript + this.partialTranscript
              }
            }
          })

          this.socket.on("error", (e) => {
            console.error("Deepgram socket error:", e)
            this._debugLog(`Socket error: ${e.message}`)
            this.socket.removeAllListeners()
            setTimeout(() => {
              if (!this.initializing) {
                this.initSTT()
              }
            }, 30)
          })

          this.socket.on("close", () => {
            console.log("Deepgram socket closed")
            this._debugLog("Deepgram connection closed")
            this.socket.removeAllListeners()
            setTimeout(() => {
                if (!this.initializing) {
                  this.initSTT()
                }
            }, 30)
          })

        } catch (e) {
          console.warn("error removing socket listeners", e)
        }
      }
 
      if (this.keepAlive) {
        clearInterval(this.keepAlive)
      }

      this.keepAlive = setInterval(() => {
        try {
          if (this.socket) {
            this.socket.keepAlive()
          }
        } catch (e) {
          console.warn("Error keeping connection alive:", e)
        }
      }, 10000)

      this.isInitialized = true

    } catch (e) {
      console.error('Error initializing STT:', e)
      this.isInitialized = false
    } finally {
      this.initializing = false
    }
  }

  connectedCallback() {
    super.connectedCallback()
    this._debugLog("Component connected")
    this.initSTT()
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    
    if (this.keepAlive) {
      clearInterval(this.keepAlive)
    }
    
    if (this.socket) {
      try {
        this.socket.removeAllListeners()
      } catch (e) {}
    }
    
    if (this.microphone) {
      try {
        this.microphone.stop()
      } catch (e) {}
    }
    
    if (this.userMedia) {
      try {
        this.userMedia.getTracks().forEach(track => track.stop())
      } catch (e) {}
    }
  }

  render() {
    return html`
      <div id="debug-overlay">DEBUG READY</div>
      <div class="object" id="record" 
           @mousedown=${(e) => {
             this._debugLog('mousedown event');
             if (!e.touches) { // Only handle if not touch device
               this.openMicrophone();
             }
           }}
           @touchstart=${(e) => {
             e.preventDefault(); // Prevent mouse events from firing
             this._debugLog('touchstart event');
             this.openMicrophone();
           }}
           @mouseup=${(e) => {
             this._debugLog('mouseup event');
             if (!e.touches) this.closeMicrophone();
           }}
           @touchend=${(e) => {
             e.preventDefault();
             this._debugLog('touchend event');
             this.closeMicrophone();
           }}
           @touchcancel=${(e) => {
             e.preventDefault();
             this._debugLog('touchcancel event');
             this.closeMicrophone();
           }}>
        <div class="outline"></div>
        <div class="outline" id="delayed"></div>
        <div class="button"></div>
        <div class="button" id="circlein">
          <svg
            class="mic-icon"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink"
            x="0px"
            y="0px"
            viewBox="0 0 1000 1000"
            enable-background="new 0 0 1000 1000"
            xml:space="preserve"
            style="fill:#ffffff"
          >
            <g>
              <path
                d="M500,683.8c84.6,0,153.1-68.6,153.1-153.1V163.1C653.1,78.6,584.6,10,500,10c-84.6,0-153.1,68.6-153.1,153.1v367.5C346.9,615.2,415.4,683.8,500,683.8z M714.4,438.8v91.9C714.4,649,618.4,745,500,745c-118.4,0-214.4-96-214.4-214.4v-91.9h-61.3v91.9c0,141.9,107.2,258.7,245,273.9v124.2H346.9V990h306.3v-61.3H530.6V804.5c137.8-15.2,245-132.1,245-273.9v-91.9H714.4z"
              />
            </g>
          </svg>
        </div>
      </div>
    `
  }
}

customElements.define('chat-tts', ChatSTT)
