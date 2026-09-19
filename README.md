# 🎙️ **CloudVoice Chrome**

**Highlight. Right-click. Listen.** A fast text-to-speech browser extension powered by ElevenLabs via a lightweight local Python proxy.

## **Architecture**

```text
┌─────────────────────┐         ┌──────────────────────────────────┐
│  Chrome Extension   │  HTTP   │        FastAPI Proxy Server      │
│  (Manifest V3)      │ ──────► │        [http://127.0.0.1:8001](http://127.0.0.1:8001)     │
│                     │         │                                  │
│ ┌─────────────────┐ │  /tts   │  ┌────────────────────────────┐  │
│ │ background.js   │ │  POST   │  │  server.py                 │  │
│ │ service worker  │ │         │  │  ┌──────────┐ ┌─────────┐  │  │
│ └────────┬────────┘ │         │  │  │ httpx    │ │ .env    │  │  │
│          ▼          │         │  │  └──────────┘ └─────────┘  │  │
│ ┌─────────────────┐ │         │  │       ElevenLabs API       │  │
│ │ offscreen.js    │ │ ◄────── │  └────────────────────────────┘  │
│ │ Web Audio API   │ │ base64  │                                  │
│ └─────────────────┘ │  MP3    │                                  │
│                     │         │                                  │
│ ┌─────────────────┐ │         │                                  │
│ │ content.js      │ │         │                                  │
│ │ hotkeys +       │ │         │                                  │
│ │ highlight       │ │         │                                  │
│ └─────────────────┘ │         │                                  │
└─────────────────────┘         └──────────────────────────────────┘
```

## **Features**

- 🖱️ **Right-click** any selected text to read aloud
- ⌨️ **Hotkey** `Ctrl+Shift+S` to read selection and `Esc` to stop
- 🎚️ **Speed control** (0.5x to 2.0x) and dynamic voice picker
- 🔊 Playback via Web Audio API in an offscreen document
- 🧠 **Premium Cloud Voices** powered by your ElevenLabs account
- 🛡️ **Secure Proxy** keeps your API key hidden from the browser

## **Requirements**

| Component | Minimum |
|---|---|
| OS | Windows 10/11, Linux, macOS |
| Python | 3.10 to 3.12 |
| Browser | Chrome / Edge / Brave |

## **Installation**

### **1. Backend Proxy**

Create a `.env` file in the `backend` folder and add your API key.
`ELEVENLABS_API_KEY=your_actual_key_here`

**Windows:**
```bat
cd backend
setup.bat
```

**Linux / macOS:**
```bash
cd backend
chmod +x setup.sh
./setup.sh
```

### **2. Chrome Extension**

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `/extension` folder

## **Usage**

1. Ensure the proxy server is running on `http://127.0.0.1:8001`.
2. Click the CloudVoice icon to confirm it says **Connected**.
3. Pick a voice and set your speed.
4. Select any text on a webpage and right-click to read aloud.

## **Project Tree**

```text
CloudVoiceChrome/
├── README.md
├── .gitignore
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   ├── setup.sh
│   ├── setup.bat
│   └── .env
└── extension/
    ├── manifest.json
    ├── background.js
    ├── content.js
    ├── offscreen.html
    ├── offscreen.js
    ├── popup.html
    ├── popup.css
    └── popup.js
```
