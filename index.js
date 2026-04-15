(() => {
    'use strict';

    const MODULE_NAME = 'custom_emojis_extension';
    const PANEL_ID = 'custom_emojis_extension_panel';
    const CHAT_OBSERVER_KEY = '__customEmojisObserver';

    const DEFAULT_SETTINGS = Object.freeze({
        enabled: true,
        emojis: []
    });

    let initialized = false;
    let uiInitialized = false;
    let scanQueued = false;
    let observer = null;

    function getST() {
        return window.SillyTavern;
    }

    function getContext() {
        return getST()?.getContext?.();
    }

    function cloneDefaults() {
        if (typeof structuredClone === 'function') {
            return structuredClone(DEFAULT_SETTINGS);
        }
        return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }

    function getSettings() {
        const ctx = getContext();
        if (!ctx) {
            return cloneDefaults();
        }

        if (!ctx.extensionSettings[MODULE_NAME]) {
            ctx.extensionSettings[MODULE_NAME] = cloneDefaults();
        }

        const settings = ctx.extensionSettings[MODULE_NAME];
        for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
            if (!Object.hasOwn(settings, key)) {
                settings[key] = Array.isArray(value) ? [] : value;
            }
        }

        if (!Array.isArray(settings.emojis)) {
            settings.emojis = [];
        }

        settings.emojis = settings.emojis
            .map(normalizeEmoji)
            .filter(Boolean);

        return settings;
    }

    function saveSettings() {
        const ctx = getContext();
        ctx?.saveSettingsDebounced?.();
    }

    function sanitizeShortcode(raw) {
        const value = String(raw ?? '')
            .trim()
            .replace(/^:+|:+$/g, '')
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_-]/g, '');

        return value;
    }

    function normalizeEmoji(entry) {
        if (!entry || typeof entry !== 'object') {
            return null;
        }

        const shortcode = sanitizeShortcode(entry.shortcode);
        const src = String(entry.src ?? '').trim();
        const alt = String(entry.alt ?? shortcode).trim() || shortcode;

        if (!shortcode || !src) {
            return null;
        }

        return { shortcode, src, alt };
    }

    function escapeRegExp(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function compileEmojiRegex() {
        const settings = getSettings();
        const names = [...new Set(settings.emojis.map(e => e.shortcode).filter(Boolean))].sort((a, b) => b.length - a.length);

        if (!names.length) {
            return null;
        }

        return new RegExp(`:(${names.map(escapeRegExp).join('|')}):`, 'gi');
    }

    function getEmojiByShortcode(shortcode) {
        const settings = getSettings();
        const key = sanitizeShortcode(shortcode);
        return settings.emojis.find(e => e.shortcode === key) ?? null;
    }

    function createEmojiElement(emoji) {
        const img = document.createElement('img');
        img.className = 'st-custom-emoji';
        img.src = emoji.src;
        img.alt = `:${emoji.shortcode}:`;
        img.title = `:${emoji.shortcode}:`;
        img.setAttribute('data-shortcode', emoji.shortcode);
        img.setAttribute('loading', 'lazy');
        img.decoding = 'async';
        return img;
    }

    function replaceTextNodeWithEmojis(textNode, regex) {
        const text = textNode.nodeValue ?? '';
        if (!text || !regex) {
            return false;
        }

        regex.lastIndex = 0;
        const matches = [...text.matchAll(regex)];
        if (!matches.length) {
            return false;
        }

        const frag = document.createDocumentFragment();
        let lastIndex = 0;

        for (const match of matches) {
            const matchIndex = match.index ?? 0;
            const matchedText = match[0];
            const shortcode = sanitizeShortcode(match[1]);
            const emoji = getEmojiByShortcode(shortcode);

            if (!emoji) {
                continue;
            }

            if (matchIndex > lastIndex) {
                frag.appendChild(document.createTextNode(text.slice(lastIndex, matchIndex)));
            }

            frag.appendChild(createEmojiElement(emoji));
            lastIndex = matchIndex + matchedText.length;
        }

        if (lastIndex === 0) {
            return false;
        }

        if (lastIndex < text.length) {
            frag.appendChild(document.createTextNode(text.slice(lastIndex)));
        }

        textNode.parentNode?.replaceChild(frag, textNode);
        return true;
    }

    function shouldSkipNode(node) {
        const parent = node.parentElement;
        if (!parent) {
            return true;
        }

        return Boolean(parent.closest('code, pre, textarea, script, style, noscript, .st-custom-emoji, .st-custom-emoji-settings'));
    }

    function renderEmojiTokens(root) {
        const regex = compileEmojiRegex();
        if (!regex || !root) {
            return;
        }

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        let current = walker.nextNode();

        while (current) {
            if (!shouldSkipNode(current)) {
                textNodes.push(current);
            }
            current = walker.nextNode();
        }

        for (const textNode of textNodes) {
            replaceTextNodeWithEmojis(textNode, regex);
        }
    }

    function prepareMessageElement(messageEl) {
        if (!messageEl || messageEl.nodeType !== Node.ELEMENT_NODE) {
            return;
        }

        if (!messageEl.classList.contains('mes_text')) {
            return;
        }

        const settings = getSettings();
        if (!settings.enabled) {
            return;
        }

        if (!messageEl.dataset.ceSourceHtml) {
            messageEl.dataset.ceSourceHtml = messageEl.innerHTML;
        } else {
            messageEl.innerHTML = messageEl.dataset.ceSourceHtml;
        }

        messageEl.querySelectorAll('.st-custom-emoji').forEach(img => img.remove());
        renderEmojiTokens(messageEl);
        messageEl.dataset.ceProcessed = '1';
    }

    function scanChat() {
        if (!getSettings().enabled) {
            return;
        }

        const chatRoot = document.querySelector('#chat') ?? document.body;
        if (!chatRoot) {
            return;
        }

        const messages = chatRoot.querySelectorAll('.mes_text');
        messages.forEach(prepareMessageElement);
    }

    function queueScan() {
        if (scanQueued) {
            return;
        }

        scanQueued = true;
        requestAnimationFrame(() => {
            scanQueued = false;
            scanChat();
        });
    }

    function attachObserver() {
        const chatRoot = document.querySelector('#chat') ?? document.body;
        if (!chatRoot || observer) {
            return;
        }

        observer = new MutationObserver(() => queueScan());
        observer.observe(chatRoot, { childList: true, subtree: true, characterData: true });
        window[CHAT_OBSERVER_KEY] = observer;
    }

    function detachObserver() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        if (window[CHAT_OBSERVER_KEY]) {
            delete window[CHAT_OBSERVER_KEY];
        }
    }

    function renderEmojiRow(emoji, index) {
        const shortcode = escapeHtml(emoji?.shortcode ?? '');
        const src = escapeHtml(emoji?.src ?? '');
        const preview = src
            ? `<img class="st-custom-emoji-preview" src="${src}" alt=":${shortcode}:" title=":${shortcode}:" />`
            : '<span class="st-custom-emoji-preview st-custom-emoji-preview-empty">No image</span>';

        return `
            <div class="st-custom-emoji-row" data-index="${index}">
                <div class="st-custom-emoji-row-top">
                    <label class="st-custom-emoji-label">
                        <span>Shortcode</span>
                        <input type="text" class="st-custom-emoji-shortcode" value="${shortcode}" placeholder="true" />
                    </label>
                    <button type="button" class="menu_button icon_button st-custom-emoji-remove" title="Remove">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
                <div class="st-custom-emoji-row-body">
                    <div class="st-custom-emoji-preview-wrap">${preview}</div>
                    <div class="st-custom-emoji-fields">
                        <label class="st-custom-emoji-label">
                            <span>Image URL or data URL</span>
                            <input type="text" class="st-custom-emoji-src" value="${src}" placeholder="https://... or data:image/png;base64,..." />
                        </label>
                        <label class="st-custom-emoji-label">
                            <span>Upload image</span>
                            <input type="file" class="st-custom-emoji-file" accept="image/*" />
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function ensurePanel() {
        if (uiInitialized) {
            return;
        }

        const host = document.querySelector('#extensions_settings2');
        if (!host) {
            return;
        }

        const settings = getSettings();

        const panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.className = 'inline-drawer st-custom-emoji-settings';

        panel.innerHTML = `
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>Custom Emojis</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <div class="st-custom-emoji-toolbar">
                    <label class="st-custom-emoji-switch">
                        <input type="checkbox" id="st_custom_emojis_enabled" ${settings.enabled ? 'checked' : ''} />
                        <span>Enable custom emoji rendering</span>
                    </label>
                    <button type="button" class="menu_button" id="st_custom_emojis_add">
                        <i class="fa-solid fa-plus"></i>
                        Add emoji
                    </button>
                </div>

                <div class="st-custom-emoji-help">
                    Use tokens like <code>:true:</code> in user messages or bot replies.
                </div>

                <div id="st_custom_emojis_list" class="st-custom-emoji-list"></div>
            </div>
        `;

        host.appendChild(panel);

        panel.querySelector('#st_custom_emojis_enabled')?.addEventListener('change', (event) => {
            getSettings().enabled = Boolean(event.target.checked);
            saveSettings();
            queueScan();
        });

        panel.querySelector('#st_custom_emojis_add')?.addEventListener('click', () => {
            const settings = getSettings();
            settings.emojis.push({ shortcode: 'new_emoji', src: '', alt: 'new_emoji' });
            saveSettings();
            renderSettingsList();
        });

        panel.addEventListener('input', debounce(handlePanelInput, 50));
        panel.addEventListener('change', handlePanelChange);
        panel.addEventListener('click', handlePanelClick);

        uiInitialized = true;
        renderSettingsList();
    }

    function handlePanelClick(event) {
        const removeBtn = event.target.closest('.st-custom-emoji-remove');
        if (removeBtn) {
            const row = removeBtn.closest('.st-custom-emoji-row');
            const index = Number(row?.dataset?.index);
            if (!Number.isNaN(index)) {
                const settings = getSettings();
                settings.emojis.splice(index, 1);
                saveSettings();
                renderSettingsList();
                queueScan();
            }
        }
    }

    function handlePanelChange(event) {
        const fileInput = event.target.closest('.st-custom-emoji-file');
        if (fileInput) {
            const row = fileInput.closest('.st-custom-emoji-row');
            const index = Number(row?.dataset?.index);
            const file = fileInput.files?.[0];
            if (Number.isNaN(index) || !file) {
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                const settings = getSettings();
                if (settings.emojis[index]) {
                    settings.emojis[index].src = String(reader.result ?? '');
                    if (!settings.emojis[index].alt) {
                        settings.emojis[index].alt = settings.emojis[index].shortcode;
                    }
                    saveSettings();
                    renderSettingsList();
                    queueScan();
                }
            };
            reader.readAsDataURL(file);
        }
    }

    function handlePanelInput(event) {
        const row = event.target.closest('.st-custom-emoji-row');
        if (!row) {
            return;
        }

        const index = Number(row.dataset.index);
        if (Number.isNaN(index)) {
            return;
        }

        const settings = getSettings();
        const emoji = settings.emojis[index];
        if (!emoji) {
            return;
        }

        const shortcodeInput = row.querySelector('.st-custom-emoji-shortcode');
        const srcInput = row.querySelector('.st-custom-emoji-src');

        if (shortcodeInput) {
            emoji.shortcode = sanitizeShortcode(shortcodeInput.value);
        }
        if (srcInput) {
            emoji.src = String(srcInput.value).trim();
        }

        settings.emojis[index] = normalizeEmoji(emoji) ?? emoji;
        saveSettings();
        scheduleRenderListUpdate();
    }

    let listUpdateQueued = false;
    function scheduleRenderListUpdate() {
        if (listUpdateQueued) {
            return;
        }
        listUpdateQueued = true;
        requestAnimationFrame(() => {
            listUpdateQueued = false;
            renderSettingsList();
            queueScan();
        });
    }

    function renderSettingsList() {
        const list = document.querySelector('#st_custom_emojis_list');
        if (!list) {
            return;
        }

        const settings = getSettings();
        if (!settings.emojis.length) {
            list.innerHTML = `<div class="st-custom-emoji-empty">No custom emojis yet. Add one to start.</div>`;
            return;
        }

        list.innerHTML = settings.emojis.map(renderEmojiRow).join('');

        list.querySelectorAll('.st-custom-emoji-row').forEach((row, index) => {
            row.dataset.index = String(index);
        });

        list.querySelectorAll('.st-custom-emoji-preview').forEach((img) => {
            img.addEventListener('error', () => {
                img.classList.add('st-custom-emoji-preview-error');
            }, { once: true });
        });
    }

    function debounce(fn, delay) {
        let timer = null;
        return (...args) => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => fn(...args), delay);
        };
    }

    async function initUi() {
        ensurePanel();
        queueScan();
        attachObserver();
    }

    function applyToExistingMessages() {
        scanChat();
    }

    function init() {
        if (initialized) {
            return;
        }
        initialized = true;

        const app = getST();
        if (!app?.getContext) {
            console.warn('[Custom Emojis] SillyTavern context is unavailable.');
            return;
        }

        const ctx = getContext();
        getSettings();

        const onReady = () => {
            initUi();
            applyToExistingMessages();
        };

        // APP_INITIALIZED is useful for early UI injection.
        ctx.eventSource?.on?.(ctx.event_types?.APP_INITIALIZED, () => {
            initUi();
        });

        ctx.eventSource?.on?.(ctx.event_types?.APP_READY, onReady);
        ctx.eventSource?.on?.(ctx.event_types?.CHAT_CHANGED, () => {
            queueScan();
        });

        // Immediate fallback for cases where the events already fired.
        if (document.readyState !== 'loading') {
            initUi();
            applyToExistingMessages();
        }
    }

    // Public hook names referenced by manifest.json
    window.onActivate = init;
    window.onEnable = init;
    window.onInstall = init;
    window.onUpdate = init;
    window.onDelete = detachObserver;
    window.onDisable = detachObserver;

    init();
})();
