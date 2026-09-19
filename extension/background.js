/**
 * background.js
 * MV3 service worker for CloudVoice Chrome.
 */

const API_BASE = "http://127.0.0.1:8001"
const OFFSCREEN_URL = "offscreen.html"

let creatingOffscreen = null

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "cloudvoice-read",
    title: 'Read Aloud with CloudVoice: "%s"',
    contexts: ["selection"],
  })
  chrome.contextMenus.create({
    id: "cloudvoice-stop",
    title: "Stop CloudVoice Playback",
    contexts: ["all"],
  })
})

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "read-selected-text") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return

    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString().trim(),
      })
      
      if (result && result.result) {
        await handleReadText(result.result, "hotkey")
      }
    } catch (err) {
      console.error("[CloudVoice] Extraction failed:", err)
    }
  }
})

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case "READ_TEXT":
      handleReadText(msg.text, msg.source || "hotkey")
        .then((r) => sendResponse(r))
        .catch((e) => sendResponse({ ok: false, error: e.message }))
      return true

    case "PLAYBACK_CONTROL":
      routeToOffscreen(msg)
        .then(() => sendResponse({ ok: true }))
        .catch((e) => sendResponse({ ok: false, error: e.message }))
      return true

    case "SETTINGS_UPDATED":
      broadcastToTabs(msg)
      sendResponse({ ok: true })
      return false

    case "FETCH":
      fetch(msg.url, msg.options || {})
        .then(res => res.json())
        .then(data => sendResponse({ data }))
        .catch(err => sendResponse({ error: err.message }))
      return true 

    default:
      return false
  }
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "cloudvoice-read" && info.selectionText) {
    await handleReadText(info.selectionText, "contextmenu")
  } else if (info.menuItemId === "cloudvoice-stop") {
    await stopPlayback()
    await clearHighlights()
  }
})

async function handleReadText(rawText, source) {
  const text = (rawText || "").trim().slice(0, 10000)
  if (!text) return { ok: false, error: "No text selected." }

  const settings = await chrome.storage.local.get(["voice", "speed"])
  const voice = settings.voice || ""
  const speed = Number(settings.speed) || 1.0

  try {
    const res = await fetch(`${API_BASE}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, speed, response_format: "base64" }),
    })

    if (!res.ok) {
      const detail = await res.text()
      throw new Error(`Backend ${res.status}: ${detail.slice(0, 200)}`)
    }

    const data = await res.json()
    if (!data.audio_base64) throw new Error("Backend returned no audio.")

    await ensureOffscreen()
    await chrome.runtime.sendMessage({
      type: "PLAY_AUDIO",
      audioBase64: data.audio_base64,
      duration: data.duration_seconds || 0,
    })

    if (source === "contextmenu" || source === "hotkey") {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.id) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"]
        }).catch(() => {})
        
        chrome.tabs.sendMessage(tab.id, { type: "HIGHLIGHT_PLAYING", duration: data.duration_seconds }).catch(() => {})
      }
    }

    return { ok: true, duration: data.duration_seconds }
  } catch (err) {
    console.error("[CloudVoice] TTS error:", err)
    await notifyError(err.message)
    return { ok: false, error: err.message }
  }
}

async function stopPlayback() {
  await ensureOffscreen()
  await chrome.runtime.sendMessage({ type: "STOP" })
}

async function routeToOffscreen(msg) {
  await ensureOffscreen()
  await chrome.runtime.sendMessage(msg)
}

async function clearHighlights() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "CLEAR_HIGHLIGHT" }).catch(() => {})
  }
}

async function hasOffscreen() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  })
  return contexts.length > 0
}

async function ensureOffscreen() {
  if (await hasOffscreen()) return

  if (!creatingOffscreen) {
    creatingOffscreen = chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Plays synthesized TTS audio for read-aloud.",
    })
  }
  try {
    await creatingOffscreen
  } catch (e) {
    if (!e.message.includes("Only a single offscreen")) throw e
  } finally {
    creatingOffscreen = null
  }
}

async function notifyError(message) {
  try {
    await chrome.action.setBadgeBackgroundColor({ color: "#e5484d" })
    await chrome.action.setBadgeText({ text: "!" })
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 4000)
  } catch (_) { }
  console.warn("[CloudVoice]", message)
}