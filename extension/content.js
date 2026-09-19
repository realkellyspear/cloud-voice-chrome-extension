/**
 * content.js
 * Injected on all pages.
 * Ctrl+Shift+S reads the current text selection.
 * Esc stops playback.
 * Renders an inline highlight indicator over the selection while playing.
 */

(() => {
  "use strict"

  const HIGHLIGHT_STYLE_ID = "cloudvoice-highlight-style"

  function injectStyles() {
    if (document.getElementById(HIGHLIGHT_STYLE_ID)) return
    const style = document.createElement("style")
    style.id = HIGHLIGHT_STYLE_ID
    style.textContent = `
      .cloudvoice-highlight {
        background: linear-gradient(90deg, rgba(99,102,241,.35), rgba(168,85,247,.35)) !important
        border-radius: 3px !important
        box-shadow: 0 0 0 1px rgba(139,92,246,.6) !important
        transition: background .3s ease !important
        animation: cloudvoice-pulse 1.6s ease-in-out infinite
      }
      @keyframes cloudvoice-pulse {
        0%, 100% { box-shadow: 0 0 0 1px rgba(139,92,246,.6) }
        50%      { box-shadow: 0 0 12px 2px rgba(139,92,246,.55) }
      }
      .cloudvoice-badge {
        position: fixed
        bottom: 18px
        right: 18px
        z-index: 2147483647
        display: none
        align-items: center
        gap: 8px
        padding: 10px 16px
        border-radius: 12px
        background: rgba(18,18,24,.85)
        backdrop-filter: blur(12px)
        -webkit-backdrop-filter: blur(12px)
        color: #e5e7eb
        font: 500 13px/1 system-ui, -apple-system, sans-serif
        border: 1px solid rgba(139,92,246,.4)
        box-shadow: 0 8px 24px rgba(0,0,0,.4)
      }
      .cloudvoice-badge .dot {
        width: 8px; height: 8px; border-radius: 50%
        background: #a78bfa
        animation: cloudvoice-pulse 1.2s ease-in-out infinite
      }
    `
    document.documentElement.appendChild(style)
  }

  function ensureBadge() {
    injectStyles()
    let badge = document.getElementById("cloudvoice-badge")
    if (!badge) {
      badge = document.createElement("div")
      badge.id = "cloudvoice-badge"
      badge.className = "cloudvoice-badge"
      badge.innerHTML = `<span class="dot"></span><span>CloudVoice is reading…</span>`
      document.documentElement.appendChild(badge)
    }
    return badge
  }

  function highlightSelection() {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return
    const badge = ensureBadge()
    badge.style.display = "flex"

    try {
      for (let i = 0; i < sel.rangeCount; i++) {
        sel.getRangeAt(i).surroundContents
          ? trySurround(sel.getRangeAt(i))
          : null
      }
    } catch (_) {}
  }

  function trySurround(range) {
    try {
      const span = document.createElement("span")
      span.className = "cloudvoice-highlight"
      range.surroundContents(span)
    } catch (_) {}
  }

  function clearHighlight() {
    document.querySelectorAll(".cloudvoice-highlight").forEach((el) => {
      const parent = el.parentNode
      while (el.firstChild) parent.insertBefore(el.firstChild, el)
      el.remove()
      parent.normalize()
    })
    const badge = document.getElementById("cloudvoice-badge")
    if (badge) badge.style.display = "none"
  }

  function getSelectionText() {
    return (window.getSelection()?.toString() || "").trim()
  }

  document.addEventListener("keydown", async (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s") {
      e.preventDefault()
      const text = getSelectionText()
      if (text) {
        chrome.runtime.sendMessage({ type: "READ_TEXT", text, source: "hotkey" })
      }
    }
    if (e.key === "Escape") {
      chrome.runtime.sendMessage({
        type: "PLAYBACK_CONTROL",
        action: "stop",
      })
    }
  })

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "HIGHLIGHT_PLAYING") {
      highlightSelection()
      setTimeout(clearHighlight, ((msg.duration || 0) + 3) * 1000)
    } else if (msg.type === "CLEAR_HIGHLIGHT") {
      clearHighlight()
    }
  })

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "PLAYBACK_FINISHED") clearHighlight()
  })
})()