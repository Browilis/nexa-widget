/**
 * Nexa Chatbot Widget v1.0
 * Embed with a single <script> tag — zero dependencies
 *
 * Usage:
 * <script
 *   src="nexa-chatbot.js"
 *   data-webhook="https://your-n8n.com/webhook/chatbot-lead"
 *   data-cal="https://cal.com/username/free-estimate"
 *   data-name="ABC HVAC Services"
 *   data-color="#f4621f"
 *   data-delay="8"
 * ></script>
 */

(function () {
  'use strict';

  // ── Read config from script tag data attributes ──────────────────
  const scripts = document.querySelectorAll('script[data-webhook]');
  const scriptEl = scripts[scripts.length - 1];

  const CFG = {
    webhook:       scriptEl.getAttribute('data-webhook') || '',
    calLink:       scriptEl.getAttribute('data-cal') || '',
    contractorName: scriptEl.getAttribute('data-name') || 'our team',
    color:         scriptEl.getAttribute('data-color') || '#f4621f',
    delay:         parseInt(scriptEl.getAttribute('data-delay') || '0', 10),
    position:      scriptEl.getAttribute('data-position') || 'right',
  };

  if (!CFG.webhook) {
    console.warn('[NexaChat] Missing data-webhook attribute. Widget not loaded.');
    return;
  }

  // ── Session ID ───────────────────────────────────────────────────
  function getSessionId() {
    let id = sessionStorage.getItem('_nxc_sid');
    if (!id) {
      id = 'nxc_' + Math.random().toString(36).substr(2, 10);
      sessionStorage.setItem('_nxc_sid', id);
    }
    return id;
  }

  // ── Color helpers ────────────────────────────────────────────────
  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  }

  // ── Build Shadow DOM widget ──────────────────────────────────────
  const host = document.createElement('div');
  host.id = 'nexa-chatbot-host';
  host.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;bottom:0;' +
    (CFG.position === 'left' ? 'left:0;right:auto;' : 'right:0;left:auto;');
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'closed' });
  const rgb = hexToRgb(CFG.color);

  // ── Styles ───────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :host { font-family: 'DM Sans', system-ui, sans-serif; }

    #bubble {
      position: fixed;
      bottom: 24px;
      ${CFG.position === 'left' ? 'left: 24px;' : 'right: 24px;'}
      width: 56px;
      height: 56px;
      background: ${CFG.color};
      border-radius: 50%;
      cursor: pointer;
      pointer-events: all;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(${rgb}, 0.45), 0 2px 4px rgba(0,0,0,0.15);
      transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s;
      outline: none;
      border: none;
    }
    #bubble:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 24px rgba(${rgb}, 0.55), 0 2px 8px rgba(0,0,0,0.2);
    }
    #bubble:focus-visible {
      outline: 3px solid ${CFG.color};
      outline-offset: 3px;
    }
    #bubble svg { width: 24px; height: 24px; fill: #fff; transition: opacity 0.15s, transform 0.15s; }
    #bubble .ico-close { display: none; }
    #bubble.open .ico-chat { display: none; }
    #bubble.open .ico-close { display: block; }

    .ping {
      position: absolute;
      top: 1px;
      right: 1px;
      width: 12px;
      height: 12px;
      background: #22c55e;
      border-radius: 50%;
      border: 2px solid #fff;
      animation: pingPulse 2.5s infinite;
    }
    @keyframes pingPulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.4); opacity: 0.6; }
    }

    #window {
      position: fixed;
      bottom: 92px;
      ${CFG.position === 'left' ? 'left: 16px;' : 'right: 16px;'}
      width: 350px;
      height: 510px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      pointer-events: all;
      transform: translateY(16px) scale(0.96);
      opacity: 0;
      visibility: hidden;
      transition:
        transform 0.28s cubic-bezier(0.34,1.56,0.64,1),
        opacity 0.22s ease,
        visibility 0s linear 0.28s;
      border: 1px solid rgba(0,0,0,0.06);
    }
    #window.open {
      transform: translateY(0) scale(1);
      opacity: 1;
      visibility: visible;
      transition:
        transform 0.28s cubic-bezier(0.34,1.56,0.64,1),
        opacity 0.22s ease,
        visibility 0s linear 0s;
    }

    .header {
      background: linear-gradient(135deg, #0d1b2a 0%, #1a2e45 100%);
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 11px;
      flex-shrink: 0;
    }
    .avatar {
      width: 36px; height: 36px;
      background: ${CFG.color};
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem;
      flex-shrink: 0;
    }
    .header-info { flex: 1; min-width: 0; }
    .header-name {
      color: #fff;
      font-weight: 700;
      font-size: 0.9rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .header-status {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-top: 2px;
    }
    .dot { width: 6px; height: 6px; background: #22c55e; border-radius: 50%; flex-shrink: 0; }
    .status-txt { color: #22c55e; font-size: 0.72rem; font-weight: 500; }

    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 14px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      scroll-behavior: smooth;
    }
    .messages::-webkit-scrollbar { width: 3px; }
    .messages::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }

    .msg {
      max-width: 84%;
      padding: 9px 12px;
      border-radius: 14px;
      font-size: 0.855rem;
      line-height: 1.55;
      animation: msgPop 0.18s ease;
    }
    @keyframes msgPop {
      from { opacity: 0; transform: translateY(5px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .msg.bot {
      background: #f1f5f9;
      color: #1e293b;
      border-bottom-left-radius: 3px;
      align-self: flex-start;
    }
    .msg.user {
      background: ${CFG.color};
      color: #fff;
      border-bottom-right-radius: 3px;
      align-self: flex-end;
    }

    .bot-wrap {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }

    .book-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #0d1b2a;
      color: #fff;
      text-decoration: none;
      padding: 9px 15px;
      border-radius: 10px;
      font-size: 0.82rem;
      font-weight: 600;
      font-family: 'DM Sans', system-ui, sans-serif;
      transition: background 0.18s, transform 0.15s;
      cursor: pointer;
      border: none;
    }
    .book-btn:hover { background: #1a2e45; transform: translateY(-1px); }
    .book-btn svg { width: 13px; height: 13px; fill: ${CFG.color}; flex-shrink: 0; }

    .typing {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 9px 13px;
      background: #f1f5f9;
      border-radius: 14px;
      border-bottom-left-radius: 3px;
      align-self: flex-start;
    }
    .typing span {
      width: 5px; height: 5px;
      background: #94a3b8;
      border-radius: 50%;
      animation: typeBounce 1.1s infinite;
    }
    .typing span:nth-child(2) { animation-delay: 0.18s; }
    .typing span:nth-child(3) { animation-delay: 0.36s; }
    @keyframes typeBounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-5px); }
    }

    .input-row {
      padding: 10px 12px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      gap: 7px;
      align-items: flex-end;
      flex-shrink: 0;
    }
    textarea {
      flex: 1;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      padding: 8px 12px;
      font-size: 0.85rem;
      font-family: 'DM Sans', system-ui, sans-serif;
      color: #1e293b;
      resize: none;
      outline: none;
      line-height: 1.45;
      max-height: 76px;
      overflow-y: auto;
      transition: border-color 0.18s;
    }
    textarea:focus { border-color: ${CFG.color}; }
    textarea::placeholder { color: #b0bec5; }

    #send {
      width: 36px; height: 36px;
      background: ${CFG.color};
      border: none;
      border-radius: 10px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: background 0.18s, transform 0.15s;
      outline: none;
    }
    #send:hover { filter: brightness(1.1); transform: scale(1.05); }
    #send:disabled { background: #e2e8f0; transform: none; cursor: default; }
    #send svg { width: 15px; height: 15px; fill: #fff; }

    .footer {
      text-align: center;
      padding: 5px 0 7px;
      font-size: 0.66rem;
      color: #b0bec5;
      flex-shrink: 0;
      letter-spacing: 0.2px;
    }
    .footer span { color: ${CFG.color}; font-weight: 600; }

    @media (max-width: 420px) {
      #window {
        width: calc(100vw - 16px);
        ${CFG.position === 'left' ? 'left: 8px;' : 'right: 8px;'}
        bottom: 84px;
        height: 68vh;
        max-height: 480px;
      }
    }
  `;

  // ── HTML ─────────────────────────────────────────────────────────
  const container = document.createElement('div');
  container.innerHTML = `
    <button id="bubble" aria-label="Open chat" aria-expanded="false">
      <div class="ping"></div>
      <svg class="ico-chat" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
      <svg class="ico-close" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    </button>

    <div id="window" role="dialog" aria-modal="true" aria-label="Chat with ${CFG.contractorName}">
      <div class="header">
        <div class="avatar">🔧</div>
        <div class="header-info">
          <div class="header-name">${CFG.contractorName}</div>
          <div class="header-status">
            <div class="dot"></div>
            <div class="status-txt">Online now</div>
          </div>
        </div>
      </div>
      <div class="messages" id="msgs" role="log" aria-live="polite"></div>
      <div class="input-row">
        <textarea id="txt" placeholder="Type a message..." rows="1" aria-label="Chat message"></textarea>
        <button id="send" aria-label="Send message" disabled>
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
      <div class="footer">Powered by <span>Nexa AI</span> • 🔒 Secure</div>
    </div>
  `;

  shadow.appendChild(style);
  shadow.appendChild(container);

  // ── State ────────────────────────────────────────────────────────
  let isOpen = false;
  let initialized = false;
  let history = [];

  const bubble  = shadow.getElementById('bubble');
  const win     = shadow.getElementById('window');
  const msgs    = shadow.getElementById('msgs');
  const txt     = shadow.getElementById('txt');
  const sendBtn = shadow.getElementById('send');

  // ── Toggle ───────────────────────────────────────────────────────
  function toggle() {
    isOpen = !isOpen;
    bubble.classList.toggle('open', isOpen);
    win.classList.toggle('open', isOpen);
    bubble.setAttribute('aria-expanded', String(isOpen));

    if (isOpen) {
      if (!initialized) { initialized = true; setTimeout(greet, 350); }
      setTimeout(() => txt.focus(), 300);
    }
  }

  bubble.addEventListener('click', toggle);
  bubble.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }});

  // ── Greeting ─────────────────────────────────────────────────────
  function greet() {
    const text = `Hey there! 👋 I can help you book a **free estimate** with ${CFG.contractorName}. What's going on with your system today?`;
    addBot(text);
    history.push({ role: 'assistant', content: text });
    sendBtn.disabled = false;
  }

  // ── Send ─────────────────────────────────────────────────────────
  txt.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  txt.addEventListener('input', () => {
    txt.style.height = 'auto';
    txt.style.height = Math.min(txt.scrollHeight, 76) + 'px';
    sendBtn.disabled = txt.value.trim().length === 0;
  });
  sendBtn.addEventListener('click', send);

  async function send() {
    const text = txt.value.trim();
    if (!text) return;

    txt.value = '';
    txt.style.height = 'auto';
    sendBtn.disabled = true;

    addUser(text);
    history.push({ role: 'user', content: text });

    const typing = addTyping();

    try {
      const res = await fetch(CFG.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: getSessionId(),
          history: history.slice(-12),
          contractorName: CFG.contractorName,
          calLink: CFG.calLink,
        }),
      });

      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();

      typing.remove();
      const reply = data.message || "Sorry, I had a hiccup. Could you try again?";
      addBot(reply, data.qualified ? CFG.calLink : null);
      history.push({ role: 'assistant', content: reply });

    } catch (err) {
      typing.remove();
      addBot("Sorry, I'm having a connection issue. Please call us directly or try again in a moment.");
    }

    sendBtn.disabled = false;
    txt.focus();
  }

  // ── DOM helpers ──────────────────────────────────────────────────
  function addUser(text) {
    const el = document.createElement('div');
    el.className = 'msg user';
    el.textContent = text;
    msgs.appendChild(el);
    scroll();
  }

  function addBot(text, bookingUrl) {
    const wrap = document.createElement('div');
    wrap.className = 'bot-wrap';

    const el = document.createElement('div');
    el.className = 'msg bot';
    el.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    wrap.appendChild(el);

    if (bookingUrl) {
      const btn = document.createElement('a');
      btn.href = bookingUrl;
      btn.target = '_blank';
      btn.rel = 'noopener noreferrer';
      btn.className = 'book-btn';
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> Book My Free Estimate`;
      wrap.appendChild(btn);
    }

    msgs.appendChild(wrap);
    scroll();
  }

  function addTyping() {
    const el = document.createElement('div');
    el.className = 'typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(el);
    scroll();
    return el;
  }

  function scroll() {
    msgs.scrollTop = msgs.scrollHeight;
  }

  // ── Auto-open delay ──────────────────────────────────────────────
  if (CFG.delay > 0) {
    setTimeout(() => { if (!isOpen) toggle(); }, CFG.delay * 1000);
  }

})();
