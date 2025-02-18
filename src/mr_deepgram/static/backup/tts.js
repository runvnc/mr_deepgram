import {createClient} from "@deepgram/sdk";

const captions = window.document.getElementById("captions");

let userMedia = null;
let microphone = null;
let socket = null;
let transcript = ""
let keepAlive;
let _deepgram;
let initializingTTS = false;
let partialTranscript = "";
let dontInterrupt = false;

async function getMicrophone() {
  userMedia = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });

  return new MediaRecorder(userMedia);
}

async function openMicrophone() {
  transcript = ""

  try {
    window.shutUp()
  } catch (e) {
    console.warn("error interrupting avatar", e)
  }

  if (microphone) {
      try {
        microphone.stop();
        microphone.removeAllListeners();
        microphone = null;
      } catch (e) {
        console.warn("error closing microphone", e)
      }
  }

  microphone = await getMicrophone();
 
  await microphone.start(50);

  microphone.onstart = () => {
    console.log("client: microphone opened");
    document.body.classList.add("recording");
  };

  microphone.onstop = () => {
    console.log("client: microphone closed");
    document.body.classList.remove("recording");
    try {
      microphone.removeAllListeners()
    } catch (e) {
    }
    microphone = null;
  };

  microphone.ondataavailable = (e) => {
    const data = e.data;
    console.log("client: sent data to websocket");
    socket.send(data);
  };
}

async function closeMicrophone() {
  if (!microphone) {
    console.log("microphone undefined or not open, not running close code")
    return;
  }
  try {
    microphone.stop();
  } catch (e) { 
  }
  setTimeout(() => {
    try {
      microphone.removeAllListeners()
    } catch (e) {
    }
    if (dontInterrupt && userInput.value != "" || (transcript && transcript != "")) {
      try {
        let input = transcript
        if (transcript == "") input = userInput.value;        
        window.handleSpeak(input)
      } catch (e) {
        console.warn("error calling handleSpeak", e)
      }
    }
    transcript = ""
    console.log("closing and cleaning up microphone")
    try {
        if (userMedia) userMedia.getTracks().forEach( (track) => {
          track.stop();
        });
    } catch (e) {
    }
    userMedia = null; 
    // remove listeners etc
    console.log("client: microphone closed");
    document.body.classList.remove("recording");
    microphone = null;
    setTimeout(() => {
      initTTS()
    }, 30)

  }, 50)
}

function handleDown(e) {
    console.log("mousedown event")
    e.preventDefault();
    openMicrophone();
}

function handleUp(e) {
    console.log("mouseup event")
    e.preventDefault();
    setTimeout( closeMicrophone, 250)
}
 

async function start(socket) {
  const listenButton = document.getElementById("record");
  if (!listenButton) {
    console.warn("no listen button found")
    return;
  }
  if (listenButton) {
    try {
      listenButton.removeEventListener("mousedown", handleDown);
      listenButton.removeEventListener("touchstart", handleDown);
      listenButton.removeEventListener("mouseup", handleUp);
      listenButton.removeEventListener("mouseleave", handleUp);
      listenButton.removeEventListener("touchend", handleUp);
      listenButton.removeEventListener("touchcancel", handleUp);
    } catch (e) {
      console.log("no button listeners to remove")
    }
  }
  console.log("client: waiting to open microphone");


 // Handle both mouse and touch events for push-to-talk

  listenButton.addEventListener("mousedown", handleDown);
  listenButton.addEventListener("touchstart", handleDown)
  listenButton.addEventListener("mouseup", handleUp)
  listenButton.addEventListener("mouseleave", handleUp)
  listenButton.addEventListener("touchend", handleUp)
  listenButton.addEventListener("touchcancel", handleUp)

  if (keepAlive) {
    try {
      clearInterval(keepAlive);
    } catch (e) {
    }
  }
  keepAlive = setInterval(() => {
    try {
      if (socket ) {
        socket.keepAlive();
        console.log('sent keepalive')
      }
    } catch (e) {
      console.log("error keeping connection alive", e)
    }
  }, 10000);

}

async function getTempApiKey() {
  const result = await fetch("/key");
  const json = await result.json();

  return json.key;
}

async function initTTS() {
  if (initializingTTS) {
    console.log("already initializing TTS, returning")
    return;
  }
  initializingTTS = true;
  try {
    //const key = await getTempApiKey();
    //const key = meta.env.VITE_DEEPGRAM_API_KEY 
    const key ="a2dae355bff63649e396812508e25624420fc377"

    if (socket) {
      try {
        socket.removeAllListeners();
      } catch (e) {
        console.warn("error removing socket listeners", e)
      }
      socket = undefined;
    }

    if (_deepgram) {
      _deepgram = undefined;
    }

    _deepgram = createClient(key);

    socket = _deepgram.listen.live({ 
      model: "nova-2", smart_format: true,
      interim_results: true,
      punctuate: true,
      numerals: true,
      endpointing: 50
    });

    socket.on("open", async () => {
      console.log("%c socket open event", "background: green; color: yellow");

      console.log("client: connected to websocket");
    })

    socket.on("Results", async (data) => {
        // use blue background and yellow text
        console.log("%c socket results event" + JSON.stringify(data), "background: blue; color: yellow");
        console.log(data);
 
        const transcript_data = data.channel.alternatives[0].transcript;

        if (transcript_data !== "") {
          try {
            await window.shutUp()
          } catch (e) {
            console.warn("error shutting up avatar", e)
          }

          //captions.innerHTML = transcript_data ? `<span>${transcript_data}</span>` : "";
          userInput.value = transcript_data
          //partialTranscript = transcript_data;
          //if (userInput.value == "") userInput.value = partialTranscript;

          if (data.is_final) {
            transcript += transcript_data + " ";
            userInput.value = transcript;

            if (!dontInterrupt) {
                handleSpeak(transcript != "" ? transcript: userInput.value)
                transcript = ""
                await new Promise(resolve => setTimeout(resolve, 100));
                userInput.value = "";
              
            }
          }
        }
    });

    socket.on("error", (e) => {
        console.error(e);
        socket.removeAllListeners()
        setTimeout( () => {
          console.log("%c socket error, reset", "background: green; color: yellow");
          initTTS()
        }, 30)
    })

    socket.on("warning", (e) => console.warn(e));

    socket.on("Metadata", (e) => console.log(e));

    socket.on("close", (e) => {
        // log with green background and yellow text
        console.log("%c socket close, reset", "background: green; color: yellow");
        console.log(e);
        socket.removeAllListeners();
        setTimeout(() => {
          if (!initializingTTS) initTTS()
        }, 30)
    })

    await start(socket);

  } catch (e) {
    console.error('error in inittts',e);
  } finally {
    initializingTTS = false;
  }
}

window.addEventListener("load", async () => {
  console.log("Initializing TTS")
  await initTTS();
})

