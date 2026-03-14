#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const APP_NAME = 'KrazydenAI';
const APP_VERSION = '0.3.0';
const CONFIG_PATH = path.join(__dirname, 'krazydenai.config.json');
const HISTORY_PATH = path.join(__dirname, 'krazydenai.history.json');
const KB_PATH = path.join(__dirname, 'krazydenai.kb.json');

const rows    = ["  _/    _/ _/_/_/      _/    _/_/_/_/ _/    _/ _/_/_/   _/_/_/_/ _/    _/      _/    _/_/_/","  _/  _/   _/    _/   _/_/       _/   _/  _/   _/    _/ _/       _/_/  _/     _/_/     _/","  _/_/     _/_/_/    _/  _/    _/     _/_/     _/    _/ _/_/_/   _/  _/_/    _/  _/    _/","  _/  _/   _/  _/   _/_/_/_/ _/         _/     _/    _/ _/       _/    _/   _/_/_/_/   _/","  _/    _/ _/    _/ _/    _/ _/_/_/_/   _/     _/_/_/   _/_/_/_/ _/    _/   _/    _/ _/_/_/"];
const purples = [[100,20,180],[140,40,220],[175,65,245],[210,100,255],[240,150,255]];

const DEFAULT_MODELS = ['KrazyKoreDenAI (64m, default)', 'KoreDenAI (4B)'];
const DEFAULT_LABELS = { user: 'User', bot: 'KrazyDen' };
const DEFAULT_KB_EXTS = ['.txt', '.md', '.log', '.json', '.csv'];
const CTRL_ZOOM_PASSTHROUGH_MS = 1000;
const TIPS = [
  'Tip: Press / to open the command palette instantly.',
  'Tip: Use /model to switch builds, or /model next to cycle.',
  'Tip: Use /bookmark add <text> to save a prompt.',
  'Tip: Ctrl+R opens history search with live filtering.',
  'Tip: Use /layout compact for a tighter workspace.'
];

const THEME_PRESETS = {
  nebula: {
    bg: [10,5,18],
    popupBg: [24,16,38],
    popupHdrBg: [30,22,46],
    popupSelBg: [58,50,92],
    shadowBg: [6,4,10],
    promptLabel: [100,160,255],
    promptText: [255,255,255],
    status: [160,210,190],
    separator: [40,60,120],
    info: [150,190,230],
    hint: [170,190,220],
    header: [220,230,255],
    brand: [130,180,255]
  },
  ocean: {
    bg: [8,12,20],
    popupBg: [14,24,44],
    popupHdrBg: [20,32,58],
    popupSelBg: [36,68,104],
    shadowBg: [5,8,14],
    promptLabel: [120,190,255],
    promptText: [230,245,255],
    status: [160,220,210],
    separator: [40,70,110],
    info: [160,200,230],
    hint: [150,180,210],
    header: [220,240,255],
    brand: [120,200,255]
  },
  ember: {
    bg: [16,8,6],
    popupBg: [34,16,12],
    popupHdrBg: [44,22,14],
    popupSelBg: [78,38,20],
    shadowBg: [10,6,5],
    promptLabel: [255,170,110],
    promptText: [255,240,220],
    status: [240,200,150],
    separator: [120,60,40],
    info: [220,180,150],
    hint: [200,160,130],
    header: [255,225,200],
    brand: [255,180,130]
  },
  mono: {
    bg: [12,12,12],
    popupBg: [28,28,28],
    popupHdrBg: [36,36,36],
    popupSelBg: [64,64,64],
    shadowBg: [6,6,6],
    promptLabel: [200,200,200],
    promptText: [245,245,245],
    status: [190,190,190],
    separator: [90,90,90],
    info: [210,210,210],
    hint: [170,170,170],
    header: [240,240,240],
    brand: [210,210,210]
  }
};

const DEFAULT_CONFIG = {
  version: APP_VERSION,
  theme: 'nebula',
  models: DEFAULT_MODELS,
  modelIndex: 0,
  historyLimit: 80,
  logLimit: 200,
  enableMouseScroll: true,
  enableCtrlZoomPassthrough: true,
  enableAnimation: true,
  showCommandHelpPanel: true,
  showTimestamps: false,
  showStatusBar: true,
  showScrollbar: true,
  enableFuzzySearch: true,
  showWrap: true,
  wrapIndent: 2,
  followLog: true,
  aliases: {},
  perfMode: false,
  extraDefaultsApplied: false,
  showHeader: true,
  showLogo: true,
  showHints: true,
  showModelLine: true,
  showStatusLine: true,
  layout: 'full',
  userLabel: DEFAULT_LABELS.user,
  botLabel: DEFAULT_LABELS.bot,
  zoomMode: false,
  promptPosition: 'bottom',
  kbChunkSize: 420,
  kbChunkOverlap: 60,
  kbMaxChunksPerDoc: 200,
  bookmarks: []
};

// Settings schema placeholder (assigned later) to avoid TDZ in loadConfig.
let SETTINGS_SCHEMA = [];

function safeReadJson(filePath){
  try{
    if(!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  }catch(e){
    return null;
  }
}

function safeWriteJson(filePath, data){
  try{
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  }catch(e){
    return false;
  }
}

function safeWriteText(filePath, text){
  try{
    fs.writeFileSync(filePath, String(text), 'utf8');
    return true;
  }catch(e){
    return false;
  }
}

function normalizeModels(models){
  if(!Array.isArray(models)) return DEFAULT_MODELS.slice();
  const cleaned = models.map(m => String(m).trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : DEFAULT_MODELS.slice();
}

function normalizeBookmarks(bookmarks){
  if(!Array.isArray(bookmarks)) return [];
  const cleaned = bookmarks.map(b => String(b).trim()).filter(Boolean);
  const seen = new Set();
  return cleaned.filter(item => {
    const key = item.toLowerCase();
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function loadConfig(){
  const fromDisk = safeReadJson(CONFIG_PATH);
  if(!fromDisk) return { ...DEFAULT_CONFIG };
  const cfg = {
    ...DEFAULT_CONFIG,
    ...fromDisk,
    models: normalizeModels(fromDisk.models || DEFAULT_CONFIG.models),
    bookmarks: normalizeBookmarks(fromDisk.bookmarks || []),
    userLabel: String(fromDisk.userLabel || DEFAULT_CONFIG.userLabel),
    botLabel: String(fromDisk.botLabel || DEFAULT_CONFIG.botLabel),
    aliases: { ...(fromDisk.aliases || {}) },
    followLog: fromDisk.followLog !== undefined ? !!fromDisk.followLog : DEFAULT_CONFIG.followLog
  };
  return cfg;
}

function loadHistory(){
  const data = safeReadJson(HISTORY_PATH);
  if(!data) return { history: [], logLines: [] };
  const hist = Array.isArray(data.history) ? data.history.map(String) : [];
  const logs = Array.isArray(data.logLines) ? data.logLines.map(String) : [];
  return { history: hist, logLines: logs };
}

function loadKB(){
  const data = safeReadJson(KB_PATH);
  if(!data) return { docs: [], chunks: [] };
  const docs = Array.isArray(data.docs) ? data.docs : [];
  const chunks = Array.isArray(data.chunks) ? data.chunks : [];
  return { docs, chunks };
}

const commands = [
  { label: '/help', desc: 'Show every available slash command', usage: '/help', example: '/help', detail: 'Open the command palette and show all commands.', category: 'Core' },
  { label: '/model', desc: 'Open the model selector', usage: '/model', example: '/model', detail: 'Pick which model the CLI targets.', category: 'Core' },
  { label: '/palette', desc: 'Open the command palette', usage: '/palette', example: '/palette', detail: 'Open the slash command palette.', category: 'Core' },
  { label: '/status', desc: 'Show CLI status and version', usage: '/status', example: '/status', detail: 'Display version, model, and settings snapshot.', category: 'Core' },
  { label: '/clearall', desc: 'Clear input, log, history, filters', usage: '/clearall', example: '/clearall', detail: 'Resets input, log, history, filters.', category: 'Core' },
  { label: '/history', desc: 'Open history search', usage: '/history', example: '/history', detail: 'Search and reuse previous prompts.', category: 'History' },
  { label: '/search', desc: 'Search prompt history', usage: '/search <text>', example: '/search hello', detail: 'Find history entries matching a query.', category: 'History' },
  { label: '/bookmark', desc: 'Manage bookmarks', usage: '/bookmark <add|list|use|remove|clear>', example: '/bookmark add build prompt', detail: 'Save and reuse frequent prompts.', category: 'History' },
  { label: '/kb', desc: 'Manage the local knowledge base', usage: '/kb <add|addfile|adddir|list|drop|clear|search|stats|export|import>', example: '/kb search roadmap', detail: 'Store local docs and retrieve snippets.', category: 'RAG' },
  { label: '/rag', desc: 'Search the knowledge base', usage: '/rag <query>', example: '/rag release plan', detail: 'Alias to /kb search for fast retrieval.', category: 'RAG' },
  { label: '/ask', desc: 'Ask with KB context', usage: '/ask <query>', example: '/ask what is the plan', detail: 'Retrieve KB context and answer in beta mode.', category: 'RAG' },
  { label: '/sources', desc: 'Show last KB sources', usage: '/sources', example: '/sources', detail: 'List the last retrieval sources.', category: 'RAG' },
  { label: '/last', desc: 'Load last prompt into input', usage: '/last', example: '/last', detail: 'Paste your most recent prompt into the input line.', category: 'History' },
  { label: '/repeat', desc: 'Repeat the last prompt', usage: '/repeat', example: '/repeat', detail: 'Re-run the most recent prompt and log the response.', category: 'History' },
  { label: '/theme', desc: 'Switch the UI theme', usage: '/theme <name>', example: '/theme ocean', detail: 'Apply a visual theme preset.', category: 'Appearance' },
  { label: '/layout', desc: 'Switch layout density', usage: '/layout <full|compact|minimal>', example: '/layout compact', detail: 'Adjust header density and spacing.', category: 'Appearance' },
  { label: '/logo', desc: 'Toggle the ASCII logo', usage: '/logo', example: '/logo', detail: 'Show or hide the KrazydenAI logo.', category: 'Appearance' },
  { label: '/hints', desc: 'Toggle hint line', usage: '/hints', example: '/hints', detail: 'Show or hide the helper hint line.', category: 'Appearance' },
  { label: '/header', desc: 'Toggle the header block', usage: '/header', example: '/header', detail: 'Show or hide the full top header area.', category: 'Appearance' },
  { label: '/statusbar', desc: 'Toggle the status bar', usage: '/statusbar', example: '/statusbar', detail: 'Show or hide the status bar above the prompt.', category: 'Appearance' },
  { label: '/scrollbar', desc: 'Toggle the log scrollbar', usage: '/scrollbar', example: '/scrollbar', detail: 'Show or hide the log scrollbar.', category: 'Appearance' },
  { label: '/timestamps', desc: 'Toggle timestamps', usage: '/timestamps', example: '/timestamps', detail: 'Toggle timestamps for log lines.', category: 'Appearance' },
  { label: '/fuzzy', desc: 'Toggle fuzzy search', usage: '/fuzzy', example: '/fuzzy', detail: 'Enable or disable fuzzy command matching.', category: 'Appearance' },
  { label: '/config', desc: 'Show config path and keys', usage: '/config', example: '/config', detail: 'Show where config is stored and current values.', category: 'System' },
  { label: '/set', desc: 'Set a config value', usage: '/set <key> <value>', example: '/set historyLimit 120', detail: 'Update a config value and save it.', category: 'System' },
  { label: '/get', desc: 'Get a config value', usage: '/get <key>', example: '/get theme', detail: 'Read a config value.', category: 'System' },
  { label: '/toggle', desc: 'Toggle a config value', usage: '/toggle <key>', example: '/toggle enableAnimation', detail: 'Flip a boolean config value.', category: 'System' },
  { label: '/zoom', desc: 'Toggle zoom passthrough mode', usage: '/zoom', example: '/zoom', detail: 'Disable mouse capture so Ctrl/Cmd+scroll can zoom.', category: 'System' },
  { label: '/quiet', desc: 'Minimal redraw to reduce flicker', usage: '/quiet', example: '/quiet', detail: 'Turn off animation and status bar for calmer rendering.', category: 'System' },
  { label: '/outline', desc: 'Show command categories and counts', usage: '/outline', example: '/outline', detail: 'Quick overview of commands by category.', category: 'System' },
  { label: '/follow', desc: 'Toggle auto-scroll follow', usage: '/follow', example: '/follow', detail: 'Keep log pinned to bottom on new messages.', category: 'System' },
  { label: '/filter', desc: 'Filter log lines', usage: '/filter <text>', example: '/filter error', detail: 'Show only log lines containing text.', category: 'System' },
  { label: '/clearfilter', desc: 'Clear log filter', usage: '/clearfilter', example: '/clearfilter', detail: 'Remove any active log filter.', category: 'System' },
  { label: '/alias', desc: 'Create command alias', usage: '/alias <add|remove|list|clear> ...', example: '/alias add h history', detail: 'Add short aliases for commands.', category: 'System' },
  { label: '/perf', desc: 'Toggle render perf overlay', usage: '/perf', example: '/perf', detail: 'Show render timing in status bar.', category: 'System' },
  { label: '/settings', desc: 'Open settings palette', usage: '/settings [query]', example: '/settings theme', detail: 'Browse and tweak settings (filter optional).', category: 'System' },
  { label: '/addfile', desc: 'Add file to KB', usage: '/addfile <path>', example: '/addfile docs/plan.md', detail: 'Shortcut to /kb addfile.', category: 'RAG' },
  { label: '/rag', desc: 'Search the knowledge base', usage: '/rag <query>', example: '/rag release plan', detail: 'Alias to /kb search for fast retrieval.', category: 'RAG' },
  { label: '/export', desc: 'Export config to file', usage: '/export <path>', example: '/export myconfig.json', detail: 'Save config to a specific file.', category: 'System' },
  { label: '/import', desc: 'Import config from file', usage: '/import <path>', example: '/import myconfig.json', detail: 'Load config from a file.', category: 'System' },
  { label: '/exportlog', desc: 'Export log output', usage: '/exportlog <path>', example: '/exportlog log.txt', detail: 'Save the prompt log to a text file.', category: 'System' },
  { label: '/exporthistory', desc: 'Export prompt history', usage: '/exporthistory <path>', example: '/exporthistory history.json', detail: 'Save history to a JSON file.', category: 'System' },
  { label: '/importhistory', desc: 'Import prompt history', usage: '/importhistory <path> [merge]', example: '/importhistory history.json merge', detail: 'Load history from a JSON file.', category: 'System' },
  { label: '/save', desc: 'Force save config/history', usage: '/save', example: '/save', detail: 'Write config and history to disk immediately.', category: 'System' },
  { label: '/reload', desc: 'Reload config/history', usage: '/reload', example: '/reload', detail: 'Reload config and history from disk.', category: 'System' },
  { label: '/keys', desc: 'Show keybindings', usage: '/keys', example: '/keys', detail: 'List available keyboard shortcuts.', category: 'System' },
  { label: '/log', desc: 'Show log stats', usage: '/log', example: '/log', detail: 'Show log size and scroll position.', category: 'System' },
  { label: '/stats', desc: 'Show session stats', usage: '/stats', example: '/stats', detail: 'Show uptime, commands run, and prompts sent.', category: 'System' },
  { label: '/refresh', desc: 'Redraw the UI', usage: '/refresh', example: '/refresh', detail: 'Force a full screen redraw.', category: 'System' },
  { label: '/about', desc: 'About KrazydenAI', usage: '/about', example: '/about', detail: 'Show product info.', category: 'System' },
  { label: '/reset', desc: 'Reset this session', usage: '/reset', example: '/reset', detail: 'Clear input, history, and logs.', category: 'System' },
  { label: '/top', desc: 'Scroll log to the top', usage: '/top', example: '/top', detail: 'Jump to the oldest log line.', category: 'Navigation' },
  { label: '/bottom', desc: 'Scroll log to the bottom', usage: '/bottom', example: '/bottom', detail: 'Jump to the latest log line.', category: 'Navigation' },
  { label: '/pageup', desc: 'Page up in the log', usage: '/pageup', example: '/pageup', detail: 'Scroll the log up by one page.', category: 'Navigation' },
  { label: '/pagedown', desc: 'Page down in the log', usage: '/pagedown', example: '/pagedown', detail: 'Scroll the log down by one page.', category: 'Navigation' },
  { label: '/find', desc: 'Find text in the log', usage: '/find <text>', example: '/find beta', detail: 'Search for text in log output.', category: 'Navigation' },
  { label: '/time', desc: 'Show local time', usage: '/time', example: '/time', detail: 'Display the local time.', category: 'Utilities' },
  { label: '/date', desc: 'Show local date', usage: '/date', example: '/date', detail: "Display today's date.", category: 'Utilities' },
  { label: '/sys', desc: 'Show system info', usage: '/sys', example: '/sys', detail: 'Display Node, platform, and terminal info.', category: 'Utilities' },
  { label: '/calc', desc: 'Evaluate a calculation', usage: '/calc <expr>', example: '/calc (12+8)/4', detail: 'Evaluate a safe math expression.', category: 'Utilities' },
  { label: '/label', desc: 'Set or show labels', usage: '/label <user|bot> <name>', example: '/label bot KrazyDen', detail: 'Change User/Bot labels in logs and prompt.', category: 'Utilities' },
  { label: '/tip', desc: 'Show a tip', usage: '/tip', example: '/tip', detail: 'Display a helpful tip.', category: 'Utilities' },
  { label: '/ping', desc: 'Quick health check', usage: '/ping', example: '/ping', detail: 'Respond with a quick status line.', category: 'Utilities' },
  { label: '/exit', desc: 'Close KrazydenAI', usage: '/exit', example: '/exit', detail: 'Exit the CLI.', category: 'System' }
];

// Base quick actions with meaningful slugs.
const BASE_QUICK_ACTIONS = [
  { slug:'theme-nebula', name: 'Theme: Nebula', desc: 'Apply nebula theme', handler: ()=>{ applyTheme('nebula'); setConfigValue('theme','nebula'); requestRender(true);} },
  { slug:'theme-ocean', name: 'Theme: Ocean', desc: 'Apply ocean theme', handler: ()=>{ applyTheme('ocean'); setConfigValue('theme','ocean'); requestRender(true);} },
  { slug:'theme-ember', name: 'Theme: Ember', desc: 'Apply ember theme', handler: ()=>{ applyTheme('ember'); setConfigValue('theme','ember'); requestRender(true);} },
  { slug:'theme-mono', name: 'Theme: Mono', desc: 'Apply mono theme', handler: ()=>{ applyTheme('mono'); setConfigValue('theme','mono'); requestRender(true);} },
  { slug:'toggle-wrap', name: 'Toggle Wrap', desc: 'Toggle log line wrapping', handler: ()=>{ config.showWrap=!config.showWrap; setConfigValue('showWrap',config.showWrap); requestRender(); } },
  { slug:'toggle-timestamps', name: 'Toggle Timestamps', desc: 'Show/hide timestamps', handler: ()=>{ config.showTimestamps=!config.showTimestamps; setConfigValue('showTimestamps',config.showTimestamps);} },
  { slug:'toggle-status-bar', name: 'Toggle Status Bar', desc: 'Show/hide status bar', handler: ()=>{ config.showStatusBar=!config.showStatusBar; setConfigValue('showStatusBar',config.showStatusBar); requestRender(); } },
  { slug:'toggle-hints', name: 'Toggle Hints', desc: 'Show/hide hint line', handler: ()=>{ config.showHints=!config.showHints; setConfigValue('showHints',config.showHints); markLayoutCustom(); requestRender(); } },
  { slug:'toggle-header', name: 'Toggle Header', desc: 'Show/hide header block', handler: ()=>{ config.showHeader=!config.showHeader; setConfigValue('showHeader',config.showHeader); markLayoutCustom(); requestRender(true); } },
  { slug:'toggle-logo', name: 'Toggle Logo', desc: 'Show/hide ASCII logo', handler: ()=>{ config.showLogo=!config.showLogo; setConfigValue('showLogo',config.showLogo); markLayoutCustom(); requestRender(true);} },
  { slug:'toggle-follow', name: 'Toggle Follow', desc: 'Follow log on new lines', handler: ()=>{ config.followLog=!config.followLog; setConfigValue('followLog',config.followLog);} },
  { slug:'toggle-perf', name: 'Toggle Perf Overlay', desc: 'Show render timing overlay', handler: ()=>{ config.perfMode=!config.perfMode; setConfigValue('perfMode',config.perfMode);} },
  { slug:'toggle-zoom', name: 'Toggle Zoom Mode', desc: 'Enable Ctrl/Cmd+scroll zoom passthrough', handler: ()=>{ config.zoomMode=!config.zoomMode; setConfigValue('zoomMode',config.zoomMode); applyInputMode(); } },
  { slug:'toggle-mouse-scroll', name: 'Toggle Mouse Scroll', desc: 'Enable/disable mouse scrolling', handler: ()=>{ config.enableMouseScroll=!config.enableMouseScroll; setConfigValue('enableMouseScroll',config.enableMouseScroll); setMouseTracking(!!config.enableMouseScroll && !config.zoomMode);} },
  { slug:'layout-compact', name: 'Layout: Compact', desc: 'Switch to compact layout', handler: ()=>{ applyLayout('compact'); scheduleSave(); requestRender(true);} },
  { slug:'layout-minimal', name: 'Layout: Minimal', desc: 'Switch to minimal layout', handler: ()=>{ applyLayout('minimal'); scheduleSave(); requestRender(true);} },
  { slug:'layout-full', name: 'Layout: Full', desc: 'Switch to full layout', handler: ()=>{ applyLayout('full'); scheduleSave(); requestRender(true);} },
  { slug:'wrap-indent-up', name: 'Wrap Indent +1', desc: 'Increase wrap indent', handler: ()=>{ config.wrapIndent = clamp((config.wrapIndent||0)+1,0,8); setConfigValue('wrapIndent',config.wrapIndent);} },
  { slug:'wrap-indent-down', name: 'Wrap Indent -1', desc: 'Decrease wrap indent', handler: ()=>{ config.wrapIndent = clamp((config.wrapIndent||0)-1,0,8); setConfigValue('wrapIndent',config.wrapIndent);} },
  { slug:'history-limit-up', name: 'History Limit +20', desc: 'Increase history limit', handler: ()=>{ config.historyLimit = clamp((config.historyLimit||DEFAULT_CONFIG.historyLimit)+20,10,1000); setConfigValue('historyLimit',config.historyLimit);} },
  { slug:'history-limit-down', name: 'History Limit -20', desc: 'Decrease history limit', handler: ()=>{ config.historyLimit = clamp((config.historyLimit||DEFAULT_CONFIG.historyLimit)-20,10,1000); setConfigValue('historyLimit',config.historyLimit);} },
  { slug:'log-limit-up', name: 'Log Limit +50', desc: 'Increase log limit', handler: ()=>{ config.logLimit = clamp((config.logLimit||DEFAULT_CONFIG.logLimit)+50,20,2000); setConfigValue('logLimit',config.logLimit); trimLog(); } },
  { slug:'log-limit-down', name: 'Log Limit -50', desc: 'Decrease log limit', handler: ()=>{ config.logLimit = clamp((config.logLimit||DEFAULT_CONFIG.logLimit)-50,20,2000); setConfigValue('logLimit',config.logLimit); trimLog(); } },
  { slug:'scroll-top', name: 'Scroll: Top', desc: 'Jump to top of log', handler: ()=>{ logScroll = Math.max(0, logLines.length - logViewportHeight); } },
  { slug:'scroll-bottom', name: 'Scroll: Bottom', desc: 'Jump to bottom of log', handler: ()=>{ logScroll = 0; } },
  { slug:'scroll-page-up', name: 'Scroll: Page Up', desc: 'Page up in log', handler: ()=>{ adjustLogScroll(Math.max(1, logViewportHeight)); } },
  { slug:'scroll-page-down', name: 'Scroll: Page Down', desc: 'Page down in log', handler: ()=>{ adjustLogScroll(-Math.max(1, logViewportHeight)); } },
  { slug:'clear-log', name: 'Clear Log', desc: 'Clear all log lines', handler: ()=>{ logLines = []; logScroll = 0; scheduleSave(); requestRender(true);} },
  { slug:'clear-input', name: 'Clear Input', desc: 'Clear current input', handler: ()=>{ setInput(''); } },
  { slug:'save-now', name: 'Save Now', desc: 'Force save config/history/KB', handler: ()=>{ saveConfig(); saveHistory(); saveKB(); } },
  { slug:'reload-now', name: 'Reload Now', desc: 'Reload config/history/KB from disk', handler: ()=>{ runCommand('reload'); } },
  { slug:'show-keybindings', name: 'Show Keybindings', desc: 'Log keybindings', handler: ()=>{ KEYBINDINGS.forEach(b=>addLogLine(`${b.keys}: ${b.desc}`)); } },
  { slug:'show-status', name: 'Show Status', desc: 'Show current status snapshot', handler: ()=>{ runCommand('status'); } },
  { slug:'show-stats', name: 'Show Stats', desc: 'Show session stats', handler: ()=>{ runCommand('stats'); } },
  { slug:'show-tip', name: 'Show Tip', desc: 'Log a helpful tip', handler: ()=>{ const tip=TIPS[Math.floor(Math.random()*TIPS.length)]; addLogLine(tip); } },
  { slug:'open-palette', name: 'Open Palette', desc: 'Open command palette', handler: ()=>{ showCommandMenu=true; lastCommandQuery=''; selectedCommand=0; savedInput=null; requestRender(); } },
  { slug:'open-settings', name: 'Open Settings', desc: 'Open settings palette', handler: ()=>{ showSettingsMenu=true; settingsFilter=''; selectedSetting=0; requestRender(); } },
  { slug:'open-history', name: 'Open History', desc: 'Open history search', handler: ()=>{ openHistoryMenu(config.defaultHistoryQuery||''); } },
  { slug:'open-models', name: 'Open Models', desc: 'Open model selector', handler: ()=>{ showModelMenu=true; requestRender(); } },
  { slug:'toggle-animation', name: 'Toggle Animation', desc: 'Enable/disable popup animations', handler: ()=>{ config.enableAnimation=!config.enableAnimation; setConfigValue('enableAnimation',config.enableAnimation);} },
  { slug:'toggle-fuzzy', name: 'Toggle Fuzzy Search', desc: 'Enable/disable fuzzy palette search', handler: ()=>{ config.enableFuzzySearch=!config.enableFuzzySearch; setConfigValue('enableFuzzySearch',config.enableFuzzySearch);} },
  { slug:'toggle-status-line', name: 'Toggle Status Line', desc: 'Show/hide status line', handler: ()=>{ config.showStatusLine=!config.showStatusLine; setConfigValue('showStatusLine',config.showStatusLine); requestRender(); } },
  { slug:'toggle-model-line', name: 'Toggle Model Line', desc: 'Show/hide model line', handler: ()=>{ config.showModelLine=!config.showModelLine; setConfigValue('showModelLine',config.showModelLine); requestRender(); } },
  { slug:'bookmark-last', name: 'Bookmark Last Prompt', desc: 'Bookmark last history entry', handler: ()=>{ if(history.length){ const last=history[history.length-1]; config.bookmarks=config.bookmarks||[]; config.bookmarks.push(last); config.bookmarks=normalizeBookmarks(config.bookmarks); setConfigValue('bookmarks',config.bookmarks); addLogLine(`Bookmarked: ${last}`);} } },
  { slug:'theme-random', name: 'Random Theme', desc: 'Apply a random theme', handler: ()=>{ const keys=Object.keys(THEME_PRESETS); const pick=keys[Math.floor(Math.random()*keys.length)]; applyTheme(pick); setConfigValue('theme',pick); requestRender(true);} },
  { slug:'wrap-indent-auto', name: 'Toggle Wrap Indent Auto', desc: 'Set wrap indent to 0 or 2', handler: ()=>{ config.wrapIndent = config.wrapIndent ? 0 : 2; setConfigValue('wrapIndent',config.wrapIndent);} },
  { slug:'toggle-hint-panel', name: 'Toggle Hint Panel', desc: 'Brief status message toggle', handler: ()=>{ config.showCommandHelpPanel=!config.showCommandHelpPanel; setConfigValue('showCommandHelpPanel',config.showCommandHelpPanel);} }
];

// Helper to apply a preset patch cleanly.
function applyPresetPatch(patch){
  if(!patch) return;
  if(patch.theme){
    applyTheme(patch.theme);
    setConfigValue('theme', patch.theme);
  }
  if(patch.layout){
    applyLayout(patch.layout);
    scheduleSave();
  }
  const boolKeys = ['showHints','showHeader','showLogo','showStatusBar','showStatusLine','showModelLine','showWrap','followLog','perfMode','zoomMode','enableMouseScroll','enableAnimation','enableFuzzySearch','showCommandHelpPanel','showScrollbar','showTimestamps'];
  boolKeys.forEach(k => {
    if(patch[k] !== undefined){
      config[k] = !!patch[k];
      setConfigValue(k, config[k]);
    }
  });
  if(patch.wrapIndent !== undefined){
    config.wrapIndent = clamp(patch.wrapIndent,0,8);
    setConfigValue('wrapIndent', config.wrapIndent);
  }
  if(patch.historyLimit !== undefined){
    config.historyLimit = clamp(patch.historyLimit, 10, 1000);
    setConfigValue('historyLimit', config.historyLimit);
    trimHistory();
  }
  if(patch.logLimit !== undefined){
    config.logLimit = clamp(patch.logLimit, 20, 2000);
    setConfigValue('logLimit', config.logLimit);
    trimLog();
  }
  if(patch.kbChunkSize !== undefined){
    config.kbChunkSize = clamp(patch.kbChunkSize, 120, 4000);
    setConfigValue('kbChunkSize', config.kbChunkSize);
  }
  if(patch.kbChunkOverlap !== undefined){
    config.kbChunkOverlap = clamp(patch.kbChunkOverlap, 0, 800);
    setConfigValue('kbChunkOverlap', config.kbChunkOverlap);
  }
  if(patch.kbSearchLimit !== undefined){
    config.kbSearchLimit = clamp(patch.kbSearchLimit, 1, 50);
    setConfigValue('kbSearchLimit', config.kbSearchLimit);
  }
  if(patch.promptPosition){
    config.promptPosition = patch.promptPosition;
    setConfigValue('promptPosition', config.promptPosition);
  }
  if(patch.logFilter !== undefined){
    logFilter = patch.logFilter;
    logFilterLc = logFilter.toLowerCase();
    logScroll = 0;
  }
  if(patch.status){
    setStatusBeta(patch.status);
  }
  applyInputMode();
  requestRender(true);
}

const MODE_PRESETS = [
  { slug:'focus',        name:'Focus',        desc:'Compact layout, wrap on, follow on',       patch:{layout:'compact', showHints:false, showStatusBar:false, showWrap:true, followLog:true} },
  { slug:'read',         name:'Reading',      desc:'Full layout, wrap on, status bar on',      patch:{layout:'full', showHints:false, showStatusBar:true, showWrap:true, followLog:false} },
  { slug:'write',        name:'Writing',      desc:'Minimal layout, wrap off, follow off',     patch:{layout:'minimal', showHints:false, showStatusBar:false, showWrap:false, followLog:false} },
  { slug:'debug',        name:'Debug',        desc:'Perf overlay, timestamps, wrap off',       patch:{perfMode:true, showTimestamps:true, showWrap:false, followLog:true} },
  { slug:'demo',         name:'Demo',         desc:'Full layout, logo on, hints on',           patch:{layout:'full', showLogo:true, showHints:true, showStatusBar:true, showStatusLine:true} },
  { slug:'night',        name:'Night',        desc:'Dim UI, wrap on, hints off',               patch:{showHints:false, showStatusBar:false, showWrap:true, followLog:false} },
  { slug:'bright',       name:'Bright',       desc:'High-contrast UI, wrap on',                patch:{showHints:true, showStatusBar:true, showWrap:true} },
  { slug:'perf',         name:'Performance',  desc:'Perf overlay, animations off',             patch:{perfMode:true, enableAnimation:false, showHints:false, showStatusBar:true} },
  { slug:'kb',           name:'Knowledge',    desc:'RAG tuned chunk sizes, wrap on',           patch:{kbChunkSize:600, kbChunkOverlap:80, kbSearchLimit:10, showWrap:true, followLog:true} },
  { slug:'history',      name:'History',      desc:'Large history/log limits',                 patch:{historyLimit:400, logLimit:1200, showStatusBar:true} },
  { slug:'minimal',      name:'Minimal',      desc:'Minimal layout, status lines off',         patch:{layout:'minimal', showStatusBar:false, showStatusLine:false, showModelLine:false, showHints:false} },
  { slug:'cinema',       name:'Cinema',       desc:'Logo on, hints on, wide wrap indent',      patch:{showLogo:true, showHints:true, wrapIndent:4, showWrap:true, layout:'full'} },
  { slug:'scroll',       name:'Scroll',       desc:'Follow on, wrap on, scrollbar on',         patch:{followLog:true, showWrap:true, showScrollbar:true} },
  { slug:'static',       name:'Static',       desc:'Follow off, wrap off, scrollbar off',      patch:{followLog:false, showWrap:false, showScrollbar:false} },
  { slug:'status-lite',  name:'Status Lite',  desc:'Status bar off, status line on',           patch:{showStatusBar:false, showStatusLine:true, showModelLine:true} },
  { slug:'status-full',  name:'Status Full',  desc:'Status bar + lines on',                    patch:{showStatusBar:true, showStatusLine:true, showModelLine:true} },
  { slug:'hintless',     name:'Hintless',     desc:'Hide hint lines and panels',               patch:{showHints:false, showCommandHelpPanel:false} },
  { slug:'hintful',      name:'Hintful',      desc:'Show hint lines and panels',               patch:{showHints:true, showCommandHelpPanel:true} },
  { slug:'logo-off',     name:'Logo Off',     desc:'Hide logo and shrink header',              patch:{showLogo:false, showHeader:false, showHints:false} },
  { slug:'logo-on',      name:'Logo On',      desc:'Show logo with header',                    patch:{showLogo:true, showHeader:true, showHints:true} },
];

const THEMES_FOR_PRESETS = Object.keys(THEME_PRESETS);

const historyPresetValues = [50,100,150,200,250,300,350,400,450,500,550,600,650,700,750,800,850,900,950,1000];
const logPresetValues = [200,300,400,500,600,700,800,900,1000,1100,1200,1300,1400,1500,1600,1700,1800,1900,2000,2200];
const kbChunkPresetValues = [240,320,420,520,620,720,820,920,1020,1120,1220,1320,1420,1520,1620,1720,1820,1920,2020,2200];
const kbOverlapPresetValues = [0,10,20,30,40,50,60,70,80,90,100,120,140,160,180];
const kbSearchPresetValues = [3,4,5,6,7,8,9,10,12,14,16,18,20,22,24,26,28,30,35,40];
const wrapIndentPresetValues = [0,1,2,3,4,5,6,7,8,10,12,14];

const togglePairs = [
  {on:'enable-zoom', off:'disable-zoom', key:'zoomMode'},
  {on:'enable-mouse-scroll', off:'disable-mouse-scroll', key:'enableMouseScroll'},
  {on:'enable-statusbar', off:'disable-statusbar', key:'showStatusBar'},
  {on:'enable-statusline', off:'disable-statusline', key:'showStatusLine'},
  {on:'enable-modelline', off:'disable-modelline', key:'showModelLine'},
  {on:'enable-wrap', off:'disable-wrap', key:'showWrap'},
  {on:'enable-scrollbar', off:'disable-scrollbar', key:'showScrollbar'},
  {on:'enable-hints', off:'disable-hints', key:'showHints'},
  {on:'enable-logo', off:'disable-logo', key:'showLogo'},
  {on:'enable-header', off:'disable-header', key:'showHeader'},
  {on:'enable-fuzzy', off:'disable-fuzzy', key:'enableFuzzySearch'},
  {on:'enable-animation', off:'disable-animation', key:'enableAnimation'},
  {on:'enable-perf', off:'disable-perf', key:'perfMode'},
  {on:'enable-follow', off:'disable-follow', key:'followLog'},
  {on:'enable-timestamps', off:'disable-timestamps', key:'showTimestamps'},
  {on:'enable-hintpanel', off:'disable-hintpanel', key:'showCommandHelpPanel'}
];

let EXTRA_ACTIONS = [...BASE_QUICK_ACTIONS];

// --- Dynamic settings & quick actions ---
const dynamicSettings = [];
function addPresetSetting(slug, name, desc, patch){
  if(dynamicSettings.length >= 260) return;
  dynamicSettings.push({
    key: `preset_${slug}`,
    label: `Preset · ${name}`,
    type: 'enum',
    options: ['off','apply'],
    default: 'off',
    apply: (val) => {
      if(val === 'apply'){
        applyPresetPatch(patch);
        setConfigValue(`preset_${slug}`, 'off'); // reset after apply
        setStatusBeta(`${name} applied`);
      }else{
        setConfigValue(`preset_${slug}`, 'off');
      }
    }
  });
}

// Mode + theme combinations
MODE_PRESETS.forEach(mode => {
  THEMES_FOR_PRESETS.forEach(theme => {
    const slug = `mode-${mode.slug}-${theme}`;
    addPresetSetting(slug, `${mode.name} · ${theme}`, `${mode.desc} with ${theme} theme`, { ...mode.patch, theme });
    EXTRA_ACTIONS.push({
      slug,
      name: `Mode ${mode.name} (${theme})`,
      desc: `${mode.desc} with ${theme} theme`,
      handler: ()=>applyPresetPatch({ ...mode.patch, theme })
    });
    [0,2,4].forEach(wrapIndentVal => {
      const wrapSlug = `mode-${mode.slug}-${theme}-w${wrapIndentVal}`;
      addPresetSetting(wrapSlug, `${mode.name} · ${theme} · wrap ${wrapIndentVal}`, `${mode.desc}, wrap indent ${wrapIndentVal}`, { ...mode.patch, theme, wrapIndent: wrapIndentVal });
      EXTRA_ACTIONS.push({
        slug: wrapSlug,
        name: `${mode.name} (${theme}) wrap ${wrapIndentVal}`,
        desc: `${mode.desc}, wrap indent ${wrapIndentVal}`,
        handler: ()=>applyPresetPatch({ ...mode.patch, theme, wrapIndent: wrapIndentVal })
      });
    });
  });
});

historyPresetValues.forEach(val => {
  const slug = `history-${val}`;
  addPresetSetting(slug, `History ${val}`, `Set history limit to ${val}`, { historyLimit: val, status:`History limit set to ${val}` });
  EXTRA_ACTIONS.push({
    slug,
    name:`History ${val}`,
    desc:`Set history limit to ${val}`,
    handler: ()=>applyPresetPatch({ historyLimit: val, status:`History limit set to ${val}` })
  });
});

logPresetValues.forEach(val => {
  const slug = `log-${val}`;
  addPresetSetting(slug, `Log ${val}`, `Set log limit to ${val}`, { logLimit: val, status:`Log limit set to ${val}` });
  EXTRA_ACTIONS.push({
    slug,
    name:`Log ${val}`,
    desc:`Set log limit to ${val}`,
    handler: ()=>applyPresetPatch({ logLimit: val, status:`Log limit set to ${val}` })
  });
});

kbChunkPresetValues.forEach(val => {
  const slug = `kb-chunk-${val}`;
  addPresetSetting(slug, `KB Chunk ${val}`, `Set KB chunk size to ${val}`, { kbChunkSize: val, status:`KB chunk size ${val}` });
  EXTRA_ACTIONS.push({
    slug,
    name:`KB Chunk ${val}`,
    desc:`Set KB chunk size to ${val}`,
    handler: ()=>applyPresetPatch({ kbChunkSize: val, status:`KB chunk size ${val}` })
  });
});

kbOverlapPresetValues.forEach(val => {
  const slug = `kb-overlap-${val}`;
  addPresetSetting(slug, `KB Overlap ${val}`, `Set KB chunk overlap to ${val}`, { kbChunkOverlap: val, status:`KB overlap ${val}` });
  EXTRA_ACTIONS.push({
    slug,
    name:`KB Overlap ${val}`,
    desc:`Set KB chunk overlap to ${val}`,
    handler: ()=>applyPresetPatch({ kbChunkOverlap: val, status:`KB overlap ${val}` })
  });
});

kbSearchPresetValues.forEach(val => {
  const slug = `kb-search-${val}`;
  addPresetSetting(slug, `KB Search ${val}`, `Set KB search limit to ${val}`, { kbSearchLimit: val, status:`KB search limit ${val}` });
  EXTRA_ACTIONS.push({
    slug,
    name:`KB Search ${val}`,
    desc:`Set KB search limit to ${val}`,
    handler: ()=>applyPresetPatch({ kbSearchLimit: val, status:`KB search limit ${val}` })
  });
});

wrapIndentPresetValues.forEach(val => {
  const slug = `wrap-indent-${val}`;
  addPresetSetting(slug, `Wrap Indent ${val}`, `Set wrap indent to ${val}`, { wrapIndent: val, status:`Wrap indent ${val}` });
  EXTRA_ACTIONS.push({
    slug,
    name:`Wrap Indent ${val}`,
    desc:`Set wrap indent to ${val}`,
    handler: ()=>applyPresetPatch({ wrapIndent: val, status:`Wrap indent ${val}` })
  });
});

togglePairs.forEach(pair => {
  addPresetSetting(pair.on, pair.on.replace(/-/g,' '), `Turn ${pair.key} on`, { [pair.key]: true, status:`${pair.key} enabled` });
  addPresetSetting(pair.off, pair.off.replace(/-/g,' '), `Turn ${pair.key} off`, { [pair.key]: false, status:`${pair.key} disabled` });
  EXTRA_ACTIONS.push({
    slug: pair.on,
    name: pair.on.replace(/-/g,' '),
    desc: `Turn ${pair.key} on`,
    handler: ()=>applyPresetPatch({ [pair.key]: true, status:`${pair.key} enabled` })
  });
  EXTRA_ACTIONS.push({
    slug: pair.off,
    name: pair.off.replace(/-/g,' '),
    desc: `Turn ${pair.key} off`,
    handler: ()=>applyPresetPatch({ [pair.key]: false, status:`${pair.key} disabled` })
  });
});

// Log filter presets
['error','warn','info','debug','todo','note','kb','tip','success','fail','render','model','layout','theme','save','load','zoom','mouse','wrap','perf','kb-add','kb-search','history','log'].forEach(term => {
  const slug = `filter-${term}`;
  addPresetSetting(slug, `Filter ${term}`, `Show only log lines containing "${term}"`, { logFilter: term, status:`Filter set: ${term}` });
});

// Zoom/prompt placement presets
const promptPositions = ['bottom','top','middle'];
promptPositions.forEach(pos => {
  const slug = `prompt-${pos}`;
  addPresetSetting(slug, `Prompt ${pos}`, `Place prompt at ${pos}`, { promptPosition: pos, status:`Prompt at ${pos}` });
});

// Define base settings schema
const BASE_SETTINGS = [
  { key: 'theme', label: 'Theme', type: 'enum', options: Object.keys(THEME_PRESETS), apply: (val) => { applyTheme(val); setConfigValue('theme', themeName); } },
  { key: 'layout', label: 'Layout', type: 'enum', options: ['full','compact','minimal'], apply: (val)=>{ if(applyLayout(val)) scheduleSave(); } },
  { key: 'showHeader', label: 'Show Header', type: 'bool' },
  { key: 'showLogo', label: 'Show Logo', type: 'bool' },
  { key: 'showHints', label: 'Show Hints', type: 'bool' },
  { key: 'showModelLine', label: 'Show Model Line', type: 'bool' },
  { key: 'showStatusLine', label: 'Show Status Line', type: 'bool' },
  { key: 'showStatusBar', label: 'Show Status Bar', type: 'bool' },
  { key: 'showScrollbar', label: 'Show Scrollbar', type: 'bool' },
  { key: 'showWrap', label: 'Wrap Log Lines', type: 'bool' },
  { key: 'wrapIndent', label: 'Wrap Indent', type: 'number', min: 0, max: 8, step: 1 },
  { key: 'followLog', label: 'Follow Log', type: 'bool' },
  { key: 'enableAnimation', label: 'Enable Animation', type: 'bool' },
  { key: 'enableMouseScroll', label: 'Mouse Scroll', type: 'bool' },
  { key: 'enableCtrlZoomPassthrough', label: 'Ctrl Zoom Passthrough', type: 'bool' },
  { key: 'enableFuzzySearch', label: 'Fuzzy Search', type: 'bool' },
  { key: 'showCommandHelpPanel', label: 'Command Help Panel', type: 'bool' },
  { key: 'showTimestamps', label: 'Show Timestamps', type: 'bool' },
  { key: 'historyLimit', label: 'History Limit', type: 'number', min: 10, max: 1000, step: 10 },
  { key: 'logLimit', label: 'Log Limit', type: 'number', min: 20, max: 2000, step: 20 },
  { key: 'kbChunkSize', label: 'KB Chunk Size', type: 'number', min: 120, max: 4000, step: 20 },
  { key: 'kbChunkOverlap', label: 'KB Chunk Overlap', type: 'number', min: 0, max: 800, step: 10 },
  { key: 'kbMaxChunksPerDoc', label: 'KB Max Chunks/Doc', type: 'number', min: 5, max: 2000, step: 5 },
  { key: 'perfMode', label: 'Perf Overlay', type: 'bool' },
  { key: 'zoomMode', label: 'Zoom Mode', type: 'bool' },
  { key: 'userLabel', label: 'User Label', type: 'text' },
  { key: 'botLabel', label: 'Bot Label', type: 'text' },
  // Appearance extras
  { key: 'settingsColorHeader', label: 'Settings Header Color', type: 'text' },
  { key: 'settingsColorBody', label: 'Settings Body Color', type: 'text' },
  { key: 'settingsColorHint', label: 'Settings Hint Color', type: 'text' },
  { key: 'settingsMaxItems', label: 'Settings Max Items', type: 'number', min: 5, max: 200, step: 5 },
  // Behavior extras
  { key: 'confirmDangerous', label: 'Confirm Dangerous Actions', type: 'bool' },
  { key: 'autoSaveMs', label: 'Auto-save Interval (ms)', type: 'number', min: 100, max: 5000, step: 100 },
  { key: 'showAliasInHelp', label: 'Show Aliases in Help', type: 'bool' },
  { key: 'defaultHistoryQuery', label: 'Default History Query', type: 'text' },
  // Logging extras
  { key: 'logTimestampFormat', label: 'Log Time Format', type: 'text' },
  { key: 'logFilterPersist', label: 'Persist Log Filter', type: 'bool' },
  { key: 'logMaxWrapWidth', label: 'Max Wrap Width', type: 'number', min: 20, max: 400, step: 10 },
  // RAG extras
  { key: 'kbDefaultExts', label: 'KB Default Exts', type: 'text' },
  { key: 'kbSearchLimit', label: 'KB Search Limit', type: 'number', min: 1, max: 50, step: 1 },
  { key: 'kbShowSources', label: 'KB Show Sources', type: 'bool' },
  // Keyboard extras
  { key: 'keyRepeatDelay', label: 'Key Repeat Delay', type: 'number', min: 50, max: 1000, step: 50 },
  { key: 'keyRepeatRate', label: 'Key Repeat Rate', type: 'number', min: 1, max: 60, step: 1 }
];

// Compose final schema and defaults
SETTINGS_SCHEMA = BASE_SETTINGS.concat(dynamicSettings.slice(0,260));

function ensureSettingDefaults(cfg){
  SETTINGS_SCHEMA.forEach(item => {
    if(cfg[item.key] === undefined){
      if(item.type === 'bool') cfg[item.key] = item.default ?? false;
      else if(item.type === 'number') cfg[item.key] = item.default ?? (item.min ?? 0);
      else if(item.type === 'enum') cfg[item.key] = item.default ?? (item.options ? item.options[0] : '');
      else cfg[item.key] = item.default ?? '';
    }
  });
  cfg.extraDefaultsApplied = true;
}

// cap to 255 actions for palette density
EXTRA_ACTIONS = EXTRA_ACTIONS.slice(0,255);

const extraActionBySlug = Object.fromEntries(EXTRA_ACTIONS.map(a => [a.slug, a]));
const extraActionLegacy = {};
EXTRA_ACTIONS.forEach((action, idx) => {
  const legacy = `x${String(idx + 1).padStart(3,'0')}`;
  extraActionLegacy[legacy] = action;
});

EXTRA_ACTIONS.forEach(action => {
  commands.push({
    label: `/${action.slug}`,
    desc: action.desc,
    usage: `/${action.slug}`,
    example: `/${action.slug}`,
    detail: `Quick action · ${action.name}`,
    category: 'Quick'
  });
});
const commandLookup = Object.fromEntries(commands.map(cmd => [cmd.label, cmd]));
const COMMAND_LABEL_WIDTH = Math.max(10, ...commands.map(cmd => cmd.label.length)) + 1;

function runExtraCommand(cmd){
  const key = cmd.startsWith('x') && cmd.length === 4 ? cmd : cmd;
  const action = extraActionBySlug[key] || extraActionLegacy[key];
  if(!action){
    addLogLine(`No quick action bound to ${cmd}.`);
    return;
  }
  action.handler();
  setStatusBeta(`Quick action: ${action.name}`);
}

const KEYBINDINGS = [
  { keys: 'Ctrl+L', desc: 'Clear log output' },
  { keys: 'Ctrl+K', desc: 'Clear input line' },
  { keys: 'Ctrl+U', desc: 'Delete to line start' },
  { keys: 'Ctrl+W', desc: 'Delete previous word' },
  { keys: 'Ctrl+R', desc: 'Open history search' },
  { keys: 'Ctrl+C', desc: 'Exit the CLI' },
  { keys: 'Esc', desc: 'Close menus / exit' },
  { keys: '/', desc: 'Open command palette' },
  { keys: 'Tab', desc: 'Autocomplete slash command' },
  { keys: 'Ctrl++ / Ctrl+-', desc: 'Terminal zoom (enable /zoom for passthrough)' },
  { keys: 'Alt+PgUp/PgDn', desc: 'Page scroll log' },
  { keys: 'PgUp/PgDn', desc: 'Scroll prompt log' }
];

let config = loadConfig();
ensureSettingDefaults(config);
let models = normalizeModels(config.models);
if(config.layout && config.layout !== 'custom'){
  applyLayout(config.layout);
}

const historyData = loadHistory();
const kbData = loadKB();

let showCommandMenu = false;
let showModelMenu = false;
let showHistoryMenu = false;
let showSettingsMenu = false;
let selectedCommand = 0;
let activeModel = models[Math.max(0, Math.min(models.length - 1, config.modelIndex || 0))] || models[0];
let selectedModel = Math.max(0, models.indexOf(activeModel));
let statusMessage = 'Press / to open the command menu.';
const betaMessage = 'still in Beta, will come out soon! :)';
let inputBuffer = '';
let inputCursor = 0;
let history = historyData.history || [];
let historyIndex = -1;
let logLines = historyData.logLines || [];
let logScroll = 0;
let logViewportHeight = 0;
let promptRowCache = 0;
let promptCaretCol = 0;
let mouseTracking = false;
let mouseReenableTimer = null;
let rawModeEnabled = true;
let lastCommandQuery = '';
let lastHistoryQuery = '';
let popupAnimProgress = 1;
let popupAnimTimer = null;
let animationJustRendered = false;
let popupWidthCache = 0;
let selectedHistory = 0;
let savedInput = null;
let saveTimer = null;
let kbSaveTimer = null;
let kb = { docs: kbData.docs || [], chunks: kbData.chunks || [] };
let kbChunkCache = new Map();
let lastSources = [];
let renderPending = false;
let renderTimer = null;
let lastRenderAt = 0;
let lastWheelAt = 0;
let lastWheelScroll = 0;
let lastResizeAt = 0;
let initialRenderDone = false;
let logVirtualLinesLength = 0;
let logFilter = '';
let logFilterLc = '';
let resolvedAliasCache = {};
let lastRenderMs = 0;
let settingsFilter = '';
let selectedSetting = 0;
const stats = {
  startTime: Date.now(),
  commands: 0,
  prompts: 0,
  keystrokes: 0,
  kbAdds: 0,
  kbQueries: 0
};

trimHistory();
trimLog();

function listSettings(filter){
  const term = (filter || '').toLowerCase();
  return SETTINGS_SCHEMA.filter(item => {
    if(!term) return true;
    return item.key.toLowerCase().includes(term) || (item.label && item.label.toLowerCase().includes(term));
  });
}

function applySetting(item, direction){
  if(!item) return;
  const key = item.key;
  const currentVal = config[key];
  if(item.type === 'bool'){
    config[key] = !currentVal;
    setConfigValue(key, config[key]);
    if(key === 'enableMouseScroll') setMouseTracking(!!config.enableMouseScroll && !config.zoomMode);
    if(key === 'enableAnimation') popupAnimProgress = 1;
    if(['showHeader','showLogo','showHints','showModelLine','showStatusLine'].includes(key)) markLayoutCustom();
    if(item.apply) item.apply(config[key]);
    return;
  }
  if(item.type === 'enum'){
    const options = item.options || [];
    const idx = options.indexOf(config[key]);
    const next = options[(idx + (direction||1) + options.length) % options.length];
    if(item.apply){
      item.apply(next);
    }else{
      config[key] = next;
      setConfigValue(key, config[key]);
    }
    return;
  }
  if(item.type === 'number'){
    const step = item.step || 1;
    const min = item.min ?? -Infinity;
    const max = item.max ?? Infinity;
    const next = clamp(Number(config[key] || 0) + step * (direction||1), min, max);
    config[key] = next;
    setConfigValue(key, next);
    if(item.apply) item.apply(config[key]);
    return;
  }
  if(item.type === 'text'){
    if(item.apply) item.apply(config[key]);
    return;
  }
}
function clamp(num, min, max){
  return Math.max(min, Math.min(max, num));
}

function trimHistory(){
  const limit = clamp(Number(config.historyLimit || DEFAULT_CONFIG.historyLimit), 10, 1000);
  if(history.length > limit){
    history = history.slice(history.length - limit);
  }
}

function trimLog(){
  const limit = clamp(Number(config.logLimit || DEFAULT_CONFIG.logLimit), 20, 2000);
  if(logLines.length > limit){
    logLines = logLines.slice(logLines.length - limit);
  }
}

function saveConfig(){
  config.models = models.slice();
  config.modelIndex = clamp(models.indexOf(activeModel), 0, models.length - 1);
  config.theme = themeName;
  config.bookmarks = normalizeBookmarks(config.bookmarks || []);
  config.layout = config.layout || 'full';
  config.userLabel = String(config.userLabel || DEFAULT_LABELS.user);
  config.botLabel = String(config.botLabel || DEFAULT_LABELS.bot);
  config.zoomMode = !!config.zoomMode;
  config.followLog = !!config.followLog;
  config.aliases = config.aliases || {};
  config.perfMode = !!config.perfMode;
  config.showWrap = !!config.showWrap;
  config.wrapIndent = clamp(Number(config.wrapIndent || DEFAULT_CONFIG.wrapIndent), 0, 8);
  config.settingsColorHeader = config.settingsColorHeader || '';
  config.settingsColorBody = config.settingsColorBody || '';
  config.settingsColorHint = config.settingsColorHint || '';
  config.settingsMaxItems = clamp(Number(config.settingsMaxItems || 100), 5, 200);
  config.confirmDangerous = !!config.confirmDangerous;
  config.autoSaveMs = clamp(Number(config.autoSaveMs || 200), 50, 5000);
  config.showAliasInHelp = !!config.showAliasInHelp;
  config.defaultHistoryQuery = config.defaultHistoryQuery || '';
  config.logTimestampFormat = config.logTimestampFormat || '';
  config.logFilterPersist = !!config.logFilterPersist;
  config.logMaxWrapWidth = clamp(Number(config.logMaxWrapWidth || 200), 20, 400);
  config.kbDefaultExts = config.kbDefaultExts || DEFAULT_KB_EXTS.join(',');
  config.kbSearchLimit = clamp(Number(config.kbSearchLimit || 5), 1, 50);
  config.kbShowSources = !!config.kbShowSources;
  config.keyRepeatDelay = clamp(Number(config.keyRepeatDelay || 200), 50, 1000);
  config.keyRepeatRate = clamp(Number(config.keyRepeatRate || 30), 1, 60);
  ensureSettingDefaults(config);
  return safeWriteJson(CONFIG_PATH, config);
}

function saveHistory(){
  trimHistory();
  trimLog();
  return safeWriteJson(HISTORY_PATH, { history, logLines });
}

function scheduleSave(){
  if(saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveConfig();
    saveHistory();
  }, 200);
}

function saveKB(){
  return safeWriteJson(KB_PATH, kb);
}

function scheduleKBSave(){
  if(kbSaveTimer) clearTimeout(kbSaveTimer);
  kbSaveTimer = setTimeout(() => {
    kbSaveTimer = null;
    saveKB();
  }, 200);
}

function resetKBCache(){
  kbChunkCache.clear();
}

function setConfigValue(key, value){
  config[key] = value;
  scheduleSave();
}

function resolveAlias(cmd){
  if(!cmd) return cmd;
  const cached = resolvedAliasCache[cmd];
  if(cached) return cached;
  const val = (config.aliases && config.aliases[cmd]) ? config.aliases[cmd] : cmd;
  resolvedAliasCache[cmd] = val;
  return val;
}

function markLayoutCustom(){
  if(config.layout !== 'custom'){
    config.layout = 'custom';
    scheduleSave();
  }
}

function applyLayout(mode){
  const normalized = String(mode || '').toLowerCase();
  if(!['full','compact','minimal'].includes(normalized)) return false;
  config.layout = normalized;
  if(normalized === 'full'){
    config.showHeader = true;
    config.showLogo = true;
    config.showHints = true;
    config.showModelLine = true;
    config.showStatusLine = true;
  }else if(normalized === 'compact'){
    config.showHeader = true;
    config.showLogo = false;
    config.showHints = false;
    config.showModelLine = true;
    config.showStatusLine = true;
  }else{
    config.showHeader = false;
  }
  return true;
}

function parseConfigValue(value){
  const raw = String(value ?? '').trim();
  if(raw === '') return '';
  if(raw.toLowerCase() === 'true') return true;
  if(raw.toLowerCase() === 'false') return false;
  if(raw.toLowerCase() === 'null') return null;
  if(!Number.isNaN(Number(raw)) && raw !== '') return Number(raw);
  return raw;
}

// ensureSettingDefaults defined later once SETTINGS_SCHEMA is built

const ESC = '\x1b';
const RST = `${ESC}[0m`;
function rgb(r,g,b){ return `${ESC}[38;2;${r};${g};${b}m`; }
function bgRgb(r,g,b){ return `${ESC}[48;2;${r};${g};${b}m`; }

let BG  = bgRgb(10,5,18);
let POP_BG = bgRgb(24,16,38);
let POP_HDR_BG = bgRgb(30,22,46);
let POP_SEL_BG = bgRgb(58,50,92);
let SHADOW_BG = bgRgb(6,4,10);
let themeName = config.theme;
let theme = THEME_PRESETS[themeName] || THEME_PRESETS.nebula;

function applyTheme(name){
  const preset = THEME_PRESETS[name] || THEME_PRESETS.nebula;
  themeName = THEME_PRESETS[name] ? name : 'nebula';
  theme = preset;
  BG = bgRgb(...preset.bg);
  POP_BG = bgRgb(...preset.popupBg);
  POP_HDR_BG = bgRgb(...preset.popupHdrBg);
  POP_SEL_BG = bgRgb(...preset.popupSelBg);
  SHADOW_BG = bgRgb(...preset.shadowBg);
}

applyTheme(themeName);

function applyInputMode(){
  try{
    process.stdin.setRawMode(!config.zoomMode);
    rawModeEnabled = !config.zoomMode;
  }catch(e){
    rawModeEnabled = !config.zoomMode;
  }
  setMouseTracking(!config.zoomMode && !!config.enableMouseScroll);
}

// Move cursor to absolute row,col (1-based) then write a full-width padded line
function writeLine(row, text, col, w){
  const padded = (text||'').padEnd(w);
  return `${ESC}[${row};1H${BG}${col||''}${padded}${RST}`;
}

// Write a block of text at a specific column with custom background (used for popups)
function writeAt(row, col, text, fg, bg, w){
  const padded = (text||'').padEnd(w);
  return `${ESC}[${row};${col}H${bg||''}${fg||''}${padded}${RST}`;
}

process.stdout.write(ESC+'[?1049h'); // alt screen
process.stdout.write(ESC+'[?7l');    // no wrap
process.stdout.write(ESC+'[2J');     // clear
process.stdout.write(ESC+'[?25l');   // hide cursor
applyInputMode(); // mouse tracking + raw mode

function render(fullClear){
  const w = process.stdout.columns || 120;
  const h = process.stdout.rows    || 30;
  const dash  = '\u2500';
  const check = '\u2714';
  const maxPopupLines = Math.max(6, h - 4);

  let out = '';

  // Write EVERY row explicitly by absolute position — zero ambiguity
  let r = 1;

  // Fill ALL rows with bg first so borders are covered (only when asked)
  if(fullClear){
    for(let i = 1; i <= h; i++){
      out += `${ESC}[${i};1H${BG}${' '.repeat(w)}${RST}`;
    }
  }

  // Now write content at exact rows
  r = config.showHeader ? 2 : 1;
  if(config.showHeader){
    out += writeLine(r++, '', null, w);
    out += writeLine(r++, '', null, w);
    if(config.showLogo){
      for(let i=0;i<rows.length;i++){
        const [pr,pg,pb]=purples[i];
        out += writeLine(r++, rows[i], rgb(pr,pg,pb), w);
      }
      out += writeLine(r++, '', null, w);
    }
    out += writeLine(r++, `     ${check}  ${APP_NAME}  \u00b7  v${APP_VERSION}`, rgb(...theme.brand), w);
    out += writeLine(r++, '', null, w);
    out += writeLine(r++, '  '+dash.repeat(Math.min(72,w-4)), rgb(...theme.separator), w);
    out += writeLine(r++, '', null, w);
    if(config.showHints){
      out += writeLine(r++, '  Press Esc to escape. Type /help to see all commands or hit /. /zoom for Ctrl/Cmd+Scroll or Ctrl++/Ctrl+- zoom.', rgb(...theme.hint), w);
      out += writeLine(r++, '  Ctrl++ / Ctrl+- also zoom when zoom mode is on.', rgb(...theme.hint), w);
      out += writeLine(r++, '', null, w);
    }
    if(config.showModelLine){
      out += writeLine(r++, `  Current Model: ${activeModel}`, rgb(...theme.header), w);
      out += writeLine(r++, '', null, w);
    }
    if(config.showStatusLine){
      out += writeLine(r++, `  ${statusMessage}`, rgb(...theme.status), w);
      out += writeLine(r++, '', null, w);
    }
  }

  // Determine prompt placement
  const contentTop = r;
  let promptRow = h;
  let statusRow = config.showStatusBar ? Math.max(contentTop, promptRow - 1) : promptRow;
  if(config.promptPosition === 'top'){
    promptRow = contentTop;
    statusRow = config.showStatusBar ? promptRow + 1 : promptRow;
  }else if(config.promptPosition === 'middle'){
    promptRow = Math.max(contentTop + 1, Math.floor((contentTop + h) / 2));
    statusRow = config.showStatusBar ? Math.max(contentTop, promptRow - 1) : promptRow;
  }
  promptRowCache = promptRow;

  // Log window depending on prompt placement
  let logStart = contentTop;
  let logHeight = 0;
  if(config.promptPosition === 'top'){
    logStart = statusRow + 1;
    logHeight = Math.max(0, h - logStart);
  }else if(config.promptPosition === 'middle'){
    logStart = contentTop;
    const logEnd = Math.max(contentTop, (config.showStatusBar ? statusRow - 1 : promptRow - 1));
    logHeight = Math.max(0, logEnd - logStart + 1);
  }else{ // bottom
    logStart = contentTop;
    logHeight = Math.max(0, statusRow - logStart);
  }
  logViewportHeight = logHeight;
  const effectiveLogLines = logFilterLc ? logLines.filter(line => line.toLowerCase().includes(logFilterLc)) : logLines;
  const renderedLog = buildWrappedLogLines(effectiveLogLines, Math.max(4, w - 2));
  logVirtualLinesLength = renderedLog.length;
  const maxScroll = Math.max(0, logVirtualLinesLength - logHeight);
  logScroll = Math.max(0, Math.min(logScroll, maxScroll));
  const startIndex = Math.max(0, logVirtualLinesLength - logHeight - logScroll);

  for(let i = 0; i < logHeight; i++){
    const line = renderedLog[startIndex + i] || '';
    out += writeLine(r++, line, rgb(...theme.info), w);
  }

  if(config.showStatusBar){
    const barText = buildStatusBar(w);
    out += writeAt(statusRow, 1, barText, rgb(...theme.header), POP_HDR_BG, w);
  }

  if(config.showScrollbar && logLines.length > logHeight && logHeight > 1){
    const trackCol = w;
    const handleSize = Math.max(1, Math.floor((logHeight * logHeight) / logLines.length));
    const maxScroll = Math.max(1, logLines.length - logHeight);
    const handlePos = Math.floor((logScroll / maxScroll) * Math.max(0, logHeight - handleSize));
    for(let i = 0; i < logHeight; i++){
      const char = (i >= handlePos && i < handlePos + handleSize) ? '|' : '.';
      out += writeAt(logStart + i, trackCol, char, rgb(...theme.hint), BG, 1);
    }
  }

  // Prompt line -- bottom of the screen
  const promptLabel = `  > ${config.userLabel}: `;
  const maxInputWidth = Math.max(0, w - promptLabel.length);
  const safeCursor = Math.max(0, Math.min(inputCursor, inputBuffer.length));
  const inputStart = Math.max(0, safeCursor - maxInputWidth);
  const cursorCol = Math.min(w, promptLabel.length + (safeCursor - inputStart) + 1);
  promptCaretCol = cursorCol;
  const visibleInput = inputBuffer.slice(inputStart, inputStart + maxInputWidth);
  const showPlaceholder = visibleInput.length === 0 && !showCommandMenu && !showModelMenu && !showHistoryMenu;
  const placeholder = showPlaceholder ? 'Type a message or /help...' : '';
  const displayText = (visibleInput || placeholder).slice(0, maxInputWidth);
  const promptLine = `${promptLabel}${displayText}`;
  const fill = Math.max(0, w - promptLine.length);
  const labelFg = `${ESC}[1m${rgb(...theme.promptLabel)}`;
  const inputFg = visibleInput.length > 0 ? rgb(...theme.promptText) : `${ESC}[2m${rgb(...theme.hint)}`;
  out += `${ESC}[${promptRow};1H${BG}${labelFg}${promptLabel}${RST}${BG}${inputFg}${displayText}${RST}${BG}${' '.repeat(fill)}${RST}`;
  const popupLines = [];
  const headerFg = `${ESC}[1m${rgb(...theme.header)}`;
  const bodyFg = rgb(...theme.info);
  const hintFg = `${ESC}[2m${rgb(...theme.hint)}`;
  const selFg = `${ESC}[1m${rgb(255,255,255)}`;
  const addPopupLine = (text, fg, bg) => {
    popupLines.push({ text: text || '', fg: fg || bodyFg, bg: bg || POP_BG });
  };

  if(showCommandMenu){
    const filter = getCommandFilter();
    const title = filter.query.length > 0 ? `Command Palette (/${filter.query})` : 'Command Palette';
    const headerLines = [
      { text: ` ${title}`, fg: headerFg, bg: POP_HDR_BG },
      { text: '  Type to filter, Tab to autocomplete', fg: hintFg, bg: POP_HDR_BG },
      { text: `  Matches: ${filter.indices.length}`, fg: hintFg, bg: POP_HDR_BG },
      { text: '{divider}', fg: hintFg, bg: POP_BG }
    ];
    const footerLines = [
      { text: '', fg: bodyFg, bg: POP_BG },
      { text: '  Enter to select, Esc to close', fg: hintFg, bg: POP_BG }
    ];
    const maxBodyLines = Math.max(1, maxPopupLines - headerLines.length - footerLines.length);
    const menuItems = [];
    if(filter.indices.length === 0){
      menuItems.push({ text: '  No matches', fg: hintFg, bg: POP_BG, commandIndex: -1 });
    }else{
      let lastCategory = null;
      filter.indices.forEach((cmdIndex, idx) => {
        const cmd = commands[cmdIndex];
        if(filter.query.length === 0 && cmd.category && cmd.category !== lastCategory){
          menuItems.push({ text: ` ${cmd.category}`, fg: headerFg, bg: POP_BG, commandIndex: -1 });
          lastCategory = cmd.category;
        }
        const isSelected = idx === selectedCommand;
        const marker = isSelected ? '>' : ' ';
        const line = `${marker} ${cmd.label.padEnd(COMMAND_LABEL_WIDTH)} ${cmd.desc}`;
        menuItems.push({ text: line, fg: isSelected ? selFg : bodyFg, bg: isSelected ? POP_SEL_BG : POP_BG, commandIndex: idx });
      });
    }
    const selectedItemIndex = menuItems.findIndex(item => item.commandIndex === selectedCommand);
    const menuStart = menuItems.length > maxBodyLines
      ? clamp(selectedItemIndex - Math.floor(maxBodyLines / 2), 0, menuItems.length - maxBodyLines)
      : 0;
    const visibleItems = menuItems.slice(menuStart, menuStart + maxBodyLines);
    headerLines.forEach(line => addPopupLine(line.text, line.fg, line.bg));
    visibleItems.forEach(line => addPopupLine(line.text, line.fg, line.bg));
    footerLines.forEach(line => addPopupLine(line.text, line.fg, line.bg));
  }

  if(showModelMenu){
    const headerLines = [
      { text: ' Model Selector', fg: headerFg, bg: POP_HDR_BG },
      { text: '  Pick a build and press Enter', fg: hintFg, bg: POP_HDR_BG },
      { text: '{divider}', fg: hintFg, bg: POP_BG }
    ];
    const footerLines = [
      { text: '', fg: bodyFg, bg: POP_BG },
      { text: '  Enter to confirm, Esc to close', fg: hintFg, bg: POP_BG }
    ];
    const maxBodyLines = Math.max(1, maxPopupLines - headerLines.length - footerLines.length);
    const menuItems = models.map((model, idx) => {
      const isSelected = idx === selectedModel;
      const marker = isSelected ? '>' : ' ';
      const line = `${marker} ${model}`;
      return { text: line, fg: isSelected ? selFg : bodyFg, bg: isSelected ? POP_SEL_BG : POP_BG, modelIndex: idx };
    });
    const menuStart = menuItems.length > maxBodyLines
      ? clamp(selectedModel - Math.floor(maxBodyLines / 2), 0, menuItems.length - maxBodyLines)
      : 0;
    const visibleItems = menuItems.slice(menuStart, menuStart + maxBodyLines);
    headerLines.forEach(line => addPopupLine(line.text, line.fg, line.bg));
    visibleItems.forEach(line => addPopupLine(line.text, line.fg, line.bg));
    footerLines.forEach(line => addPopupLine(line.text, line.fg, line.bg));
  }
  if(showSettingsMenu){
    const settings = getSettingsList();
    const title = settingsFilter ? `Settings (${settingsFilter})` : 'Settings';
    const headerLines = [
      { text: ` ${title}`, fg: headerFg, bg: POP_HDR_BG },
      { text: '  Arrows navigate, Enter toggles/cycles', fg: hintFg, bg: POP_HDR_BG },
      { text: '{divider}', fg: hintFg, bg: POP_BG }
    ];
    const footerLines = [
      { text: '', fg: bodyFg, bg: POP_BG },
      { text: '  Esc to close, /settings <query> to filter', fg: hintFg, bg: POP_BG }
    ];
    const maxBodyLines = Math.max(1, maxPopupLines - headerLines.length - footerLines.length);
    const menuItems = settings.map((item, idx) => {
      const isSelected = idx === selectedSetting;
      const marker = isSelected ? '>' : ' ';
      let val = config[item.key];
      if(val === undefined){
        if(item.type === 'bool') val = false;
        else if(item.type === 'number') val = 0;
        else if(item.type === 'enum') val = (item.options || [])[0] || '';
        else val = '';
      }
      const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return { text: `${marker} ${item.label || item.key}: ${displayVal}`, fg: isSelected ? selFg : bodyFg, bg: isSelected ? POP_SEL_BG : POP_BG, settingIndex: idx };
    });
    const menuStart = menuItems.length > maxBodyLines
      ? clamp(selectedSetting - Math.floor(maxBodyLines / 2), 0, menuItems.length - maxBodyLines)
      : 0;
    const visibleItems = menuItems.slice(menuStart, menuStart + maxBodyLines);
    headerLines.forEach(line => addPopupLine(line.text, line.fg, line.bg));
    visibleItems.forEach(line => addPopupLine(line.text, line.fg, line.bg));
    footerLines.forEach(line => addPopupLine(line.text, line.fg, line.bg));
  }
  if(showHistoryMenu){
    const filter = getHistoryFilter();
    const title = filter.query.length > 0 ? `History (${filter.query})` : 'History';
    const headerLines = [
      { text: ` ${title}`, fg: headerFg, bg: POP_HDR_BG },
      { text: '  Type to filter, Enter to paste', fg: hintFg, bg: POP_HDR_BG },
      { text: `  Matches: ${filter.items.length}`, fg: hintFg, bg: POP_HDR_BG },
      { text: '{divider}', fg: hintFg, bg: POP_BG }
    ];
    const footerLines = [
      { text: '', fg: bodyFg, bg: POP_BG },
      { text: '  Esc to close, Backspace to clear', fg: hintFg, bg: POP_BG }
    ];
    const maxBodyLines = Math.max(1, maxPopupLines - headerLines.length - footerLines.length);
    const menuItems = [];
    if(filter.items.length === 0){
      menuItems.push({ text: '  No history matches', fg: hintFg, bg: POP_BG, historyIndex: -1 });
    }else{
      filter.items.forEach((item, idx) => {
        const isSelected = idx === selectedHistory;
        const marker = isSelected ? '>' : ' ';
        const line = `${marker} ${item}`;
        menuItems.push({ text: line, fg: isSelected ? selFg : bodyFg, bg: isSelected ? POP_SEL_BG : POP_BG, historyIndex: idx });
      });
    }
    const menuStart = menuItems.length > maxBodyLines
      ? clamp(selectedHistory - Math.floor(maxBodyLines / 2), 0, menuItems.length - maxBodyLines)
      : 0;
    const visibleItems = menuItems.slice(menuStart, menuStart + maxBodyLines);
    headerLines.forEach(line => addPopupLine(line.text, line.fg, line.bg));
    visibleItems.forEach(line => addPopupLine(line.text, line.fg, line.bg));
    footerLines.forEach(line => addPopupLine(line.text, line.fg, line.bg));
  }
  if(popupLines.length > 0){
    const visibleCount = Math.max(2, Math.floor(popupLines.length * popupAnimProgress));
    const contentWidth = popupLines.reduce((max, line) => Math.max(max, line.text.length), 0);
    const minPopupWidth = 50;
    const boxWidth = Math.max(minPopupWidth, contentWidth + 2);
    const maxWidth = Math.max(12, w - 4);
    const computedWidth = Math.min(maxWidth, boxWidth);
    if(popupWidthCache === 0){
      popupWidthCache = computedWidth;
    }else{
      popupWidthCache = Math.min(maxWidth, Math.max(popupWidthCache, computedWidth));
    }
    const safeWidth = popupWidthCache;
    const innerWidth = Math.max(10, safeWidth - 2);
    const boxHeight = popupLines.length + 2;
    const boxBottom = Math.max(3, promptRow - 1);
    let boxTop = boxBottom - boxHeight + 1;
    if(boxTop < 2) boxTop = 2;
    const desiredLeft = Math.max(2, promptCaretCol - 2);
    const boxLeft = Math.max(2, Math.min(desiredLeft, w - safeWidth - 1));

    const shadowRightCol = boxLeft + safeWidth;
    const shadowBottomRow = boxTop + boxHeight;
    for(let i = 0; i < boxHeight; i++){
      const row = boxTop + i + 1;
      if(row <= h && shadowRightCol <= w){
        const shadowWidth = Math.min(2, w - shadowRightCol + 1);
        out += writeAt(row, shadowRightCol, ' '.repeat(shadowWidth), null, SHADOW_BG, shadowWidth);
      }
    }
    if(shadowBottomRow <= h){
      const shadowWidth = Math.min(safeWidth, w - boxLeft);
      if(shadowWidth > 0){
        out += writeAt(shadowBottomRow, boxLeft + 1, ' '.repeat(shadowWidth), null, SHADOW_BG, shadowWidth);
      }
    }

    const topBorder = '+' + '='.repeat(innerWidth) + '+';
    const bottomBorder = '+' + '-'.repeat(innerWidth) + '+';
    out += writeAt(boxTop, boxLeft, topBorder, rgb(...theme.header), POP_HDR_BG, safeWidth);
    for(let i = 0; i < popupLines.length; i++){
      const lineObj = popupLines[i];
      const isVisible = i < visibleCount;
      const rawText = isVisible ? (lineObj.text === '{divider}' ? '-'.repeat(innerWidth) : lineObj.text) : '';
      const line = rawText.slice(0, innerWidth).padEnd(innerWidth);
      const fg = isVisible ? (lineObj.fg || rgb(220,230,255)) : rgb(...theme.info);
      const bg = isVisible ? (lineObj.bg || POP_BG) : POP_BG;
      out += writeAt(boxTop + 1 + i, boxLeft, '|' + line + '|', fg, bg, safeWidth);
    }
    out += writeAt(boxTop + boxHeight - 1, boxLeft, bottomBorder, rgb(200,200,255), POP_BG, safeWidth);

    if(showCommandMenu && config.showCommandHelpPanel){
      const filter = getCommandFilter();
      const cmdIndex = filter.indices[Math.min(selectedCommand, filter.indices.length - 1)];
      const cmd = typeof cmdIndex === 'number' ? commands[cmdIndex] : null;
      if(!cmd){
        // no-op when no command is selected
      }else{
      const panelWidth = 38;
      const panelLeft = boxLeft + safeWidth + 2;
      if(panelLeft + panelWidth <= w){
        const infoLines = buildCommandInfoLines(cmd, panelWidth - 2);
        const panelHeight = infoLines.length + 2;
        let panelTop = boxTop;
        if(panelTop + panelHeight - 1 > h){
          panelTop = Math.max(2, h - panelHeight + 1);
        }
        const infoBorder = '+' + '-'.repeat(panelWidth - 2) + '+';
        out += writeAt(panelTop, panelLeft, infoBorder, rgb(...theme.header), POP_BG, panelWidth);
        for(let i = 0; i < infoLines.length; i++){
          const line = infoLines[i].slice(0, panelWidth - 2).padEnd(panelWidth - 2);
          out += writeAt(panelTop + 1 + i, panelLeft, '|' + line + '|', rgb(...theme.info), POP_BG, panelWidth);
        }
        out += writeAt(panelTop + panelHeight - 1, panelLeft, infoBorder, rgb(...theme.header), POP_BG, panelWidth);
      }
      }
    }
  }
  // Write everything
  process.stdout.write(out);

  // Place cursor on the input caret position, show it
  process.stdout.write(`${ESC}[?25h`);
  process.stdout.write(`${ESC}[${promptRow};${promptCaretCol}H`);
}

function performRender(full){
  const start = Date.now();
  render(full);
  lastRenderMs = Date.now() - start;
  lastRenderAt = Date.now();
  initialRenderDone = true;
}

function requestRender(force){
  if(force){
    if(renderTimer) clearTimeout(renderTimer);
    renderTimer = null;
    renderPending = false;
    performRender(true);
    return;
  }
  if(renderPending) return;
  const now = Date.now();
  const wait = Math.max(0, 16 - (now - lastRenderAt));
  renderPending = true;
  renderTimer = setTimeout(() => {
    renderPending = false;
    renderTimer = null;
    performRender(false);
  }, wait);
}

performRender(true);
process.stdout.on('resize', ()=>{
  try{
    lastResizeAt = Date.now();
    if(config.enableCtrlZoomPassthrough && lastResizeAt - lastWheelAt < 200){
      logScroll = lastWheelScroll;
    }
    if(config.enableCtrlZoomPassthrough){
      disableMouseTemporarily(CTRL_ZOOM_PASSTHROUGH_MS);
    }
    requestRender(true);
  }catch(e){}
});

function cleanup(){
  try{
    saveConfig();
    saveHistory();
    saveKB();
    process.stdout.write(ESC+'[?7h');
    process.stdout.write(ESC+'[?25h');
    if(mouseReenableTimer) clearTimeout(mouseReenableTimer);
    setMouseTracking(false);
    try{ process.stdin.setRawMode(false); }catch(e){}
    process.stdout.write(ESC+'[?1049l');
  }catch(e){}
  process.exit(0);
}
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('uncaughtException', cleanup);

function setStatusPlain(msg){
  statusMessage = msg;
}

function setStatusBeta(extra){
  statusMessage = extra ? `${betaMessage} ${extra}` : betaMessage;
}

function setInput(text){
  inputBuffer = text;
  inputCursor = text.length;
}

function pushHistory(text){
  history.push(text);
  historyIndex = history.length;
  trimHistory();
  scheduleSave();
}

function historyPrev(){
  if(history.length === 0) return;
  if(historyIndex === -1){
    historyIndex = history.length - 1;
  }else{
    historyIndex = Math.max(0, historyIndex - 1);
  }
  setInput(history[historyIndex] || '');
}

function historyNext(){
  if(history.length === 0) return;
  if(historyIndex === -1) return;
  historyIndex = Math.min(history.length, historyIndex + 1);
  if(historyIndex === history.length){
    historyIndex = -1;
    setInput('');
  }else{
    setInput(history[historyIndex] || '');
  }
}

function insertText(text){
  if(!text) return;
  inputBuffer = inputBuffer.slice(0, inputCursor) + text + inputBuffer.slice(inputCursor);
  inputCursor += text.length;
}

function deleteBackward(){
  if(inputCursor === 0) return;
  inputBuffer = inputBuffer.slice(0, inputCursor - 1) + inputBuffer.slice(inputCursor);
  inputCursor -= 1;
}

function deleteForward(){
  if(inputCursor >= inputBuffer.length) return;
  inputBuffer = inputBuffer.slice(0, inputCursor) + inputBuffer.slice(inputCursor + 1);
}

function moveCursor(delta){
  inputCursor = Math.max(0, Math.min(inputBuffer.length, inputCursor + delta));
}

function deleteToStart(){
  if(inputCursor === 0) return;
  inputBuffer = inputBuffer.slice(inputCursor);
  inputCursor = 0;
}

function deleteToEnd(){
  if(inputCursor >= inputBuffer.length) return;
  inputBuffer = inputBuffer.slice(0, inputCursor);
}

function deletePrevWord(){
  if(inputCursor === 0) return;
  const left = inputBuffer.slice(0, inputCursor);
  const right = inputBuffer.slice(inputCursor);
  const trimmed = left.replace(/\s+$/, '');
  const newLeft = trimmed.replace(/\S+$/, '');
  inputBuffer = newLeft + right;
  inputCursor = newLeft.length;
}

function openMenu(){
  showCommandMenu = true;
  showModelMenu = false;
  showHistoryMenu = false;
  showSettingsMenu = false;
  popupWidthCache = 0;
  lastCommandQuery = '';
  setStatusPlain('Command menu open; use arrows + Enter to pick.');
  startPopupAnimation();
}

function openModelMenu(){
  showModelMenu = true;
  showCommandMenu = false;
  showHistoryMenu = false;
  showSettingsMenu = false;
  popupWidthCache = 0;
  setStatusPlain('Model selector open; use arrows + Enter to pick.');
  startPopupAnimation();
}

function closeMenus(){
  showCommandMenu = false;
  showModelMenu = false;
  showHistoryMenu = false;
  showSettingsMenu = false;
  lastCommandQuery = '';
  popupAnimProgress = 1;
  popupWidthCache = 0;
}

function openHistoryMenu(initialQuery){
  showHistoryMenu = true;
  showCommandMenu = false;
  showModelMenu = false;
  showSettingsMenu = false;
  popupWidthCache = 0;
  savedInput = { buffer: inputBuffer, cursor: inputCursor };
  setInput(initialQuery || '');
  lastHistoryQuery = '';
  selectedHistory = 0;
  setStatusPlain('History search open; type to filter, Enter to paste.');
  startPopupAnimation();
}

function closeHistoryMenu(restoreInput){
  showHistoryMenu = false;
  if(restoreInput && savedInput){
    inputBuffer = savedInput.buffer;
    inputCursor = savedInput.cursor;
  }
  savedInput = null;
  lastHistoryQuery = '';
  popupAnimProgress = 1;
  popupWidthCache = 0;
}

function openSettingsMenu(filter){
  showSettingsMenu = true;
  showCommandMenu = false;
  showModelMenu = false;
  showHistoryMenu = false;
  settingsFilter = filter || '';
  selectedSetting = 0;
  popupWidthCache = 0;
  setStatusPlain('Settings open; arrows to navigate, Enter to toggle/cycle.');
  startPopupAnimation();
}

function closeSettingsMenu(){
  showSettingsMenu = false;
  settingsFilter = '';
  popupAnimProgress = 1;
  popupWidthCache = 0;
}

function openSettingsMenu(filter){
  showSettingsMenu = true;
  showCommandMenu = false;
  showModelMenu = false;
  showHistoryMenu = false;
  settingsFilter = filter || '';
  selectedSetting = 0;
  popupWidthCache = 0;
  setStatusPlain('Settings open; arrows to navigate, Enter to toggle/cycle.');
  startPopupAnimation();
}

function closeSettingsMenu(){
  showSettingsMenu = false;
  settingsFilter = '';
  popupAnimProgress = 1;
  popupWidthCache = 0;
}

function getCommandFilter(){
  const raw = inputBuffer.startsWith('/') ? inputBuffer.slice(1) : '';
  const query = raw.trim().split(/\s+/)[0].toLowerCase();
  const scored = [];
  const useFuzzy = !!config.enableFuzzySearch;
  for(let i = 0; i < commands.length; i++){
    const label = commands[i].label.slice(1).toLowerCase();
    if(query === ''){
      scored.push({ index: i, score: 0 });
      continue;
    }
    if(label.startsWith(query)){
      scored.push({ index: i, score: 0 });
    }else if(label.includes(query)){
      scored.push({ index: i, score: 1 });
    }else if(useFuzzy && isSubsequence(query, label)){
      scored.push({ index: i, score: 2 });
    }
  }
  scored.sort((a, b) => a.score - b.score || a.index - b.index);
  return { query, indices: scored.map(item => item.index) };
}

function getHistoryFilter(){
  const query = inputBuffer.trim().toLowerCase();
  const items = history.slice().reverse().filter(item => item.toLowerCase().includes(query));
  return { query, items };
}

function getSettingsList(){
  return listSettings(settingsFilter);
}

function isSubsequence(needle, haystack){
  let i = 0;
  let j = 0;
  while(i < needle.length && j < haystack.length){
    if(needle[i] === haystack[j]){
      i += 1;
    }
    j += 1;
  }
  return i === needle.length && needle.length > 0;
}

function updateCommandMenuFromInput(){
  if(showCommandMenu){
    if(!inputBuffer.startsWith('/')){
      showCommandMenu = false;
      return;
    }
    const filter = getCommandFilter();
    if(filter.query !== lastCommandQuery){
      selectedCommand = 0;
      lastCommandQuery = filter.query;
    }
    if(filter.indices.length === 0){
      selectedCommand = 0;
      return;
    }
    selectedCommand = Math.max(0, Math.min(selectedCommand, filter.indices.length - 1));
  }
}

function updateHistoryMenuFromInput(){
  if(showHistoryMenu){
    const filter = getHistoryFilter();
    if(filter.query !== lastHistoryQuery){
      selectedHistory = 0;
      lastHistoryQuery = filter.query;
    }
    if(filter.items.length === 0){
      selectedHistory = 0;
      return;
    }
    selectedHistory = Math.max(0, Math.min(selectedHistory, filter.items.length - 1));
  }
}

function getSettingsList(){
  return listSettings(settingsFilter);
}

function autocompleteCommand(){
  if(!inputBuffer.startsWith('/')) return false;
  const filter = getCommandFilter();
  if(filter.indices.length === 0) return false;
  const index = filter.indices[Math.max(0, Math.min(selectedCommand, filter.indices.length - 1))];
  const cmd = commands[index];
  if(!cmd) return false;
  const spaceIndex = inputBuffer.indexOf(' ');
  const rest = spaceIndex === -1 ? '' : inputBuffer.slice(spaceIndex);
  const next = cmd.label + (spaceIndex === -1 ? ' ' : rest);
  setInput(next);
  updateCommandMenuFromInput();
  return true;
}

function adjustLogScroll(delta){
  const maxScroll = Math.max(0, logVirtualLinesLength - logViewportHeight);
  const next = Math.max(0, Math.min(maxScroll, logScroll + delta));
  const changed = next !== logScroll;
  logScroll = next;
  if(changed) config.followLog = false;
  return changed;
}

function addLogLine(line){
  const stamp = config.showTimestamps ? `[${new Date().toLocaleTimeString('en-US', {hour12:false})}] ` : '';
  logLines.push(stamp + line);
  if(config.followLog){
    logScroll = 0;
  }
  resolvedAliasCache = {};
  trimLog();
  scheduleSave();
}

function clearAll(){
  setInput('');
  history = [];
  historyIndex = -1;
  logLines = [];
  logScroll = 0;
  logFilter = '';
  logFilterLc = '';
  config.followLog = true;
  scheduleSave();
  setStatusBeta('Cleared input, log, history, and filters.');
}

function setMouseTracking(enabled){
  if(mouseTracking === enabled) return;
  mouseTracking = enabled;
  process.stdout.write(ESC + (enabled ? '[?1000h' : '[?1000l'));
  process.stdout.write(ESC + (enabled ? '[?1006h' : '[?1006l'));
}

function disableMouseTemporarily(durationMs){
  if(!config.enableCtrlZoomPassthrough) return;
  setMouseTracking(false);
  if(mouseReenableTimer) clearTimeout(mouseReenableTimer);
  mouseReenableTimer = setTimeout(() => {
    setMouseTracking(true);
    mouseReenableTimer = null;
  }, Number(durationMs || CTRL_ZOOM_PASSTHROUGH_MS));
}

function startPopupAnimation(){
  if(!config.enableAnimation){
    popupAnimProgress = 1;
    return;
  }
  if(popupAnimProgress < 1 && popupAnimTimer) return;
  popupAnimProgress = 0.35;
  if(popupAnimTimer) clearTimeout(popupAnimTimer);
  animationJustRendered = true;
  performRender(false);
  const step = () => {
    popupAnimProgress = Math.min(1, popupAnimProgress + 0.35);
    performRender(false);
    if(popupAnimProgress < 1){
      popupAnimTimer = setTimeout(step, 20);
    }else{
      popupAnimTimer = null;
    }
  };
  popupAnimTimer = setTimeout(step, 20);
}

function wrapText(text, width){
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let current = '';
  const effectiveWidth = Math.max(4, width);
  for(const word of words){
    if((current + ' ' + word).trim().length > effectiveWidth){
      if(current) lines.push(current);
      current = word;
    }else{
      current = (current + ' ' + word).trim();
    }
  }
  if(current) lines.push(current);
  return lines.length ? lines : [''];
}

function buildWrappedLogLines(sourceLines, innerWidth){
  const lines = [];
  const indent = ' '.repeat(clamp(Number(config.wrapIndent || 0), 0, 8));
  const usableWidth = Math.max(4, innerWidth - indent.length);
  for(const raw of sourceLines){
    if(config.showWrap){
      const wrapped = wrapText(raw, usableWidth);
      wrapped.forEach((segment, idx) => {
        const prefix = idx === 0 ? '  ' : '  ' + indent;
        lines.push(prefix + segment);
      });
    }else{
      const trimmed = raw.length > innerWidth - 2 ? raw.slice(0, Math.max(0, innerWidth - 3)) + '…' : raw;
      lines.push('  ' + trimmed);
    }
  }
  return lines;
}

function formatDuration(ms){
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if(hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if(minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function resolveBookmarkIndex(target){
  if(!target) return -1;
  const text = String(target).trim();
  if(!text) return -1;
  const numeric = Number(text);
  if(Number.isFinite(numeric)){
    const idx = Math.floor(numeric) - 1;
    if(idx >= 0 && idx < config.bookmarks.length) return idx;
  }
  const lower = text.toLowerCase();
  return config.bookmarks.findIndex(item => item.toLowerCase() === lower);
}

function tokenize(text){
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(token => token.length > 1);
}

function compactSnippet(text, maxLen){
  const single = String(text || '').replace(/\s+/g, ' ').trim();
  if(single.length <= maxLen) return single;
  return single.slice(0, Math.max(0, maxLen - 3)) + '...';
}

function chunkText(text, size, overlap, maxChunks){
  const clean = String(text || '').replace(/\r\n/g, '\n').trim();
  if(!clean) return [];
  const safeSize = clamp(Number(size || 420), 120, 4000);
  const safeOverlap = clamp(Number(overlap || 60), 0, Math.floor(safeSize / 2));
  const step = Math.max(1, safeSize - safeOverlap);
  const chunks = [];
  for(let i = 0; i < clean.length; i += step){
    const slice = clean.slice(i, i + safeSize).trim();
    if(slice) chunks.push(slice);
    if(chunks.length >= maxChunks) break;
  }
  return chunks;
}

function getChunkStats(chunk){
  const cached = kbChunkCache.get(chunk.id);
  if(cached) return cached;
  const tokens = tokenize(chunk.text);
  const freq = Object.create(null);
  let max = 0;
  for(const token of tokens){
    const next = (freq[token] || 0) + 1;
    freq[token] = next;
    if(next > max) max = next;
  }
  const data = { freq, max, len: tokens.length };
  kbChunkCache.set(chunk.id, data);
  return data;
}

function kbAddDocument(text, meta){
  const raw = String(text || '').trim();
  if(!raw) return null;
  const docId = `doc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;
  const title = meta && meta.title ? String(meta.title) : `Note ${kb.docs.length + 1}`;
  const source = meta && meta.source ? String(meta.source) : 'manual';
  const maxChunks = clamp(Number(config.kbMaxChunksPerDoc || 200), 5, 2000);
  const parts = chunkText(raw, config.kbChunkSize, config.kbChunkOverlap, maxChunks);
  const chunkCount = parts.length;
  parts.forEach((part, idx) => {
    const chunkId = `${docId}:${idx}`;
    kb.chunks.push({ id: chunkId, docId, index: idx, text: part });
  });
  const doc = {
    id: docId,
    title,
    source,
    addedAt: new Date().toISOString(),
    chars: raw.length,
    chunks: chunkCount
  };
  kb.docs.push(doc);
  resetKBCache();
  scheduleKBSave();
  stats.kbAdds += 1;
  return doc;
}

function resolveDocId(target){
  if(!target) return null;
  const text = String(target).trim();
  if(!text) return null;
  const numeric = Number(text);
  if(Number.isFinite(numeric)){
    const idx = Math.floor(numeric) - 1;
    if(idx >= 0 && idx < kb.docs.length) return kb.docs[idx].id;
  }
  const lower = text.toLowerCase();
  const exact = kb.docs.find(doc => doc.id.toLowerCase() === lower);
  if(exact) return exact.id;
  const partial = kb.docs.find(doc => doc.id.toLowerCase().startsWith(lower) || doc.title.toLowerCase().includes(lower));
  return partial ? partial.id : null;
}

function kbRemoveDoc(docId){
  const docIndex = kb.docs.findIndex(doc => doc.id === docId);
  if(docIndex === -1) return false;
  kb.docs.splice(docIndex, 1);
  kb.chunks = kb.chunks.filter(chunk => chunk.docId !== docId);
  resetKBCache();
  scheduleKBSave();
  return true;
}

function kbSearch(query, limit){
  const terms = tokenize(query);
  if(terms.length === 0) return [];
  const chunks = kb.chunks;
  if(chunks.length === 0) return [];
  const df = Object.create(null);
  terms.forEach(term => { df[term] = 0; });
  const statsCache = new Map();
  for(const chunk of chunks){
    const stats = getChunkStats(chunk);
    statsCache.set(chunk.id, stats);
    for(const term of terms){
      if(stats.freq[term]) df[term] += 1;
    }
  }
  const total = chunks.length;
  const scored = [];
  for(const chunk of chunks){
    const stats = statsCache.get(chunk.id);
    let score = 0;
    for(const term of terms){
      const tf = stats.freq[term] ? stats.freq[term] / Math.max(1, stats.max) : 0;
      if(tf === 0) continue;
      const idf = Math.log((total + 1) / (df[term] + 1)) + 1;
      score += tf * idf;
    }
    if(score > 0){
      scored.push({ chunk, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const take = clamp(Number(limit || 5), 1, 20);
  const results = scored.slice(0, take).map(item => {
    const doc = kb.docs.find(d => d.id === item.chunk.docId);
    return {
      score: item.score,
      text: item.chunk.text,
      docId: item.chunk.docId,
      title: doc ? doc.title : 'Unknown',
      source: doc ? doc.source : 'unknown'
    };
  });
  stats.kbQueries += 1;
  lastSources = results;
  return results;
}

function kbAddFromFile(filePath, titleOverride){
  try{
    const text = fs.readFileSync(filePath, 'utf8');
    if(!String(text || '').trim()) return { ok: false, error: 'File is empty.' };
    const title = titleOverride || path.basename(filePath);
    const doc = kbAddDocument(text, { title, source: filePath });
    return doc ? { ok: true, doc } : { ok: false, error: 'Failed to add document.' };
  }catch(e){
    return { ok: false, error: 'Unable to read file.' };
  }
}

function kbCollectFiles(dirPath, recursive, exts, maxFiles, bucket){
  if(bucket.length >= maxFiles) return;
  let entries = [];
  try{
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  }catch(e){
    return;
  }
  for(const entry of entries){
    if(bucket.length >= maxFiles) break;
    const full = path.join(dirPath, entry.name);
    if(entry.isDirectory()){
      if(recursive) kbCollectFiles(full, recursive, exts, maxFiles, bucket);
    }else if(entry.isFile()){
      const ext = path.extname(entry.name).toLowerCase();
      if(exts.includes(ext)) bucket.push(full);
    }
  }
}
function buildStatusBar(w){
  let left = `  Model: ${activeModel}  KB: ${kb.docs.length}`;
  let perf = config.perfMode ? ` ${Math.max(0,lastRenderMs)}ms` : '';
  let right = `Theme: ${themeName}  Layout: ${config.layout}  Zoom:${config.zoomMode?'on':'off'}${perf}  /help  Ctrl+R`;
  if(left.length > w - 1){
    left = left.slice(0, Math.max(0, w - 1));
    right = '';
  }
  let gap = w - left.length - right.length;
  if(gap < 1){
    right = right.slice(0, Math.max(0, w - left.length - 1));
    gap = w - left.length - right.length;
  }
  return left + ' '.repeat(Math.max(1, gap)) + right;
}

function buildCommandInfoLines(cmd, width){
  if(!cmd) return [];
  const lines = [];
  lines.push(' Command Info');
  lines.push('');
  lines.push(` Label: ${cmd.label}`);
  lines.push(` Usage: ${cmd.usage || cmd.label}`);
  lines.push(` Example: ${cmd.example || cmd.label}`);
  lines.push('');
  const detailLines = wrapText(cmd.detail || 'No description.', width - 2);
  lines.push(' Details:');
  detailLines.forEach(line => lines.push('  ' + line));
  return lines;
}

function runCommand(cmd, fromMenu, args, rawLine){
  if(!cmd) return;
  const argv = Array.isArray(args) ? args : [];
  stats.commands += 1;
  switch(cmd){
    case 'help':
      setStatusBeta('Slash commands ready. Type /help or press / anytime.');
      openMenu();
      setInput('/');
      updateCommandMenuFromInput();
      break;
    case 'model':
      if(argv.length === 0){
        openModelMenu();
        break;
      }
      if(argv[0] === 'next' || argv[0] === 'prev'){
        const dir = argv[0] === 'next' ? 1 : -1;
        selectedModel = (selectedModel + dir + models.length) % models.length;
        activeModel = models[selectedModel];
        scheduleSave();
        setStatusBeta(`Model set to ${activeModel}.`);
        break;
      }
      if(!Number.isNaN(Number(argv[0]))){
        const idx = Math.max(1, Math.min(models.length, Number(argv[0]))) - 1;
        selectedModel = idx;
        activeModel = models[selectedModel];
        scheduleSave();
        setStatusBeta(`Model set to ${activeModel}.`);
        break;
      }
      {
        const needle = argv.join(' ').toLowerCase();
        const idx = models.findIndex(model => model.toLowerCase() === needle || model.toLowerCase().includes(needle));
        if(idx >= 0){
          selectedModel = idx;
          activeModel = models[selectedModel];
          scheduleSave();
          setStatusBeta(`Model set to ${activeModel}.`);
        }else{
          setStatusBeta('Model not found. Use /model to choose.');
        }
      }
      break;
    case 'palette':
      openMenu();
      break;
    case 'status':
      setStatusBeta(`Status: v${APP_VERSION} | Model: ${activeModel} | Theme: ${themeName} | Layout: ${config.layout}`);
      addLogLine(`User label: ${config.userLabel} | Bot label: ${config.botLabel}`);
      addLogLine(`KB: ${kb.docs.length} docs | ${kb.chunks.length} chunks`);
      break;
    case 'clear':
    case 'clearlog':
    case 'clearhistory':
    case 'clearfilter':
    case 'clearall':
      clearAll();
      break;
    case 'history':
      openHistoryMenu('');
      break;
    case 'search':
      openHistoryMenu(argv.join(' '));
      break;
    case 'last':
      if(history.length === 0){
        setStatusBeta('No history yet.');
      }else{
        setInput(history[history.length - 1]);
        setStatusBeta('Last prompt loaded.');
      }
      break;
    case 'repeat':
      if(history.length === 0){
        setStatusBeta('No history yet.');
        break;
      }
      {
        const last = history[history.length - 1];
        pushHistory(last);
        addLogLine(`> ${config.userLabel}: ${last}`);
        addLogLine(`> ${config.botLabel}: 'The ai will come soon! CLI still in beta development!!!'`);
        setStatusBeta('Repeated last prompt.');
      }
      break;
    case 'theme':
      if(argv.length === 0){
        addLogLine(`Themes: ${Object.keys(THEME_PRESETS).join(', ')}`);
        setStatusBeta(`Current theme: ${themeName}`);
      }else if(argv[0] === 'next' || argv[0] === 'prev' || argv[0] === 'random'){
        const keys = Object.keys(THEME_PRESETS);
        if(argv[0] === 'random'){
          const idx = Math.floor(Math.random() * keys.length);
          applyTheme(keys[idx]);
        }else{
          const dir = argv[0] === 'next' ? 1 : -1;
          const idx = Math.max(0, keys.indexOf(themeName));
          const nextIdx = (idx + dir + keys.length) % keys.length;
          applyTheme(keys[nextIdx]);
        }
        setConfigValue('theme', themeName);
        setStatusBeta(`Theme set to ${themeName}.`);
      }else{
        applyTheme(argv[0]);
        setConfigValue('theme', themeName);
        setStatusBeta(`Theme set to ${themeName}.`);
      }
      break;
    case 'layout': {
      const mode = (argv[0] || '').toLowerCase();
      if(!mode){
        setStatusBeta(`Layout is ${config.layout}. Try /layout full|compact|minimal.`);
        break;
      }
      if(!applyLayout(mode)){
        setStatusBeta('Usage: /layout <full|compact|minimal>');
        break;
      }
      scheduleSave();
      setStatusBeta(`Layout set to ${config.layout}.`);
      break;
    }
    case 'logo':
      config.showLogo = !config.showLogo;
      setConfigValue('showLogo', config.showLogo);
      markLayoutCustom();
      setStatusBeta(`Logo ${config.showLogo ? 'enabled' : 'disabled'}.`);
      break;
    case 'hints':
      config.showHints = !config.showHints;
      setConfigValue('showHints', config.showHints);
      markLayoutCustom();
      setStatusBeta(`Hints ${config.showHints ? 'enabled' : 'disabled'}.`);
      break;
    case 'header':
      config.showHeader = !config.showHeader;
      setConfigValue('showHeader', config.showHeader);
      markLayoutCustom();
      setStatusBeta(`Header ${config.showHeader ? 'enabled' : 'disabled'}.`);
      break;
    case 'statusbar':
      config.showStatusBar = !config.showStatusBar;
      setConfigValue('showStatusBar', config.showStatusBar);
      setStatusBeta(`Status bar ${config.showStatusBar ? 'enabled' : 'disabled'}.`);
      break;
    case 'scrollbar':
      config.showScrollbar = !config.showScrollbar;
      setConfigValue('showScrollbar', config.showScrollbar);
      setStatusBeta(`Scrollbar ${config.showScrollbar ? 'enabled' : 'disabled'}.`);
      break;
    case 'timestamps':
      config.showTimestamps = !config.showTimestamps;
      setConfigValue('showTimestamps', config.showTimestamps);
      setStatusBeta(`Timestamps ${config.showTimestamps ? 'enabled' : 'disabled'}.`);
      break;
    case 'fuzzy':
      config.enableFuzzySearch = !config.enableFuzzySearch;
      setConfigValue('enableFuzzySearch', config.enableFuzzySearch);
      setStatusBeta(`Fuzzy search ${config.enableFuzzySearch ? 'enabled' : 'disabled'}.`);
      break;
    case 'outline': {
      const byCat = {};
      commands.forEach(cmd => {
        const cat = cmd.category || 'Other';
        byCat[cat] = (byCat[cat] || 0) + 1;
      });
      addLogLine('Command outline:');
      Object.keys(byCat).sort().forEach(cat => addLogLine(`  ${cat}: ${byCat[cat]}`));
      setStatusBeta('Command outline logged.');
      break;
    }
    case 'quiet':
      config.enableAnimation = !config.enableAnimation;
      config.showStatusBar = !config.showStatusBar;
      setConfigValue('enableAnimation', config.enableAnimation);
      setConfigValue('showStatusBar', config.showStatusBar);
      popupAnimProgress = 1;
      setStatusBeta(`Quiet mode ${config.enableAnimation ? 'off' : 'on'} (animation ${config.enableAnimation?'on':'off'}, status bar ${config.showStatusBar?'on':'off'}).`);
      break;
    case 'follow':
      config.followLog = !config.followLog;
      setConfigValue('followLog', config.followLog);
      if(config.followLog) logScroll = 0;
      setStatusBeta(`Follow mode ${config.followLog ? 'enabled' : 'disabled'}.`);
      break;
    case 'filter': {
      const term = argv.join(' ').trim();
      if(!term){
        setStatusBeta('Usage: /filter <text>');
        break;
      }
      logFilter = term;
      logFilterLc = term.toLowerCase();
      logScroll = 0;
      setStatusBeta(`Log filter set: "${term}"`);
      break;
    }
    case 'clearfilter':
      logFilter = '';
      logFilterLc = '';
      logScroll = 0;
      setStatusBeta('Log filter cleared.');
      break;
    case 'alias': {
      const sub = (argv[0] || 'list').toLowerCase();
      if(sub === 'list'){
        const names = Object.keys(config.aliases || {});
        if(names.length === 0){
          addLogLine('No aliases. Use /alias add <name> <command>.');
        }else{
          names.forEach(name => addLogLine(`${name} => ${config.aliases[name]}`));
        }
        setStatusBeta('Aliases listed.');
        break;
      }
      if(sub === 'add'){
        const name = argv[1];
        const target = argv.slice(2).join(' ').trim();
        if(!name || !target){
          setStatusBeta('Usage: /alias add <name> <command>');
          break;
        }
        config.aliases[name] = target;
        resolvedAliasCache = {};
        setConfigValue('aliases', config.aliases);
        setStatusBeta(`Alias added: ${name} => ${target}`);
        break;
      }
      if(sub === 'remove' || sub === 'rm'){
        const name = argv[1];
        if(!name){
          setStatusBeta('Usage: /alias remove <name>');
          break;
        }
        if(config.aliases && config.aliases[name]){
          delete config.aliases[name];
          resolvedAliasCache = {};
          setConfigValue('aliases', config.aliases);
          setStatusBeta(`Alias removed: ${name}`);
        }else{
          setStatusBeta('Alias not found.');
        }
        break;
      }
      if(sub === 'clear'){
        config.aliases = {};
        resolvedAliasCache = {};
        setConfigValue('aliases', config.aliases);
        setStatusBeta('Aliases cleared.');
        break;
      }
      setStatusBeta('Usage: /alias <add|remove|list|clear>');
      break;
    }
    case 'settings':
    case 'setting':
      openSettingsMenu(argv.join(' '));
      break;
    case 'rag':
      runCommand('kb', fromMenu, ['search', ...argv], rawLine);
      break;
    case 'addfile':
      runCommand('kb', fromMenu, ['addfile', ...argv], rawLine);
      break;
    case 'perf':
      config.perfMode = !config.perfMode;
      setConfigValue('perfMode', config.perfMode);
      setStatusBeta(`Perf overlay ${config.perfMode ? 'enabled' : 'disabled'}.`);
      break;
    case 'zoom':
      config.zoomMode = !config.zoomMode;
      applyInputMode();
      setStatusBeta(`Zoom mode ${config.zoomMode ? 'enabled (use Ctrl/Cmd+Scroll or Ctrl++/Ctrl+-)' : 'disabled'}.`);
      break;
    case 'config':
      addLogLine(`Config path: ${CONFIG_PATH}`);
      addLogLine(`Theme: ${themeName}`);
      addLogLine(`Models: ${models.join(', ')}`);
      addLogLine(`Bookmarks: ${config.bookmarks.length}`);
      addLogLine(`KB path: ${KB_PATH}`);
      addLogLine(`KB docs: ${kb.docs.length} | chunks: ${kb.chunks.length}`);
      addLogLine(`KB chunk size: ${config.kbChunkSize} | overlap: ${config.kbChunkOverlap} | max/doc: ${config.kbMaxChunksPerDoc}`);
      addLogLine(`History limit: ${config.historyLimit} | Log limit: ${config.logLimit}`);
      addLogLine(`Mouse scroll: ${config.enableMouseScroll} | Ctrl+zoom: ${config.enableCtrlZoomPassthrough}`);
      addLogLine(`Animation: ${config.enableAnimation} | Help panel: ${config.showCommandHelpPanel} | Zoom mode: ${config.zoomMode}`);
      addLogLine(`Header: ${config.showHeader} | Logo: ${config.showLogo} | Hints: ${config.showHints}`);
      addLogLine(`Model line: ${config.showModelLine} | Status line: ${config.showStatusLine}`);
      addLogLine(`Timestamps: ${config.showTimestamps} | Status bar: ${config.showStatusBar} | Scrollbar: ${config.showScrollbar}`);
      addLogLine(`Wrap: ${config.showWrap} (indent ${config.wrapIndent}) | Follow: ${config.followLog}`);
      addLogLine(`Aliases: ${Object.keys(config.aliases||{}).length}`);
      addLogLine(`Fuzzy search: ${config.enableFuzzySearch} | Layout: ${config.layout}`);
      addLogLine(`Labels: ${config.userLabel} / ${config.botLabel}`);
      setStatusBeta('Config details logged.');
      break;
    case 'set': {
      const key = argv[0];
      const value = argv.slice(1).join(' ');
      if(!key){
        setStatusBeta('Usage: /set <key> <value>');
        break;
      }
      const parsed = parseConfigValue(value);
      if(key === 'theme'){
        applyTheme(String(parsed));
        setConfigValue('theme', themeName);
        setStatusBeta(`Theme set to ${themeName}.`);
        break;
      }
      if(key === 'layout'){
        if(!applyLayout(parsed)){
          setStatusBeta('Usage: /set layout <full|compact|minimal>');
          break;
        }
        scheduleSave();
        setStatusBeta(`Layout set to ${config.layout}.`);
        break;
      }
      if(key === 'models'){
        models = normalizeModels(String(value).split(','));
        if(models.length === 0) models = DEFAULT_MODELS.slice();
        activeModel = models[0];
        selectedModel = 0;
        setConfigValue('models', models);
        setStatusBeta('Models updated.');
        break;
      }
      if(key === 'kbChunkSize'){
        config.kbChunkSize = clamp(Number(parsed), 120, 4000);
        setConfigValue('kbChunkSize', config.kbChunkSize);
        setStatusBeta(`KB chunk size set to ${config.kbChunkSize}.`);
        break;
      }
      if(key === 'kbChunkOverlap'){
        const base = clamp(Number(parsed), 0, Math.floor(Number(config.kbChunkSize || 420) / 2));
        config.kbChunkOverlap = base;
        setConfigValue('kbChunkOverlap', config.kbChunkOverlap);
        setStatusBeta(`KB chunk overlap set to ${config.kbChunkOverlap}.`);
        break;
      }
      if(key === 'kbMaxChunksPerDoc'){
        config.kbMaxChunksPerDoc = clamp(Number(parsed), 5, 2000);
        setConfigValue('kbMaxChunksPerDoc', config.kbMaxChunksPerDoc);
        setStatusBeta(`KB max chunks/doc set to ${config.kbMaxChunksPerDoc}.`);
        break;
      }
      if(key === 'showWrap'){
        config.showWrap = parsed === '' ? true : !!parsed;
        setConfigValue('showWrap', config.showWrap);
        setStatusBeta(`Wrap ${config.showWrap ? 'enabled' : 'disabled'}.`);
        break;
      }
      if(key === 'wrapIndent'){
        config.wrapIndent = clamp(Number(parsed), 0, 8);
        setConfigValue('wrapIndent', config.wrapIndent);
        setStatusBeta(`Wrap indent set to ${config.wrapIndent}.`);
        break;
      }
      config[key] = parsed;
      if(key === 'userLabel') config.userLabel = String(parsed || DEFAULT_LABELS.user);
      if(key === 'botLabel') config.botLabel = String(parsed || DEFAULT_LABELS.bot);
      setConfigValue(key, parsed);
      if(['showHeader','showLogo','showHints','showModelLine','showStatusLine'].includes(key)){
        markLayoutCustom();
      }
      if(key === 'enableMouseScroll'){
        setMouseTracking(!!config.enableMouseScroll);
      }
      if(key === 'enableAnimation'){
        popupAnimProgress = 1;
      }
      setStatusBeta(`Config updated: ${key}`);
      break;
    }
    case 'get': {
      const key = argv[0];
      if(!key){
        setStatusBeta('Usage: /get <key>');
        break;
      }
      const value = config[key];
      addLogLine(`${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`);
      setStatusBeta(`Config value for ${key}.`);
      break;
    }
    case 'toggle': {
      const key = argv[0];
      if(!key){
        setStatusBeta('Usage: /toggle <key>');
        break;
      }
      const current = !!config[key];
      config[key] = !current;
      if(['showHeader','showLogo','showHints','showModelLine','showStatusLine'].includes(key)){
        markLayoutCustom();
      }
      if(key === 'enableMouseScroll'){
        setMouseTracking(!!config.enableMouseScroll);
      }
      if(key === 'enableAnimation'){
        popupAnimProgress = 1;
      }
      if(key === 'showWrap'){
        setConfigValue(key, config[key]);
        setStatusBeta(`Wrap ${config[key] ? 'enabled' : 'disabled'}.`);
        break;
      }
      setConfigValue(key, config[key]);
      setStatusBeta(`${key} set to ${config[key]}`);
      break;
    }
    case 'export': {
      const target = argv[0];
      if(!target){
        setStatusBeta('Usage: /export <path>');
        break;
      }
      const outPath = path.resolve(target);
      const ok = safeWriteJson(outPath, config);
      setStatusBeta(ok ? `Config exported to ${outPath}` : 'Failed to export config.');
      break;
    }
    case 'import': {
      const target = argv[0];
      if(!target){
        setStatusBeta('Usage: /import <path>');
        break;
      }
      const inPath = path.resolve(target);
      const incoming = safeReadJson(inPath);
      if(!incoming){
        setStatusBeta('Failed to import config.');
        break;
      }
      config = { ...DEFAULT_CONFIG, ...incoming };
      models = normalizeModels(config.models);
      config.bookmarks = normalizeBookmarks(config.bookmarks || []);
      config.userLabel = String(config.userLabel || DEFAULT_LABELS.user);
      config.botLabel = String(config.botLabel || DEFAULT_LABELS.bot);
      config.zoomMode = !!config.zoomMode;
      if(config.layout && config.layout !== 'custom'){
        applyLayout(config.layout);
      }
      activeModel = models[Math.max(0, Math.min(models.length - 1, config.modelIndex || 0))] || models[0];
      applyTheme(config.theme || 'nebula');
      applyInputMode();
      setStatusBeta('Config imported.');
      scheduleSave();
      break;
    }
    case 'keys':
      KEYBINDINGS.forEach(binding => addLogLine(`${binding.keys}: ${binding.desc}`));
      setStatusBeta('Keybindings listed.');
      break;
    case 'log':
      addLogLine(`Log lines: ${logLines.length}/${config.logLimit} | Scroll: ${logScroll}`);
      if(logFilter) addLogLine(`Log filter: "${logFilter}"`);
      setStatusBeta('Log stats logged.');
      break;
    case 'exporthistory': {
      const target = argv[0];
      if(!target){
        setStatusBeta('Usage: /exporthistory <path>');
        break;
      }
      const outPath = path.resolve(target);
      const ok = safeWriteJson(outPath, { history });
      setStatusBeta(ok ? `History exported to ${outPath}` : 'Failed to export history.');
      break;
    }
    case 'importhistory': {
      const target = argv[0];
      if(!target){
        setStatusBeta('Usage: /importhistory <path> [merge]');
        break;
      }
      const merge = (argv[1] || '').toLowerCase() === 'merge';
      const inPath = path.resolve(target);
      const incoming = safeReadJson(inPath);
      const incomingHistory = Array.isArray(incoming) ? incoming : incoming && Array.isArray(incoming.history) ? incoming.history : null;
      if(!incomingHistory){
        setStatusBeta('Failed to import history.');
        break;
      }
      history = merge ? history.concat(incomingHistory.map(String)) : incomingHistory.map(String);
      trimHistory();
      scheduleSave();
      setStatusBeta(`History ${merge ? 'merged' : 'imported'}.`);
      break;
    }
    case 'save':
      saveConfig();
      saveHistory();
      saveKB();
      setStatusBeta('Config, history, and KB saved.');
      break;
    case 'reload': {
      config = loadConfig();
      models = normalizeModels(config.models);
      config.bookmarks = normalizeBookmarks(config.bookmarks || []);
      config.userLabel = String(config.userLabel || DEFAULT_LABELS.user);
      config.botLabel = String(config.botLabel || DEFAULT_LABELS.bot);
      config.zoomMode = !!config.zoomMode;
      if(config.layout && config.layout !== 'custom'){
        applyLayout(config.layout);
      }
      const data = loadHistory();
      history = data.history || [];
      logLines = data.logLines || [];
      const nextKB = loadKB();
      kb = { docs: nextKB.docs || [], chunks: nextKB.chunks || [] };
      resetKBCache();
      activeModel = models[Math.max(0, Math.min(models.length - 1, config.modelIndex || 0))] || models[0];
      applyTheme(config.theme || 'nebula');
      applyInputMode();
      logScroll = 0;
      setStatusBeta('Reloaded config and history.');
      break;
    }
    case 'stats': {
      const uptime = formatDuration(Date.now() - stats.startTime);
      addLogLine(`Uptime: ${uptime}`);
      addLogLine(`Commands run: ${stats.commands}`);
      addLogLine(`Prompts sent: ${stats.prompts}`);
      addLogLine(`Keystrokes: ${stats.keystrokes}`);
      addLogLine(`KB adds: ${stats.kbAdds} | KB queries: ${stats.kbQueries}`);
      addLogLine(`KB docs: ${kb.docs.length} | KB chunks: ${kb.chunks.length}`);
      addLogLine(`History: ${history.length} | Log: ${logLines.length}`);
      setStatusBeta('Session stats logged.');
      break;
    }
    case 'exportlog': {
      const target = argv[0];
      if(!target){
        setStatusBeta('Usage: /exportlog <path>');
        break;
      }
      const outPath = path.resolve(target);
      const ok = safeWriteText(outPath, logLines.join('\n'));
      setStatusBeta(ok ? `Log exported to ${outPath}` : 'Failed to export log.');
      break;
    }
    case 'bookmark': {
      const sub = (argv[0] || 'list').toLowerCase();
      const rest = argv.slice(1).join(' ').trim();
      if(sub === 'add'){
        if(!rest){
          setStatusBeta('Usage: /bookmark add <text>');
          break;
        }
        const existing = resolveBookmarkIndex(rest);
        if(existing >= 0) config.bookmarks.splice(existing, 1);
        config.bookmarks.push(rest);
        config.bookmarks = normalizeBookmarks(config.bookmarks);
        setConfigValue('bookmarks', config.bookmarks);
        setStatusBeta('Bookmark saved.');
        break;
      }
      if(sub === 'list' || sub === 'ls'){
        if(config.bookmarks.length === 0){
          addLogLine('No bookmarks yet. Use /bookmark add <text>.');
        }else{
          config.bookmarks.forEach((item, idx) => {
            addLogLine(`[${idx + 1}] ${item}`);
          });
        }
        setStatusBeta('Bookmarks listed.');
        break;
      }
      if(sub === 'use'){
        const idx = resolveBookmarkIndex(rest);
        if(idx < 0){
          setStatusBeta('Bookmark not found.');
          break;
        }
        setInput(config.bookmarks[idx]);
        setStatusBeta(`Loaded bookmark ${idx + 1}.`);
        break;
      }
      if(sub === 'remove' || sub === 'rm' || sub === 'del'){
        const idx = resolveBookmarkIndex(rest);
        if(idx < 0){
          setStatusBeta('Bookmark not found.');
          break;
        }
        const removed = config.bookmarks.splice(idx, 1);
        setConfigValue('bookmarks', config.bookmarks);
        setStatusBeta(`Removed bookmark: ${removed[0]}`);
        break;
      }
      if(sub === 'clear'){
        config.bookmarks = [];
        setConfigValue('bookmarks', config.bookmarks);
        setStatusBeta('Bookmarks cleared.');
        break;
      }
      setStatusBeta('Usage: /bookmark <add|list|use|remove|clear>');
      break;
    }
    case 'kb': {
      const sub = (argv[0] || 'stats').toLowerCase();
      const rest = argv.slice(1);
      if(sub === 'add'){
        const text = rest.join(' ').trim();
        if(!text){
          setStatusBeta('Usage: /kb add <text>');
          break;
        }
        const doc = kbAddDocument(text, { title: `Note ${kb.docs.length + 1}`, source: 'manual' });
        setStatusBeta(doc ? `KB added: ${doc.title}` : 'KB add failed.');
        break;
      }
      if(sub === 'addfile'){
        const target = rest[0];
        if(!target){
          setStatusBeta('Usage: /kb addfile <path>');
          break;
        }
        const result = kbAddFromFile(path.resolve(target));
        setStatusBeta(result.ok ? `KB file added: ${result.doc.title}` : `KB file add failed: ${result.error}`);
        break;
      }
      if(sub === 'adddir'){
        const target = rest[0];
        if(!target){
          setStatusBeta('Usage: /kb adddir <path> [exts] [limit] [-r]');
          break;
        }
        let recursive = rest.includes('-r') || rest.includes('recursive');
        let limit = 50;
        let exts = DEFAULT_KB_EXTS.slice();
        rest.slice(1).forEach(arg => {
          if(arg === '-r' || arg === 'recursive') return;
          if(!Number.isNaN(Number(arg))){
            limit = clamp(Number(arg), 1, 200);
            return;
          }
          if(arg.includes('.') || arg.includes(',')){
            exts = arg.split(',').map(ext => ext.trim()).filter(Boolean).map(ext => ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`);
          }
        });
        const files = [];
        kbCollectFiles(path.resolve(target), recursive, exts, limit, files);
        if(files.length === 0){
          setStatusBeta('No matching files found.');
          break;
        }
        let added = 0;
        files.forEach(filePath => {
          const result = kbAddFromFile(filePath);
          if(result.ok) added += 1;
        });
        setStatusBeta(`KB added ${added}/${files.length} files.`);
        break;
      }
      if(sub === 'list'){
        if(kb.docs.length === 0){
          addLogLine('KB is empty. Use /kb add or /kb addfile.');
        }else{
          kb.docs.forEach((doc, idx) => {
            addLogLine(`[${idx + 1}] ${doc.title} | chunks: ${doc.chunks} | ${doc.source}`);
          });
        }
        setStatusBeta('KB list logged.');
        break;
      }
      if(sub === 'drop' || sub === 'remove' || sub === 'rm'){
        const target = rest[0];
        if(!target){
          setStatusBeta('Usage: /kb drop <id|index>');
          break;
        }
        const docId = resolveDocId(target);
        if(!docId){
          setStatusBeta('KB doc not found.');
          break;
        }
        const ok = kbRemoveDoc(docId);
        setStatusBeta(ok ? 'KB doc removed.' : 'KB remove failed.');
        break;
      }
      if(sub === 'clear'){
        kb.docs = [];
        kb.chunks = [];
        resetKBCache();
        scheduleKBSave();
        setStatusBeta('KB cleared.');
        break;
      }
      if(sub === 'search'){
        let limit = 5;
        const maybe = rest[rest.length - 1];
        if(maybe && !Number.isNaN(Number(maybe))){
          limit = clamp(Number(maybe), 1, 20);
          rest.pop();
        }
        const query = rest.join(' ').trim();
        if(!query){
          setStatusBeta('Usage: /kb search <query> [limit]');
          break;
        }
        const results = kbSearch(query, limit);
        if(results.length === 0){
          setStatusBeta('No KB matches.');
          break;
        }
        addLogLine(`KB matches for "${query}": ${results.length}`);
        results.forEach((result, idx) => {
          addLogLine(`[${idx + 1}] ${result.title} | ${result.source}`);
          addLogLine(`  ${compactSnippet(result.text, 140)}`);
        });
        setStatusBeta('KB search logged.');
        break;
      }
      if(sub === 'stats'){
        addLogLine(`KB docs: ${kb.docs.length} | chunks: ${kb.chunks.length}`);
        addLogLine(`Chunk size: ${config.kbChunkSize} | overlap: ${config.kbChunkOverlap} | max/doc: ${config.kbMaxChunksPerDoc}`);
        setStatusBeta('KB stats logged.');
        break;
      }
      if(sub === 'export'){
        const target = rest[0];
        if(!target){
          setStatusBeta('Usage: /kb export <path>');
          break;
        }
        const outPath = path.resolve(target);
        const ok = safeWriteJson(outPath, kb);
        setStatusBeta(ok ? `KB exported to ${outPath}` : 'KB export failed.');
        break;
      }
      if(sub === 'import'){
        const target = rest[0];
        const merge = (rest[1] || '').toLowerCase() === 'merge';
        if(!target){
          setStatusBeta('Usage: /kb import <path> [merge]');
          break;
        }
        const inPath = path.resolve(target);
        const incoming = safeReadJson(inPath);
        if(!incoming || !Array.isArray(incoming.docs) || !Array.isArray(incoming.chunks)){
          setStatusBeta('KB import failed.');
          break;
        }
        if(merge){
          kb.docs = kb.docs.concat(incoming.docs);
          kb.chunks = kb.chunks.concat(incoming.chunks);
        }else{
          kb = { docs: incoming.docs, chunks: incoming.chunks };
        }
        resetKBCache();
        scheduleKBSave();
        setStatusBeta(`KB ${merge ? 'merged' : 'imported'}.`);
        break;
      }
      setStatusBeta('Usage: /kb <add|addfile|adddir|list|drop|clear|search|stats|export|import>');
      break;
    }
    case 'rag': {
      const query = argv.join(' ').trim();
      if(!query){
        setStatusBeta('Usage: /rag <query>');
        break;
      }
      const results = kbSearch(query, 5);
      if(results.length === 0){
        setStatusBeta('No KB matches.');
        break;
      }
      addLogLine(`RAG matches for "${query}": ${results.length}`);
      results.forEach((result, idx) => {
        addLogLine(`[${idx + 1}] ${result.title} | ${result.source}`);
        addLogLine(`  ${compactSnippet(result.text, 140)}`);
      });
      setStatusBeta('RAG search logged.');
      break;
    }
    case 'ask': {
      const query = argv.join(' ').trim();
      if(!query){
        setStatusBeta('Usage: /ask <query>');
        break;
      }
      const results = kbSearch(query, 3);
      if(results.length === 0){
        addLogLine(`No KB context for "${query}".`);
        setStatusBeta('No KB matches.');
        break;
      }
      addLogLine(`RAG context for "${query}":`);
      results.forEach((result, idx) => {
        addLogLine(`[${idx + 1}] ${result.title} | ${result.source}`);
        addLogLine(`  ${compactSnippet(result.text, 160)}`);
      });
      addLogLine(`> ${config.botLabel}: 'Context loaded. AI response coming soon.'`);
      setStatusBeta('RAG response logged.');
      break;
    }
    case 'sources':
      if(lastSources.length === 0){
        setStatusBeta('No recent KB sources.');
        break;
      }
      addLogLine(`Last KB sources: ${lastSources.length}`);
      lastSources.forEach((source, idx) => {
        addLogLine(`[${idx + 1}] ${source.title} | ${source.source}`);
        addLogLine(`  ${compactSnippet(source.text, 120)}`);
      });
      setStatusBeta('Sources logged.');
      break;
    case 'top': {
      const maxScroll = Math.max(0, logLines.length - logViewportHeight);
      logScroll = maxScroll;
      setStatusBeta('Scrolled to top.');
      break;
    }
    case 'bottom':
      logScroll = 0;
      setStatusBeta('Scrolled to bottom.');
      break;
    case 'pageup':
      adjustLogScroll(Math.max(1, logViewportHeight));
      setStatusBeta('Page up.');
      break;
    case 'pagedown':
      adjustLogScroll(-Math.max(1, logViewportHeight));
      setStatusBeta('Page down.');
      break;
    case 'find': {
      const query = argv.join(' ').trim().toLowerCase();
      if(!query){
        setStatusBeta('Usage: /find <text>');
        break;
      }
      const matches = [];
      logLines.forEach((line, idx) => {
        if(line.toLowerCase().includes(query)) matches.push({ idx, line });
      });
      addLogLine(`Find "${query}": ${matches.length} matches`);
      matches.slice(0, 5).forEach(match => {
        addLogLine(`  [${match.idx + 1}] ${match.line}`);
      });
      if(matches.length > 5) addLogLine('  ...');
      setStatusBeta('Find results logged.');
      break;
    }
    case 'time': {
      const now = new Date();
      addLogLine(`Local time: ${now.toLocaleTimeString()}`);
      setStatusBeta('Time logged.');
      break;
    }
    case 'date': {
      const now = new Date();
      addLogLine(`Local date: ${now.toLocaleDateString()}`);
      setStatusBeta('Date logged.');
      break;
    }
    case 'sys': {
      const size = `${process.stdout.columns || 0}x${process.stdout.rows || 0}`;
      addLogLine(`Node: ${process.version}`);
      addLogLine(`Platform: ${process.platform} ${process.arch}`);
      addLogLine(`Terminal size: ${size}`);
      addLogLine(`Config: ${CONFIG_PATH}`);
      setStatusBeta('System info logged.');
      break;
    }
    case 'calc': {
      const expr = argv.join(' ').trim();
      if(!expr){
        setStatusBeta('Usage: /calc <expression>');
        break;
      }
      if(!/^[0-9+\-*/().%^\s]+$/.test(expr)){
        setStatusBeta('Calc supports only numbers and + - * / ( ) % ^');
        break;
      }
      try{
        const normalized = expr.replace(/\^/g, '**');
        const result = Function(`return (${normalized})`)();
        addLogLine(`Calc: ${expr} = ${result}`);
        setStatusBeta('Calculation logged.');
      }catch(e){
        setStatusBeta('Invalid expression.');
      }
      break;
    }
    case 'label': {
      const sub = (argv[0] || 'show').toLowerCase();
      if(sub === 'show'){
        addLogLine(`User label: ${config.userLabel}`);
        addLogLine(`Bot label: ${config.botLabel}`);
        setStatusBeta('Labels logged.');
        break;
      }
      if(sub === 'user' || sub === 'bot'){
        const name = argv.slice(1).join(' ').trim();
        if(!name){
          setStatusBeta('Usage: /label <user|bot> <name>');
          break;
        }
        if(sub === 'user') config.userLabel = name;
        if(sub === 'bot') config.botLabel = name;
        setConfigValue(sub === 'user' ? 'userLabel' : 'botLabel', name);
        setStatusBeta(`${sub} label set.`);
        break;
      }
      setStatusBeta('Usage: /label <user|bot> <name>');
      break;
    }
    case 'tip': {
      const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
      addLogLine(tip);
      setStatusBeta('Tip logged.');
      break;
    }
    case 'ping':
      addLogLine('Ping. KrazydenAI is responsive.');
      setStatusBeta('Ping ok.');
      break;
    case 'refresh':
      requestRender(true);
      setStatusBeta('UI refreshed.');
      break;
    case 'about':
      addLogLine(`${APP_NAME} CLI Beta`);
      addLogLine(`Version: v${APP_VERSION}`);
      addLogLine('Built for a fast, cinematic terminal experience.');
      setStatusBeta('About logged.');
      break;
    case 'reset':
      setInput('');
      history = [];
      historyIndex = -1;
      logLines = [];
      logScroll = 0;
      scheduleSave();
      setStatusBeta('Session reset.');
      break;
    case 'exit':
      cleanup();
      return;
    default:
      if(extraActionBySlug[cmd] || extraActionLegacy[cmd]){
        runExtraCommand(cmd);
        break;
      }
      if(cmd.startsWith('x') && cmd.length === 4){
        runExtraCommand(cmd);
        break;
      }
      setStatusBeta(`Unknown command: /${cmd}. Type /help.`);
  }
}

function submitInput(){
  const raw = inputBuffer;
  const text = raw.trim();
  if(text.startsWith('/')){
    const parts = text.slice(1).trim().split(/\s+/);
    const cmdRaw = parts[0] || '';
    const cmd = resolveAlias(cmdRaw);
    const args = parts.slice(1);
    setInput('');
    runCommand(cmd, false, args, text);
    return;
  }
  if(text.length > 0){
    pushHistory(text);
    addLogLine(`> ${config.userLabel}: ${text}`);
    stats.prompts += 1;
  }
  addLogLine(`> ${config.botLabel}: 'The ai will come soon! CLI still in beta development!!!'`);
  setInput('');
  setStatusBeta();
}

function executeMenuCommand(){
  if(showModelMenu){
    activeModel = models[selectedModel];
    setStatusBeta(`Model set to ${activeModel}.`);
    showModelMenu = false;
    scheduleSave();
    return;
  }
  if(showHistoryMenu){
    const filter = getHistoryFilter();
    if(filter.items.length === 0){
      closeHistoryMenu(true);
      setStatusBeta('No history match.');
      return;
    }
    const selected = filter.items[Math.max(0, Math.min(selectedHistory, filter.items.length - 1))];
    showHistoryMenu = false;
    savedInput = null;
    setInput(selected);
    setStatusBeta('History item loaded.');
    return;
  }
  if(showCommandMenu){
    const filter = getCommandFilter();
    const typed = inputBuffer.trim();
    if(typed.startsWith('/')){
      const parts = typed.slice(1).trim().split(/\s+/);
      const cmdName = parts[0] || '';
      const args = parts.slice(1);
      const exact = commands.find((cmd) => cmd.label === `/${cmdName}`);
      if(exact){
        showCommandMenu = false;
        setInput('');
        runCommand(cmdName, true, args, typed);
        return;
      }
    }
    if(filter.indices.length === 0){
      showCommandMenu = false;
      setInput('');
      setStatusBeta(`Unknown command: ${typed}. Type /help.`);
      return;
    }
    const selectedIndex = filter.indices[Math.max(0, Math.min(selectedCommand, filter.indices.length - 1))];
    const cmd = commands[selectedIndex].label.slice(1);
    showCommandMenu = false;
    setInput('');
    if(cmd === 'model'){
      openModelMenu();
      return;
    }
    runCommand(cmd, true, [], '');
  }
  if(showSettingsMenu){
    const settings = getSettingsList();
    if(settings.length === 0){
      closeSettingsMenu();
      setStatusBeta('No settings match.');
      return;
    }
    const item = settings[Math.max(0, Math.min(selectedSetting, settings.length - 1))];
    applySetting(item, 1);
    setStatusBeta(`${item.label || item.key} updated.`);
    requestRender(true);
  }
}

try{ process.stdin.setRawMode(true); }catch(e){}
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', data=>{
  let i = 0;
  let needsRender = false;

  while(i < data.length){
    const slice = data.slice(i);

    if(slice.startsWith('\u0003')){
      return cleanup();
    }

    const mouseMatch = slice.match(/^\x1b\[<(\d+);(\d+);(\d+)([mM])/);
    if(mouseMatch){
      const code = parseInt(mouseMatch[1], 10);
    const isWheel = (code & 64) === 64;
    const isAlt = (code & 8) === 8;
    const isCtrl = (code & 16) === 16;
    if(isWheel && config.enableCtrlZoomPassthrough && (isCtrl || isAlt)){
      disableMouseTemporarily(CTRL_ZOOM_PASSTHROUGH_MS);
        i += mouseMatch[0].length;
        continue;
      }
      if(isWheel && config.enableMouseScroll){
        const isDown = (code & 1) === 1;
        lastWheelAt = Date.now();
        lastWheelScroll = logScroll;
        if(adjustLogScroll(isDown ? -3 : 3)){
          needsRender = true;
        }
      }
      i += mouseMatch[0].length;
      continue;
    }

    stats.keystrokes += 1;

    if(slice.startsWith('\x1b[3~')){
      if(!showModelMenu){
        deleteForward();
        updateCommandMenuFromInput();
        updateHistoryMenuFromInput();
        needsRender = true;
      }
      i += 4;
      continue;
    }

    if(slice.startsWith('\x1b[A')){
      if(showModelMenu){
        selectedModel = (selectedModel + models.length - 1) % models.length;
      }else if(showHistoryMenu){
        selectedHistory = Math.max(0, selectedHistory - 1);
      }else if(showSettingsMenu){
        const count = getSettingsList().length;
        selectedSetting = count > 0 ? (selectedSetting + count - 1) % count : 0;
      }else if(showCommandMenu){
        const count = getCommandFilter().indices.length;
        selectedCommand = count > 0 ? (selectedCommand + count - 1) % count : 0;
      }else{
        historyPrev();
      }
      needsRender = true;
      i += 3;
      continue;
    }

    if(slice.startsWith('\x1b[B')){
      if(showModelMenu){
        selectedModel = (selectedModel + 1) % models.length;
      }else if(showHistoryMenu){
        selectedHistory = selectedHistory + 1;
        updateHistoryMenuFromInput();
      }else if(showSettingsMenu){
        const count = getSettingsList().length;
        selectedSetting = count > 0 ? (selectedSetting + 1) % count : 0;
      }else if(showCommandMenu){
        const count = getCommandFilter().indices.length;
        selectedCommand = count > 0 ? (selectedCommand + 1) % count : 0;
      }else{
        historyNext();
      }
      needsRender = true;
      i += 3;
      continue;
    }

    if(slice.startsWith('\x1b[C')){
      if(showModelMenu){
        selectedModel = (selectedModel + 1) % models.length;
      }else if(showSettingsMenu){
        const settings = getSettingsList();
        const item = settings[Math.max(0, Math.min(selectedSetting, settings.length - 1))];
        applySetting(item, 1);
        setStatusBeta(`${item ? item.key : 'Setting'} updated.`);
        needsRender = true;
      }else{
        moveCursor(1);
      }
      needsRender = true;
      i += 3;
      continue;
    }

    if(slice.startsWith('\x1b[D')){
      if(showModelMenu){
        selectedModel = (selectedModel + models.length - 1) % models.length;
      }else if(showSettingsMenu){
        const settings = getSettingsList();
        const item = settings[Math.max(0, Math.min(selectedSetting, settings.length - 1))];
        applySetting(item, -1);
        setStatusBeta(`${item ? item.key : 'Setting'} updated.`);
        needsRender = true;
      }else{
        moveCursor(-1);
      }
      needsRender = true;
      i += 3;
      continue;
    }

    if(slice.startsWith('\x1b[H')){
      if(!showModelMenu){
        inputCursor = 0;
        needsRender = true;
      }
      i += 3;
      continue;
    }

    if(slice.startsWith('\x1b[1~')){
      if(!showModelMenu){
        inputCursor = 0;
        needsRender = true;
      }
      i += 4;
      continue;
    }

    if(slice.startsWith('\x1b[F')){
      if(!showModelMenu){
        inputCursor = inputBuffer.length;
        needsRender = true;
      }
      i += 3;
      continue;
    }

    if(slice.startsWith('\x1b[4~')){
      if(!showModelMenu){
        inputCursor = inputBuffer.length;
        needsRender = true;
      }
      i += 4;
      continue;
    }

    if(slice.startsWith('\x1b[5~')){
      adjustLogScroll(3);
      needsRender = true;
      i += 4;
      continue;
    }

    if(slice.startsWith('\x1b[6~')){
      adjustLogScroll(-3);
      needsRender = true;
      i += 4;
      continue;
    }

    if(slice === '\x1b'){
      if(showCommandMenu || showModelMenu || showHistoryMenu || showSettingsMenu){
        if(showHistoryMenu){
          closeHistoryMenu(true);
        }else if(showSettingsMenu){
          closeSettingsMenu();
        }else{
          closeMenus();
        }
        needsRender = true;
        i += 1;
        continue;
      }
      return cleanup();
    }

    if(slice[0] === '\x1b'){
      i += 1;
      continue;
    }

    const ch = slice[0];
    if(ch === '\u000c'){ // Ctrl+L
      logLines = [];
      logScroll = 0;
      scheduleSave();
      setStatusBeta('Log cleared.');
      needsRender = true;
      i += 1;
      continue;
    }

    if(ch === '\u000b'){ // Ctrl+K
      deleteToEnd();
      updateCommandMenuFromInput();
      updateHistoryMenuFromInput();
      needsRender = true;
      i += 1;
      continue;
    }

    if(ch === '\u0015'){ // Ctrl+U
      deleteToStart();
      updateCommandMenuFromInput();
      updateHistoryMenuFromInput();
      needsRender = true;
      i += 1;
      continue;
    }

    if(ch === '\u0017'){ // Ctrl+W
      deletePrevWord();
      updateCommandMenuFromInput();
      updateHistoryMenuFromInput();
      needsRender = true;
      i += 1;
      continue;
    }

    if(ch === '\u0012'){ // Ctrl+R
      openHistoryMenu('');
      needsRender = true;
      i += 1;
      continue;
    }
    if(ch === '\t'){
      if(!showModelMenu && !showHistoryMenu && inputBuffer.startsWith('/')){
        if(!showCommandMenu) openMenu();
        if(autocompleteCommand()){
          needsRender = true;
        }
      }
      i += 1;
      continue;
    }
    if(ch === '\r' || ch === '\n'){
      if(showCommandMenu || showModelMenu || showSettingsMenu){
        executeMenuCommand();
      }else{
        submitInput();
      }
      needsRender = true;
      i += 1;
      continue;
    }

    if(ch === '\x7f' || ch === '\b'){
      if(!showModelMenu){
        if(showHistoryMenu && inputBuffer.length === 0){
          closeHistoryMenu(true);
        }else{
          deleteBackward();
          updateCommandMenuFromInput();
          updateHistoryMenuFromInput();
        }
        needsRender = true;
      }
      i += 1;
      continue;
    }

    if(ch === '/'){
      if(!showModelMenu){
        insertText('/');
        if(!showCommandMenu && !showHistoryMenu && !showSettingsMenu){
          openMenu();
        }
        updateCommandMenuFromInput();
        updateHistoryMenuFromInput();
        needsRender = true;
      }
      i += 1;
      continue;
    }

    if(ch >= ' '){
      if(!showModelMenu){
        insertText(ch);
        updateCommandMenuFromInput();
        updateHistoryMenuFromInput();
        needsRender = true;
      }
      i += 1;
      continue;
    }

    i += 1;
  }

  if(animationJustRendered){
    animationJustRendered = false;
    return;
  }
  if(needsRender) requestRender(false);
});
