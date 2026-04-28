(function () {
  'use strict';

  function initPopupPage() {
    const DEFAULTS = {
      enabled: true,
      showIndicator: true,
      typingSpeed: 75,
      randomizeSpeed: false,
      customShortcut: null,
      autoTyperShortcut: { key: 't', ctrl: true, shift: true, alt: false, meta: false }
    };

    const PRESETS = [150, 75, 30, 10];
    const $ = function (id) { return document.getElementById(id); };
    let pollTimer = null;
    let typingStartedAt = 0;

    const HAS_CHROME = typeof chrome !== 'undefined' && !!chrome;
    const HAS_TABS = HAS_CHROME && !!chrome.tabs && typeof chrome.tabs.query === 'function';
    const HAS_STORAGE = HAS_CHROME && !!chrome.storage && !!chrome.storage.sync;
    const HAS_RUNTIME = HAS_CHROME && !!chrome.runtime;

    function getActiveTab(cb) {
      if (!HAS_TABS) { cb(null); return; }
      try {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          cb(tabs && tabs[0] ? tabs[0] : null);
        });
      } catch (_) { cb(null); }
    }

    function sendMessage(message, cb) {
      getActiveTab(function (tab) {
        if (!tab || !HAS_TABS || typeof chrome.tabs.sendMessage !== 'function') {
          if (cb) cb(null); return;
        }
        try {
          chrome.tabs.sendMessage(tab.id, message, function (resp) {
            try { if (chrome.runtime && chrome.runtime.lastError) { if (cb) cb(null); return; } } catch (_) {}
            if (cb) cb(resp || null);
          });
        } catch (_) { if (cb) cb(null); }
      });
    }

    function renderSpeed(speed) {
      if ($('speed-text')) $('speed-text').textContent = speed + ' ms/char';
      document.querySelectorAll('.pill').forEach(function (pill) {
        pill.classList.toggle('active', Number(pill.dataset.speed) === Number(speed));
      });
    }

    function applyStatus(status) {
      if (!$('status-badge') || !$('mode-text')) return;

      if (!status) {
        $('status-badge').className = 'badge disabled';
        $('status-badge').textContent = '● Inactive';
        $('mode-text').textContent = 'No content script';
        if ($('progress')) $('progress').classList.remove('show');
        if ($('progress-label')) $('progress-label').classList.remove('show');
        if ($('cancel-btn')) $('cancel-btn').classList.remove('show');
        return;
      }

      $('status-badge').className = 'badge ' + (status.enabled ? 'active' : 'disabled');
      $('status-badge').textContent = status.enabled ? '● Active' : '● Disabled';

      if (status.typing) {
        $('mode-text').innerHTML = 'Auto-Typing<span class="typing-dots"></span>';
        if ($('status-card')) $('status-card').classList.add('typing-active');
        if ($('progress')) $('progress').classList.add('show');
        if ($('progress-label')) $('progress-label').classList.add('show');
        if ($('cancel-btn')) $('cancel-btn').classList.add('show');

        const pct = status.totalChars ? (status.charsTyped / status.totalChars) * 100 : 0;
        const pctRounded = Math.round(pct);
        if ($('progress-fill')) $('progress-fill').style.width = pct + '%';
        if ($('progress-label')) $('progress-label').textContent = status.charsTyped + ' / ' + status.totalChars + ' chars';
        if ($('progress-pct')) $('progress-pct').textContent = pctRounded + '%';

        if (!pollTimer) pollTimer = window.setInterval(refresh, 150);
      } else {
        // Grace period: ignore "not typing" responses within 800ms of clicking Start
        // (content script may not have set isTyping=true yet)
        if (Date.now() - typingStartedAt < 800) return;
        $('mode-text').textContent = 'Paste Bypass';
        if ($('progress')) $('progress').classList.remove('show');
        if ($('progress-label')) $('progress-label').classList.remove('show');
        if ($('cancel-btn')) $('cancel-btn').classList.remove('show');
        if ($('status-card')) $('status-card').classList.remove('typing-active');
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      }

      if (status.typingSpeed) renderSpeed(status.typingSpeed);
    }

    function refresh() {
      sendMessage({ action: 'getStatus' }, applyStatus);
    }

    function loadSettings() {
      if (!HAS_STORAGE) { renderSpeed(DEFAULTS.typingSpeed); return; }
      try {
        chrome.storage.sync.get(DEFAULTS, function (data) {
          const speed = (data && data.typingSpeed) ? data.typingSpeed : DEFAULTS.typingSpeed;
          renderSpeed(speed);
          if (PRESETS.indexOf(Number(speed)) === -1 && $('custom-speed')) {
            $('custom-speed').value = String(speed);
          }
        });
      } catch (_) { renderSpeed(DEFAULTS.typingSpeed); }
    }

    function setSpeed(ms) {
      const safeMs = Math.max(1, Number(ms) || DEFAULTS.typingSpeed);
      if (HAS_STORAGE) {
        try { chrome.storage.sync.set({ typingSpeed: safeMs }); } catch (_) {}
      }
      // Also notify the content script immediately so it takes effect without page reload
      sendMessage({ action: 'setSpeed', speed: safeMs }, null);
      renderSpeed(safeMs);
    }

    function readClipboardText(cb) {
      if (!navigator.clipboard || typeof navigator.clipboard.readText !== 'function') { cb(''); return; }
      navigator.clipboard.readText().then(function (text) { cb(text || ''); }).catch(function () { cb(''); });
    }

    document.querySelectorAll('.pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        document.querySelectorAll('.pill').forEach(function(p) { p.classList.remove('active'); });
        pill.classList.add('active');
        if ($('custom-speed')) $('custom-speed').value = '';
        setSpeed(Number(pill.dataset.speed));
      });
    });

    let debounceTimer = null;
    if ($('custom-speed')) {
      $('custom-speed').addEventListener('input', function () {
        clearTimeout(debounceTimer);
        const value = Number($('custom-speed').value);
        if (!value || value < 1) return;
        debounceTimer = window.setTimeout(function () { setSpeed(value); }, 350);
      });
    }

    if ($('start-btn')) {
      $('start-btn').addEventListener('click', function () {
        readClipboardText(function (text) {
          if (!text || !text.trim()) {
            // Nothing in clipboard — show inline error
            if ($('mode-text')) $('mode-text').textContent = '⚠ Clipboard is empty';
            window.setTimeout(function () {
              if ($('mode-text')) $('mode-text').textContent = 'Paste Bypass';
            }, 2000);
            return;
          }

          // Immediately flip UI into typing state before the content script responds
          if ($('mode-text')) $('mode-text').innerHTML = 'Auto-Typing<span class="typing-dots"></span>';
          if ($('progress')) $('progress').classList.add('show');
          if ($('progress-label')) { $('progress-label').classList.add('show'); $('progress-label').textContent = 'Starting…'; }
          if ($('progress-pct')) $('progress-pct').textContent = '0%';
          if ($('progress-fill')) $('progress-fill').style.width = '0%';
          if ($('cancel-btn')) $('cancel-btn').classList.add('show');
          if ($('status-card')) $('status-card').classList.add('typing-active');

          // Start polling BEFORE sending so first response is captured
          typingStartedAt = Date.now();
          if (!pollTimer) pollTimer = window.setInterval(refresh, 150);

          sendMessage({ action: 'startAutoTyper', text: text }, function (resp) {
            // If content script says it failed (e.g. no active tab), reset UI
            if (resp && resp.ok === false) {
              if ($('mode-text')) $('mode-text').textContent = 'Paste Bypass';
              if ($('progress')) $('progress').classList.remove('show');
              if ($('progress-label')) $('progress-label').classList.remove('show');
              if ($('cancel-btn')) $('cancel-btn').classList.remove('show');
              if ($('status-card')) $('status-card').classList.remove('typing-active');
              if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
            }
          });
        });
      });
    }

    if ($('cancel-btn')) {
      $('cancel-btn').addEventListener('click', function () {
        sendMessage({ action: 'cancelAutoTyper' }, function () {
          window.setTimeout(refresh, 150);
        });
      });
    }

    if ($('open-options')) {
      $('open-options').addEventListener('click', function () {
        if (!HAS_RUNTIME) return;
        try {
          if (typeof chrome.runtime.openOptionsPage === 'function') {
            chrome.runtime.openOptionsPage(); return;
          }
        } catch (_) {}
        try {
          if (chrome.tabs && typeof chrome.tabs.create === 'function' && chrome.runtime && chrome.runtime.getURL) {
            chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
          }
        } catch (_) {}
      });
    }

    loadSettings();
    refresh();
  }

  function initOptionsPage() {
    const DEFAULT_SHORTCUTS = {
      paste: {
        win: { key: 'v', ctrl: true, shift: false, alt: false, meta: false },
        mac: { key: 'v', ctrl: false, shift: false, alt: false, meta: true }
      },
      copy: {
        win: { key: 'c', ctrl: true, shift: false, alt: false, meta: false },
        mac: { key: 'c', ctrl: false, shift: false, alt: false, meta: true }
      },
      autoTyper: {
        win: { key: 't', ctrl: true, shift: true, alt: false, meta: false },
        mac: { key: 't', ctrl: false, shift: true, alt: false, meta: true }
      }
    };

    const DEFAULTS = {
      enabled: true,
      showIndicator: true,
      typingSpeed: 75,
      randomizeSpeed: false,
      customShortcut: null,
      autoTyperShortcut: DEFAULT_SHORTCUTS.autoTyper.win,
      shortcuts: DEFAULT_SHORTCUTS
    };

    const HAS_CHROME = typeof chrome !== 'undefined' && !!chrome;
    const HAS_STORAGE = HAS_CHROME && !!chrome.storage && !!chrome.storage.sync;
    const IS_MAC = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || '');
    const $ = function (id) { return document.getElementById(id); };

    function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

    function shortcutToString(shortcut) {
      if (!shortcut || !shortcut.key) return '';
      const parts = [];
      if (shortcut.ctrl) parts.push('Ctrl');
      if (shortcut.meta) parts.push('Cmd');
      if (shortcut.alt) parts.push('Opt');
      if (shortcut.shift) parts.push('Shift');
      parts.push(shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key);
      return parts.join(' + ');
    }

    function save(values) {
      if (!HAS_STORAGE) return;
      try { chrome.storage.sync.set(values); } catch (_) {}
    }

    function load(cb) {
      if (!HAS_STORAGE) { cb(clone(DEFAULTS)); return; }
      try {
        chrome.storage.sync.get(DEFAULTS, function (data) {
          cb(Object.assign({}, clone(DEFAULTS), data || {}));
        });
      } catch (_) { cb(clone(DEFAULTS)); }
    }

    function renderShortcuts(shortcuts) {
      document.querySelectorAll('.shortcut-grid[data-action]').forEach(function (grid) {
        const action = grid.dataset.action;
        grid.querySelectorAll('.shortcut-input').forEach(function (input) {
          const platform = input.dataset.platform;
          input.value = shortcutToString(shortcuts[action] && shortcuts[action][platform]);
        });
      });
    }

    function setActivePreset(speed) {
      document.querySelectorAll('.preset').forEach(function (preset) {
        preset.classList.toggle('active', Number(preset.dataset.speed) === Number(speed));
      });
    }

    function attachRecorders(state) {
      document.querySelectorAll('.shortcut-input').forEach(function (input) {
        input.addEventListener('focus', function () { input.value = 'Press shortcut…'; });
        input.addEventListener('blur', function () {
          const grid = input.closest('.shortcut-grid');
          const action = grid ? grid.dataset.action : '';
          const platform = input.dataset.platform;
          input.value = shortcutToString(state.shortcuts[action] && state.shortcuts[action][platform]);
        });
        input.addEventListener('keydown', function (event) {
          event.preventDefault();
          event.stopPropagation();
          if (event.key === 'Escape' || event.key === 'Enter') { input.blur(); return; }
          if (['Control', 'Shift', 'Alt', 'Meta'].indexOf(event.key) !== -1) return;
          const shortcut = {
            key: String(event.key || '').toLowerCase(),
            ctrl: !!event.ctrlKey, shift: !!event.shiftKey,
            alt: !!event.altKey, meta: !!event.metaKey
          };
          const grid = input.closest('.shortcut-grid');
          if (!grid) return;
          const action = grid.dataset.action;
          const platform = input.dataset.platform;
          state.shortcuts[action] = state.shortcuts[action] || {};
          state.shortcuts[action][platform] = shortcut;
          input.value = shortcutToString(shortcut);
          const patch = { shortcuts: state.shortcuts };
          if (action === 'paste') patch.customShortcut = state.shortcuts.paste[IS_MAC ? 'mac' : 'win'];
          if (action === 'autoTyper') patch.autoTyperShortcut = state.shortcuts.autoTyper[IS_MAC ? 'mac' : 'win'];
          save(patch);
        });
      });

      document.querySelectorAll('.reset-btn').forEach(function (button) {
        button.addEventListener('click', function () {
          const grid = button.closest('.shortcut-grid');
          if (!grid) return;
          const action = grid.dataset.action;
          state.shortcuts[action] = clone(DEFAULT_SHORTCUTS[action]);
          renderShortcuts(state.shortcuts);
          const patch = { shortcuts: state.shortcuts };
          if (action === 'paste') patch.customShortcut = null;
          if (action === 'autoTyper') patch.autoTyperShortcut = state.shortcuts.autoTyper[IS_MAC ? 'mac' : 'win'];
          save(patch);
        });
      });
    }

    load(function (data) {
      const state = Object.assign({}, clone(DEFAULTS), data || {});
      if (!state.shortcuts) state.shortcuts = clone(DEFAULT_SHORTCUTS);

      if ($('enabled')) $('enabled').checked = !!state.enabled;
      if ($('showIndicator')) $('showIndicator').checked = !!state.showIndicator;
      if ($('randomizeSpeed')) $('randomizeSpeed').checked = !!state.randomizeSpeed;
      if ($('speed')) $('speed').value = String(state.typingSpeed);
      if ($('speedVal')) $('speedVal').textContent = String(state.typingSpeed);
      setActivePreset(state.typingSpeed);
      renderShortcuts(state.shortcuts);
      attachRecorders(state);

      if ($('enabled')) {
        $('enabled').addEventListener('change', function () { save({ enabled: !!$('enabled').checked }); });
      }
      if ($('showIndicator')) {
        $('showIndicator').addEventListener('change', function () { save({ showIndicator: !!$('showIndicator').checked }); });
      }
      if ($('randomizeSpeed')) {
        $('randomizeSpeed').addEventListener('change', function () { save({ randomizeSpeed: !!$('randomizeSpeed').checked }); });
      }
      if ($('speed')) {
        $('speed').addEventListener('input', function () {
          const value = Math.max(1, Number($('speed').value) || 75);
          if ($('speedVal')) $('speedVal').textContent = String(value);
          setActivePreset(value);
          save({ typingSpeed: value });
        });
      }
      document.querySelectorAll('.preset').forEach(function (preset) {
        preset.addEventListener('click', function () {
          const value = Math.max(1, Number(preset.dataset.speed) || 75);
          if ($('speed')) $('speed').value = String(value);
          if ($('speedVal')) $('speedVal').textContent = String(value);
          setActivePreset(value);
          save({ typingSpeed: value });
        });
      });
    });
  }

  // ─── Route to correct page init ──────────────────────────────────────────────
  if (document.getElementById('start-btn') && document.getElementById('open-options')) {
    initPopupPage();
    return;
  }
  if (document.getElementById('enabled') && document.querySelector('.shortcut-grid')) {
    initOptionsPage();
    return;
  }

  // ─── CONTENT SCRIPT ──────────────────────────────────────────────────────────
  if (window.__vplPasteEnablerInjected__) return;
  window.__vplPasteEnablerInjected__ = true;

  const DEFAULT_SHORTCUTS = {
    paste: {
      win: { key: 'v', ctrl: true, shift: false, alt: false, meta: false },
      mac: { key: 'v', ctrl: false, shift: false, alt: false, meta: true }
    },
    copy: {
      win: { key: 'c', ctrl: true, shift: false, alt: false, meta: false },
      mac: { key: 'c', ctrl: false, shift: false, alt: false, meta: true }
    },
    autoTyper: {
      win: { key: 't', ctrl: true, shift: true, alt: false, meta: false },
      mac: { key: 't', ctrl: false, shift: true, alt: false, meta: true }
    }
  };

  const DEFAULTS = {
    enabled: true,
    showIndicator: true,
    typingSpeed: 75,
    randomizeSpeed: false,
    customShortcut: null,
    autoTyperShortcut: DEFAULT_SHORTCUTS.autoTyper.win,
    shortcuts: DEFAULT_SHORTCUTS
  };

  const IS_MAC = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || '');
  let settings = Object.assign({}, DEFAULTS);
  let isTyping = false;
  let cancelTyping = false;
  let charsTyped = 0;
  let totalChars = 0;

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function normalizeSettings(data) {
    const merged = Object.assign({}, clone(DEFAULTS), data || {});
    if (!merged.shortcuts) merged.shortcuts = clone(DEFAULT_SHORTCUTS);
    if (!merged.customShortcut && merged.shortcuts && merged.shortcuts.paste) {
      merged.customShortcut = merged.shortcuts.paste[IS_MAC ? 'mac' : 'win'] || null;
    }
    if ((!merged.autoTyperShortcut || !merged.autoTyperShortcut.key) && merged.shortcuts && merged.shortcuts.autoTyper) {
      merged.autoTyperShortcut = merged.shortcuts.autoTyper[IS_MAC ? 'mac' : 'win'] || clone(DEFAULT_SHORTCUTS.autoTyper.win);
    }
    return merged;
  }

  function loadSettings() {
    try {
      if (!chrome || !chrome.storage || !chrome.storage.sync) return;
      chrome.storage.sync.get(DEFAULTS, function (data) { settings = normalizeSettings(data); });
    } catch (_) {}
  }
  loadSettings();

  try {
    if (chrome && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== 'sync') return;
        const next = Object.assign({}, settings);
        Object.keys(changes || {}).forEach(function (key) { next[key] = changes[key].newValue; });
        settings = normalizeSettings(next);
        syncIndicatorVisibility();
      });
    }
  } catch (_) {}

  function isVisible(node) {
    if (!node) return false;
    if (node === document.body || node === document.documentElement) return true;
    return !!(node.offsetWidth || node.offsetHeight || node.getClientRects().length);
  }

  function findAceInput() {
    const active = document.activeElement;
    if (active && active.matches && active.matches('.ace_text-input')) return active;
    const inputs = document.querySelectorAll('.ace_text-input');
    for (let i = 0; i < inputs.length; i += 1) { if (isVisible(inputs[i])) return inputs[i]; }
    return inputs.length ? inputs[0] : null;
  }

  function findAceEditorInstance() {
    const active = document.activeElement;
    if (active && active.closest) {
      const activeEditor = active.closest('.ace_editor');
      if (activeEditor && activeEditor.env && activeEditor.env.editor) return activeEditor.env.editor;
    }
    const nodes = document.querySelectorAll('.ace_editor');
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      if (node.env && node.env.editor && isVisible(node)) return node.env.editor;
    }
    for (let i = 0; i < nodes.length; i += 1) {
      if (nodes[i].env && nodes[i].env.editor) return nodes[i].env.editor;
    }
    return null;
  }

  function focusAceInput() {
    const input = findAceInput();
    if (!input) {
      const active = document.activeElement;
      if (active && typeof active.focus === 'function') {
        try { active.focus({ preventScroll: true }); } catch (_) { try { active.focus(); } catch (_) {} }
      }
      return null;
    }
    try { input.focus({ preventScroll: true }); } catch (_) { try { input.focus(); } catch (_) {} }
    return input;
  }

  function matchShortcut(event, shortcut) {
    if (!shortcut || !shortcut.key) return false;
    if (String(event.key || '').toLowerCase() !== String(shortcut.key).toLowerCase()) return false;
    if (!!shortcut.ctrl !== !!event.ctrlKey) return false;
    if (!!shortcut.shift !== !!event.shiftKey) return false;
    if (!!shortcut.alt !== !!event.altKey) return false;
    if (!!shortcut.meta !== !!event.metaKey) return false;
    return true;
  }

  function ensureStyles() {
    if (document.getElementById('vpl-paste-style')) return;
    const style = document.createElement('style');
    style.id = 'vpl-paste-style';
    style.textContent =
        '@keyframes vplPulse{0%,100%{opacity:1}50%{opacity:0.35}}' +
        '@keyframes vplSlideIn{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}' +
        '#vpl-paste-indicator{position:fixed;bottom:18px;right:18px;z-index:2147483647;display:flex;align-items:center;gap:8px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:11px;color:#fff;pointer-events:none;animation:vplSlideIn 0.3s ease;}' +
        '#vpl-paste-indicator .vpl-dot{width:10px;height:10px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,0.2);flex-shrink:0;}' +
        '#vpl-paste-indicator.typing .vpl-dot{background:#f97316;box-shadow:0 0 0 3px rgba(249,115,22,0.25);animation:vplPulse 0.9s ease-in-out infinite;}' +
        '#vpl-paste-indicator .vpl-label{background:rgba(15,23,42,0.9);backdrop-filter:blur(8px);padding:4px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);display:none;letter-spacing:0.3px;}' +
        '#vpl-paste-indicator.typing .vpl-label,#vpl-paste-indicator.done .vpl-label{display:inline-block;}' +
        '#vpl-paste-indicator.done .vpl-dot{background:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,0.25);}';
    (document.head || document.documentElement).appendChild(style);
  }

  function injectIndicator() {
    if (!settings.showIndicator) return;
    if (document.getElementById('vpl-paste-indicator')) return;
    if (!document.body) return;
    ensureStyles();
    const wrap = document.createElement('div');
    wrap.id = 'vpl-paste-indicator';
    wrap.title = 'VPL Paste Enabler: Active';
    const dot = document.createElement('div');
    dot.className = 'vpl-dot';
    const label = document.createElement('div');
    label.className = 'vpl-label';
    wrap.appendChild(dot);
    wrap.appendChild(label);
    document.body.appendChild(wrap);
  }

  function syncIndicatorVisibility() {
    const indicator = document.getElementById('vpl-paste-indicator');
    if (settings.showIndicator) { if (!indicator) injectIndicator(); return; }
    if (indicator && indicator.parentNode) indicator.parentNode.removeChild(indicator);
  }

  function setIndicatorTyping(current, total) {
    const indicator = document.getElementById('vpl-paste-indicator');
    if (!indicator) return;
    indicator.classList.remove('done');
    indicator.classList.add('typing');
    const label = indicator.querySelector('.vpl-label');
    if (label) label.textContent = current + '/' + total + ' chars';
  }

  function setIndicatorDone() {
    const indicator = document.getElementById('vpl-paste-indicator');
    if (!indicator) return;
    indicator.classList.remove('typing');
    indicator.classList.add('done');
    const label = indicator.querySelector('.vpl-label');
    if (label) label.textContent = '✓ Done';
    window.setTimeout(function () {
      const current = document.getElementById('vpl-paste-indicator');
      if (!current) return;
      current.classList.remove('done');
      const currentLabel = current.querySelector('.vpl-label');
      if (currentLabel) currentLabel.textContent = '';
    }, 2000);
  }

  function setIndicatorIdle() {
    const indicator = document.getElementById('vpl-paste-indicator');
    if (!indicator) return;
    indicator.classList.remove('typing', 'done');
    const label = indicator.querySelector('.vpl-label');
    if (label) label.textContent = '';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectIndicator, { once: true });
  } else {
    injectIndicator();
  }

  function delay(ms) {
    return new Promise(function (resolve) { window.setTimeout(resolve, ms); });
  }

  function tryInsertText(text) {
    if (!text) return false;
    const aceInput = focusAceInput();
    if (!aceInput) {
      const active = document.activeElement;
      if (active && typeof active.focus === 'function') {
        try { active.focus({ preventScroll: true }); } catch (_) { try { active.focus(); } catch (_) {} }
      }
    }
    try { return !!document.execCommand('insertText', false, text); } catch (_) { return false; }
  }

  function getSelectedText() {
    const editor = findAceEditorInstance();
    if (editor) { try { return editor.getSelectedText() || ''; } catch (_) {} }
    try { return String(window.getSelection() || ''); } catch (_) { return ''; }
  }

  function setClipboardText(text, event) {
    let wrote = false;
    try { if (event && event.clipboardData) { event.clipboardData.setData('text/plain', text); wrote = true; } } catch (_) {}
    try { if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') { navigator.clipboard.writeText(text).catch(function () {}); wrote = true; } } catch (_) {}
    return wrote;
  }

  async function readClipboardText(event) {
    let text = '';
    try { if (event && event.clipboardData) { text = event.clipboardData.getData('text/plain') || ''; } } catch (_) {}
    if (text) return text;
    try { if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') { text = await navigator.clipboard.readText(); } } catch (_) {}
    return text || '';
  }

  async function autoType(text, speedMs) {
    if (!text) return false;
    // If already typing, cancel the previous session and wait a tick before starting new one
    if (isTyping) {
      cancelTyping = true;
      await delay(100);
    }

    focusAceInput();
    isTyping = true;
    cancelTyping = false;
    charsTyped = 0;
    totalChars = text.length;
    injectIndicator();
    setIndicatorTyping(0, totalChars);

    for (let index = 0; index < text.length; index += 1) {
      if (cancelTyping) break;

      const char = text[index];
      tryInsertText(char);
      charsTyped = index + 1;
      setIndicatorTyping(charsTyped, totalChars);

      // FIX: Read speed from current settings each iteration so popup changes take effect immediately
      let delayMs = Math.max(1, Number(speedMs) || Number(settings.typingSpeed) || 75);
      if (settings.randomizeSpeed) {
        const variation = delayMs * 0.2;
        delayMs = delayMs + ((Math.random() * 2) - 1) * variation;
        delayMs = Math.max(1, Math.round(delayMs));
      }
      await delay(delayMs);
    }

    isTyping = false;
    if (cancelTyping) {
      cancelTyping = false;
      setIndicatorIdle();
      return false;
    }
    setIndicatorDone();
    return true;
  }

  async function startAutoTyper(textFromMessage, speedOverride) {
    // Use text passed directly from popup — do NOT re-read clipboard here.
    // navigator.clipboard.readText() fails in content scripts without user gesture on the page.
    const text = textFromMessage || '';
    if (!text) return false;
    const speed = Math.max(1, Number(speedOverride) || Number(settings.typingSpeed) || 75);
    return autoType(text, speed);
  }

  function neutralizeEvent(event, shouldPreventDefault) {
    try { event.stopImmediatePropagation(); } catch (_) {}
    try { event.stopPropagation(); } catch (_) {}
    if (shouldPreventDefault) { try { event.preventDefault(); } catch (_) {} }
  }

  window.addEventListener('beforecopy', function (event) { if (!settings.enabled) return; neutralizeEvent(event, false); }, true);
  window.addEventListener('beforecut', function (event) { if (!settings.enabled) return; neutralizeEvent(event, false); }, true);
  window.addEventListener('beforepaste', function (event) { if (!settings.enabled) return; neutralizeEvent(event, false); }, true);

  window.addEventListener('paste', function (event) {
    if (!settings.enabled) return;
    neutralizeEvent(event, true);
    readClipboardText(event).then(function (text) {
      if (!text) return;
      tryInsertText(text);
    }).catch(function () {});
  }, true);

  window.addEventListener('copy', function (event) {
    if (!settings.enabled) return;
    neutralizeEvent(event, true);
    const selected = getSelectedText();
    if (!selected) return;
    setClipboardText(selected, event);
  }, true);

  window.addEventListener('cut', function (event) {
    if (!settings.enabled) return;
    neutralizeEvent(event, true);
    const selected = getSelectedText();
    if (!selected) return;
    setClipboardText(selected, event);
    focusAceInput();
    try { document.execCommand('delete', false, null); } catch (_) {}
  }, true);

  window.addEventListener('contextmenu', function (event) { if (!settings.enabled) return; neutralizeEvent(event, false); }, true);
  window.addEventListener('selectstart', function (event) { if (!settings.enabled) return; neutralizeEvent(event, false); }, true);

  window.addEventListener('keydown', function (event) {
    if (!settings.enabled) return;
    if (event.key === 'Escape' && isTyping) { cancelTyping = true; neutralizeEvent(event, false); return; }
    if (matchShortcut(event, settings.autoTyperShortcut)) { neutralizeEvent(event, true); startAutoTyper(); return; }
    if (settings.customShortcut && matchShortcut(event, settings.customShortcut)) { neutralizeEvent(event, false); return; }
    const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
    if (!hasModifier) return;
    const key = String(event.key || '').toLowerCase();
    if (key === 'v' || key === 'c' || key === 'x' || key === 'a') { neutralizeEvent(event, false); }
  }, true);

  try {
    if (chrome && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
        if (!message || !message.action) return;

        if (message.action === 'startAutoTyper') {
          startAutoTyper(message.text || '', message.speed || null).then(function (ok) {
            sendResponse({ ok: !!ok });
          }).catch(function () { sendResponse({ ok: false }); });
          return true;
        }

        if (message.action === 'cancelAutoTyper') {
          cancelTyping = true;
          sendResponse({ ok: true });
          return true;
        }

        // FIX: New action to update speed in real-time without page reload
        if (message.action === 'setSpeed') {
          const newSpeed = Math.max(1, Number(message.speed) || 75);
          settings.typingSpeed = newSpeed;
          sendResponse({ ok: true });
          return true;
        }

        if (message.action === 'setRandomize') {
          settings.randomizeSpeed = !!message.randomize;
          sendResponse({ ok: true });
          return true;
        }

        if (message.action === 'getStatus') {
          sendResponse({
            typing: isTyping,
            enabled: !!settings.enabled,
            charsTyped: charsTyped,
            totalChars: totalChars,
            typingSpeed: settings.typingSpeed
          });
          return true;
        }
      });
    }
  } catch (_) {}
})();