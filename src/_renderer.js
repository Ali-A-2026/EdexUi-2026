// Disable eval()
window.eval = global.eval = function () {
    throw new Error("eval() is disabled for security reasons.");
};
// Security helper :)
window._escapeHtml = text => {
    let map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => {return map[m];});
};
window._encodePathURI = uri => {
    return encodeURI(uri).replace(/#/g, "%23");
};
window._purifyCSS = str => {
    if (typeof str === "undefined") return "";
    if (typeof str !== "string") {
        str = str.toString();
    }
    return str.replace(/[<]/g, "");
};
window._delay = ms => {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    });
};
window._normalizeFontAssetName = name => {
    if (typeof name !== "string") return "";
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
};
window._resolveFontAssetPath = fontName => {
    if (typeof fontName !== "string" || !fontName.trim()) return null;

    const normalizedName = window._normalizeFontAssetName(fontName);
    const supportedExtensions = [".woff2", ".woff", ".ttf", ".otf"];

    for (const extension of supportedExtensions) {
        const exactPath = path.join(fontsDir, normalizedName + extension);
        if (fs.existsSync(exactPath)) return exactPath;
    }

    const availableFonts = fs.existsSync(fontsDir) ? fs.readdirSync(fontsDir) : [];
    const matchingFont = availableFonts.find(file => {
        const fileExtension = path.extname(file).toLowerCase();
        if (!supportedExtensions.includes(fileExtension)) return false;
        return window._normalizeFontAssetName(path.basename(file, fileExtension)) === normalizedName;
    });

    return matchingFont ? path.join(fontsDir, matchingFont) : null;
};
window._loadThemeFont = async fontName => {
    const fontPath = window._resolveFontAssetPath(fontName);
    if (!fontPath) return false;

    try {
        const fontFace = new FontFace(fontName, `url("${pathToFileURL(fontPath).href}")`);
        const loadedFont = await fontFace.load();
        document.fonts.add(loadedFont);
        await document.fonts.load(`12px "${fontName}"`);
        return true;
    } catch (error) {
        console.warn(`Failed to load theme font "${fontName}" from ${fontPath}:`, error);
        return false;
    }
};
window.openExternalPath = targetPath => {
    electron.shell.openPath(targetPath);
    electronWin.minimize();
};
window.openExternalUrl = targetUrl => {
    electron.shell.openExternal(targetUrl);
    electronWin.minimize();
};
window.hideReleaseUpdateNotice = () => {
    const notice = document.getElementById("main_shell_update_notice");
    if (!notice) return;
    notice.classList.remove("visible");
    notice.innerHTML = "";
};
window.showReleaseUpdateNotice = release => {
    const notice = document.getElementById("main_shell_update_notice");
    if (!notice || !release) return;

    const safeTag = window._escapeHtml(release.tag_name || "new release");
    const safeName = window._escapeHtml(release.name || release.tag_name || "Latest release");
    const releaseUrl = release.html_url || `https://github.com/Ali-A-2026/EdexUi-2026/releases/latest`;

    notice.innerHTML = `
        <span>NEW RELEASE</span>
        <strong>${safeTag}</strong>
        <small>${safeName}</small>
        <div>
            <button onclick="window.openExternalUrl(${JSON.stringify(releaseUrl)})">UPDATE</button>
            <button onclick="window.hideReleaseUpdateNotice()">CANCEL</button>
        </div>
    `;
    notice.classList.add("visible");
};
window.openFontPreview = async (fontPath, fontName) => {
    const previewFamily = `EdexPreview_${Date.now()}`;
    let previewStyle = `font-family: "${window._escapeHtml(fontName)}", var(--font_main), sans-serif;`;

    try {
        const previewFace = new FontFace(previewFamily, `url("${pathToFileURL(fontPath).href}")`);
        const loadedFace = await previewFace.load();
        document.fonts.add(loadedFace);
        previewStyle = `font-family: "${previewFamily}", "${window._escapeHtml(fontName)}", var(--font_main), sans-serif;`;
    } catch (error) {
        console.warn(`Could not preview font "${fontName}" from ${fontPath}:`, error);
    }

    window.keyboard.detach();
    new Modal({
        type: "custom",
        title: `Font Preview <i>${window._escapeHtml(fontName)}</i>`,
        html: `<div style="padding:1vh 0;">
                <p><strong>File:</strong> ${window._escapeHtml(path.basename(fontPath))}</p>
                <div style="${previewStyle} font-size:3.2vh; line-height:1.5; margin-top:1.5vh;">
                    <p>THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG</p>
                    <p>the quick brown fox jumps over the lazy dog</p>
                    <p>0123456789 !@#$%^&*() [] {} &lt;&gt; ? / \\</p>
                </div>
            </div>`,
        buttons: [
            {label: "Open Externally", action: `window.openExternalPath(${JSON.stringify(fontPath)})`}
        ]
    }, () => {
        window.keyboard.attach();
        window.term[window.currentTerm].term.focus();
    });
};

// Initiate basic error handling
window.onerror = (msg, path, line, col, error) => {
    document.getElementById("boot_screen").innerHTML += `${error} :  ${msg}<br/>==> at ${path}  ${line}:${col}`;
};

const path = require("path");
const fs = require("fs");
const childProcess = require("child_process");
const { pathToFileURL } = require("url");
const electron = require("electron");
const remote = require("@electron/remote");
const ipc = electron.ipcRenderer;
electron.remote = remote;

window.frontendPaintNotified = false;
window.notifyFrontendPaint = () => {
    if (window.frontendPaintNotified) return;
    window.frontendPaintNotified = true;
    ipc.send("frontend-painted");
};
window.notifyFrontendReady = () => {
    ipc.send("frontend-ready");
    if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(window.notifyFrontendPaint);
        });
    } else {
        setTimeout(window.notifyFrontendPaint, 0);
    }
};
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", window.notifyFrontendReady, { once: true });
} else {
    window.notifyFrontendReady();
}

const settingsDir = remote.app.getPath("userData");
const themesDir = path.join(settingsDir, "themes");
const keyboardsDir = path.join(settingsDir, "keyboards");
const fontsDir = path.join(settingsDir, "fonts");
const settingsFile = path.join(settingsDir, "settings.json");
const shortcutsFile = path.join(settingsDir, "shortcuts.json");
const lastWindowStateFile = path.join(settingsDir, "lastWindowState.json");
const unsupportedKeyboardLayouts = new Set([
    "en-WORKMAN"
]);

// Load config
window.settings = require(settingsFile);
window.shortcuts = require(shortcutsFile);
window.lastWindowState = require(lastWindowStateFile);
window._getSafeKeyboardLayout = layoutName => {
    const requestedLayout = typeof layoutName === "string" && layoutName.trim() ? layoutName.trim() : "en-US";
    if (unsupportedKeyboardLayouts.has(requestedLayout)) return "en-US";

    const layoutPath = path.join(keyboardsDir, `${requestedLayout}.json`);
    return fs.existsSync(layoutPath) ? requestedLayout : "en-US";
};
window.settings.keyboard = window._getSafeKeyboardLayout(window.settings.keyboard);

// Load CLI parameters
if (remote.process.argv.includes("--nointro")) {
    window.settings.nointroOverride = true;
} else {
    window.settings.nointroOverride = false;
}
if (electron.remote.process.argv.includes("--nocursor")) {
    window.settings.nocursorOverride = true;
} else {
    window.settings.nocursorOverride = false;
}

// Retrieve theme override (hotswitch)
ipc.once("getThemeOverride", (e, theme) => {
    if (theme !== null) {
        window.settings.theme = theme;
        window.settings.nointroOverride = true;
        _loadTheme(require(path.join(themesDir, window.settings.theme+".json")));
    } else {
        _loadTheme(require(path.join(themesDir, window.settings.theme+".json")));
    }
});
ipc.send("getThemeOverride");
// Same for keyboard override/hotswitch
ipc.once("getKbOverride", (e, layout) => {
    if (layout !== null) {
        window.settings.keyboard = layout;
        window.settings.nointroOverride = true;
    }
});
ipc.send("getKbOverride");

// Load UI theme
window._loadTheme = async theme => {

    if (document.querySelector("style.theming")) {
        document.querySelector("style.theming").remove();
    }

    await Promise.allSettled([
        window._loadThemeFont(theme.cssvars.font_main),
        window._loadThemeFont(theme.cssvars.font_main_light),
        window._loadThemeFont(theme.terminal.fontFamily)
    ]);

    document.querySelector("head").innerHTML += `<style class="theming">
    :root {
        --font_main: "${window._purifyCSS(theme.cssvars.font_main)}";
        --font_main_light: "${window._purifyCSS(theme.cssvars.font_main_light)}";
        --font_mono: "${window._purifyCSS(theme.terminal.fontFamily)}";
        --color_r: ${window._purifyCSS(theme.colors.r)};
        --color_g: ${window._purifyCSS(theme.colors.g)};
        --color_b: ${window._purifyCSS(theme.colors.b)};
        --color_black: ${window._purifyCSS(theme.colors.black)};
        --color_light_black: ${window._purifyCSS(theme.colors.light_black)};
        --color_grey: ${window._purifyCSS(theme.colors.grey)};

        /* Used for error and warning modals */
        --color_red: ${window._purifyCSS(theme.colors.red) || "red"};
        --color_yellow: ${window._purifyCSS(theme.colors.yellow) || "yellow"};
    }

    body {
        font-family: var(--font_main), sans-serif;
        cursor: ${(window.settings.nocursorOverride || window.settings.nocursor) ? "none" : "default"} !important;
    }

    * {
   	   ${(window.settings.nocursorOverride || window.settings.nocursor) ? "cursor: none !important;" : ""}
	}

    ${window._purifyCSS(theme.injectCSS || "")}
    </style>`;

    window.theme = theme;
    window.theme.r = theme.colors.r;
    window.theme.g = theme.colors.g;
    window.theme.b = theme.colors.b;
};

function initGraphicalErrorHandling() {
    window.edexErrorsModals = [];
    window.onerror = (msg, path, line, col, error) => {
        let errorModal = new Modal({
            type: "error",
            title: error,
            message: `${msg}<br/>        at ${path}  ${line}:${col}`
        });
        window.edexErrorsModals.push(errorModal);

        ipc.send("log", "error", `${error}: ${msg}`);
        ipc.send("log", "debug", `at ${path} ${line}:${col}`);
    };
}

function waitForFonts() {
    return new Promise(resolve => {
        if (document.readyState !== "complete" || document.fonts.status !== "loaded") {
            document.addEventListener("readystatechange", () => {
                if (document.readyState === "complete") {
                    if (document.fonts.status === "loaded") {
                        resolve();
                    } else {
                        document.fonts.onloadingdone = () => {
                            if (document.fonts.status === "loaded") resolve();
                        };
                    }
                }
            });
        } else {
            resolve();
        }
    });
}

// A proxy function used to add multithreading to systeminformation calls - see backend process manager @ _multithread.js
function initSystemInformationProxy() {
    const { nanoid } = require("nanoid/non-secure");

    window.si = new Proxy({}, {
        apply: () => {throw new Error("Cannot use sysinfo proxy directly as a function")},
        set: () => {throw new Error("Cannot set a property on the sysinfo proxy")},
        get: (target, prop, receiver) => {
            return function(...args) {
                let callback = (typeof args[args.length - 1] === "function") ? true : false;

                return new Promise((resolve, reject) => {
                    let id = nanoid();
                    ipc.once("systeminformation-reply-"+id, (e, res) => {
                        if (callback) {
                            args[args.length - 1](res);
                        }
                        resolve(res);
                    });
                    ipc.send("systeminformation-call", prop, id, ...args);
                });
            };
        }
    });
}

// Init audio
window.audioManager = new AudioManager();

// See #223
electron.remote.app.focus();

let i = 0;
if (window.settings.nointro || window.settings.nointroOverride) {
    initGraphicalErrorHandling();
    initSystemInformationProxy();
    document.getElementById("boot_screen").remove();
    document.body.setAttribute("class", "");
    waitForFonts().then(initUI);
} else {
    displayLine();
}

// Startup boot log
function displayLine() {
    let bootScreen = document.getElementById("boot_screen");
    let log = fs.readFileSync(path.join(__dirname, "assets", "misc", "boot_log.txt")).toString().split('\n');

    function isArchUser() {
        return require("os").platform() === "linux"
                && fs.existsSync("/etc/os-release")
                && fs.readFileSync("/etc/os-release").toString().includes("arch");
    }

    if (typeof log[i] === "undefined") {
        setTimeout(displayTitleScreen, 300);
        return;
    }

    if (log[i] === "Boot Complete") {
        window.audioManager.granted.play();
    } else {
        window.audioManager.stdout.play();
    }
    bootScreen.innerHTML += log[i]+"<br/>";
    i++;

    switch(true) {
        case i === 2:
            bootScreen.innerHTML += `EdexUi-2026 Kernel version ${electron.remote.app.getVersion()} boot at ${Date().toString()}; root:xnu-1699.22.73~1/RELEASE_X86_64`;
        case i === 4:
            setTimeout(displayLine, 500);
            break;
        case i > 4 && i < 25:
            setTimeout(displayLine, 30);
            break;
        case i === 25:
            setTimeout(displayLine, 400);
            break;
        case i === 42:
            setTimeout(displayLine, 300);
            break;
        case i > 42 && i < 82:
            setTimeout(displayLine, 25);
            break;
        case i === 83:
            if (isArchUser())
                bootScreen.innerHTML += "btw i use arch<br/>";
            setTimeout(displayLine, 25);
            break;
        case i >= log.length-2 && i < log.length:
            setTimeout(displayLine, 300);
            break;
        default:
            setTimeout(displayLine, Math.pow(1 - (i/1000), 3)*25);
    }
}

// Show "logo" and background grid
async function displayTitleScreen() {
    let bootScreen = document.getElementById("boot_screen");
    if (bootScreen === null) {
        bootScreen = document.createElement("section");
        bootScreen.setAttribute("id", "boot_screen");
        bootScreen.setAttribute("style", "z-index: 9999999");
        document.body.appendChild(bootScreen);
    }
    bootScreen.innerHTML = "";
    window.audioManager.theme.play();

    await _delay(450);

    document.body.setAttribute("class", "");
    bootScreen.setAttribute("class", "center");
    bootScreen.innerHTML = "<h1>EdexUi-2026</h1>";
    let title = document.querySelector("section > h1");

    await _delay(220);

    document.body.setAttribute("class", "solidBackground");

    await _delay(120);

    title.setAttribute("style", `background-color: rgb(${window.theme.r}, ${window.theme.g}, ${window.theme.b});border-bottom: 5px solid rgb(${window.theme.r}, ${window.theme.g}, ${window.theme.b});`);

    await _delay(340);

    title.setAttribute("style", `border: 5px solid rgb(${window.theme.r}, ${window.theme.g}, ${window.theme.b});`);

    await _delay(120);

    title.setAttribute("style", "");
    title.setAttribute("class", "glitch");

    await _delay(540);

    document.body.setAttribute("class", "");
    title.setAttribute("class", "");
    title.setAttribute("style", `border: 5px solid rgb(${window.theme.r}, ${window.theme.g}, ${window.theme.b});`);

    await _delay(1100);
    initGraphicalErrorHandling();
    initSystemInformationProxy();
    waitForFonts().then(() => {
        bootScreen.remove();
        initUI();
    });
}

// Returns the user's desired display name
async function getDisplayName() {
    let user = settings.username || null;
    if (user)
        return user;

    try {
        user = await require("username")();
    } catch (e) {}

    return user;
}

// Create the UI's html structure and initialize the terminal client and the keyboard
async function initUI() {
    document.title = "EdexUi-2026";
    document.body.innerHTML += `<section class="mod_column" id="mod_column_left">
        <h3 class="title"><p>PANEL</p><p>SYSTEM</p></h3>
    </section>
    <section id="main_shell" style="height:0%;width:0%;opacity:0;margin-bottom:30vh;" augmented-ui="bl-clip tr-clip exe">
        <h3 class="title" style="opacity:0;"><p>TERMINAL</p><p>EdexUi-2026</p></h3>
        <h1 id="main_shell_greeting"></h1>
    </section>
    <section class="mod_column" id="mod_column_right">
        <h3 class="title"><p>PANEL</p><p>NETWORK</p></h3>
    </section>`;

    await _delay(10);

    window.audioManager.expand.play();
    document.getElementById("main_shell").setAttribute("style", "height:0%;margin-bottom:30vh;");

    await _delay(500);

    document.getElementById("main_shell").setAttribute("style", "margin-bottom: 30vh;");
    document.querySelector("#main_shell > h3.title").setAttribute("style", "");

    await _delay(700);

    document.getElementById("main_shell").setAttribute("style", "opacity: 0;");
    document.body.innerHTML += `
    <section id="filesystem" style="width: 0px;" class="${window.settings.hideDotfiles ? "hideDotfiles" : ""} ${window.settings.fsListView ? "list-view" : ""}">
    </section>
    <section id="keyboard" style="opacity:0;">
    </section>`;
    window.keyboard = new Keyboard({
        layout: path.join(keyboardsDir, window._getSafeKeyboardLayout(settings.keyboard)+".json"),
        container: "keyboard"
    });

    await _delay(10);

    document.getElementById("main_shell").setAttribute("style", "");

    await _delay(270);

    let greeter = document.getElementById("main_shell_greeting");

    getDisplayName().then(user => {
        if (user) {
            greeter.innerHTML += `Welcome back, <em>${user}</em>`;
        } else {
            greeter.innerHTML += "Welcome back";
        }
    });

    greeter.setAttribute("style", "opacity: 1;");

    document.getElementById("filesystem").setAttribute("style", "");
    document.getElementById("keyboard").setAttribute("style", "");
    document.getElementById("keyboard").setAttribute("class", "animation_state_1");
    window.audioManager.keyboard.play();

    await _delay(100);

    document.getElementById("keyboard").setAttribute("class", "animation_state_1 animation_state_2");

    await _delay(1000);

    greeter.setAttribute("style", "opacity: 0;");

    await _delay(100);

    document.getElementById("keyboard").setAttribute("class", "");

    await _delay(400);

    greeter.remove();

    // Initialize modules
    window.mods = {};

    // Left column
    window.mods.clock = new Clock("mod_column_left");
    window.mods.sysinfo = new Sysinfo("mod_column_left");
    window.mods.hardwareInspector = new HardwareInspector("mod_column_left");
    window.mods.cpuinfo = new Cpuinfo("mod_column_left");
    window.mods.ramwatcher = new RAMwatcher("mod_column_left");
    window.mods.toplist = new Toplist("mod_column_left");

    // Right column
    window.mods.netstat = new Netstat("mod_column_right");
    window.mods.globe = new LocationGlobe("mod_column_right");
    window.mods.conninfo = new Conninfo("mod_column_right");

    // Fade-in animations
    document.querySelectorAll(".mod_column").forEach(e => {
        e.setAttribute("class", "mod_column activated");
    });
    let i = 0;
    let left = document.querySelectorAll("#mod_column_left > div");
    let right = document.querySelectorAll("#mod_column_right > div");
    let x = setInterval(() => {
        if (!left[i] && !right[i]) {
            clearInterval(x);
        } else {
            window.audioManager.panels.play();
            if (left[i]) {
                left[i].setAttribute("style", "animation-play-state: running;");
            }
            if (right[i]) {
                right[i].setAttribute("style", "animation-play-state: running;");
            }
            i++;
        }
    }, 250);

    await _delay(100);

    // Initialize the terminal
    let shellContainer = document.getElementById("main_shell");
    shellContainer.innerHTML += `
        <div id="shell_quick_actions">
            <button id="shell_files_button" onclick="window.toggleSystemExplorer();">
                <span>SYSTEM FILES</span>
                <strong>OPEN FILE EXPLORER</strong>
            </button>
            <button id="shell_apps_button" onclick="window.toggleAppManager();">
                <span>APP MANAGER</span>
                <strong>OPEN INSTALLED APPS</strong>
            </button>
        </div>
        <div id="main_shell_update_notice"></div>
        <div id="shell_panel_overlay"></div>
        <ul id="main_shell_tabs">
            <li id="shell_tab0" onclick="window.focusShellTab(0);" class="active"><p>Main</p></li>
            <li id="shell_tab1" onclick="window.focusShellTab(1);"><p>1</p></li>
            <li id="shell_tab2" onclick="window.focusShellTab(2);"><p>2</p></li>
            <li id="shell_tab3" onclick="window.focusShellTab(3);"><p>3</p></li>
            <li id="shell_tab4" onclick="window.focusShellTab(4);"><p>4</p></li>
        </ul>
        <div id="main_shell_innercontainer">
            <pre id="terminal0" class="active"></pre>
            <pre id="terminal1"></pre>
            <pre id="terminal2"></pre>
            <pre id="terminal3"></pre>
            <pre id="terminal4"></pre>
        </div>`;
    if (typeof window.updateSystemExplorerButton === "function") {
        window.updateSystemExplorerButton();
    }
    window.term = {
        0: new Terminal({
            role: "client",
            parentId: "terminal0",
            port: window.settings.port || 3000
        })
    };
    for (let i = 1; i <= 4; i++) {
        window.term[i] = false;
    }
    window.currentTerm = 0;
    window.getShellTabLabel = number => (number === 0 ? "Main" : String(number));
    window.setShellTabLabel = number => {
        const tab = document.getElementById(`shell_tab${number}`);
        if (!tab) return;
        tab.innerHTML = `<p>${window.getShellTabLabel(number)}</p>`;
    };
    for (let tabNumber = 0; tabNumber <= 4; tabNumber++) {
        window.setShellTabLabel(tabNumber);
    }
    window.termLoading = {};
    window.pendingTermActivation = {};
    window.prewarmShellTabsPromise = null;
    window.shellTabsPrewarmStarted = false;
    if (typeof window.term[0].enableHardwareAcceleration === "function") {
        window.term[0].enableHardwareAcceleration();
    }
    window.term[0].onprocesschange = () => {
        window.setShellTabLabel(0);
    };
    const startShellTabPrewarm = () => {
        if (window.shellTabsPrewarmStarted) return;
        window.shellTabsPrewarmStarted = true;
        window.prewarmShellTabsPromise = window.prewarmShellTabs().catch(error => {
            console.warn("Shell tab prewarm failed:", error);
            return null;
        });
    };
    if (window.term[0].isReady) {
        setTimeout(startShellTabPrewarm, 50);
    } else {
        const previousMainTermReady = window.term[0].onready;
        window.term[0].onready = () => {
            if (typeof previousMainTermReady === "function") previousMainTermReady();
            setTimeout(startShellTabPrewarm, 50);
        };
    }
    // Prevent losing hardware keyboard focus on the terminal when using touch keyboard
    window.onmouseup = e => {
        if (window.keyboard.linkedToTerm) window.term[window.currentTerm].term.focus();
    };
    window.term[0].term.writeln("\033[1m"+`Welcome to EdexUi-2026 v${electron.remote.app.getVersion()} - Electron v${process.versions.electron}`+"\033[0m");

    await _delay(100);

    window.fsDisp = new FilesystemDisplay({
        parentId: "filesystem",
        rootPath: settingsDir
    });

    await _delay(200);

    document.getElementById("filesystem").setAttribute("style", "opacity: 1;");

    // Resend terminal CWD to fsDisp if we're hot reloading
    if (window.performance.navigation.type === 1) {
        window.term[window.currentTerm].resendCWD();
    }

    await _delay(200);

    if (!window.shellTabsPrewarmStarted) {
        setTimeout(() => {
            if (!window.shellTabsPrewarmStarted) {
                window.shellTabsPrewarmStarted = true;
                window.prewarmShellTabsPromise = window.prewarmShellTabs().catch(error => {
                    console.warn("Shell tab prewarm failed:", error);
                    return null;
                });
            }
        }, 50);
    }

    if (!window.settings.disableUpdateCheck) {
        setTimeout(() => {
            window.updateCheck = new UpdateChecker();
        }, 8000);
    }

    setTimeout(() => {
        window.primeAppManagerIndex();
        window.primeSystemExplorerIndex();
        if (typeof window.warmSettingsEditorCache === "function") {
            window.warmSettingsEditorCache();
        }
    }, 250);
}

window.themeChanger = theme => {
    ipc.send("setThemeOverride", theme);
    setTimeout(() => {
        window.location.reload(true);
    }, 100);
};

window.remakeKeyboard = layout => {
    const safeLayout = window._getSafeKeyboardLayout(layout || settings.keyboard);
    document.getElementById("keyboard").innerHTML = "";
    window.keyboard = new Keyboard({
        layout: path.join(keyboardsDir, safeLayout+".json"),
        container: "keyboard"
    });
    window.settings.keyboard = safeLayout;
    ipc.send("setKbOverride", safeLayout);
};

window.appManager = {
    apps: [],
    filteredApps: [],
    selectedAppId: null,
    modalId: null,
    installedAppsLoaded: false,
    launchResultBound: false,
    loading: false,
    loadingPromise: null
};
window.appManagerSearchTimer = null;
window.primeAppManagerIndex = () => {
    if (window.appManager.installedAppsLoaded || window.appManager.loadingPromise) return;

    window.appManager.loading = true;
    window.appManager.loadingPromise = new Promise((resolve, reject) => {
        ipc.once("appManager:installedApps", (_event, payload) => {
            window.appManager.loading = false;
            window.appManager.loadingPromise = null;
            if (payload && payload.error) {
                console.warn("App Manager preload failed:", payload.error);
                reject(new Error(payload.error));
                return;
            }
            window.appManager.apps = payload || [];
            window.appManager.installedAppsLoaded = true;
            resolve(window.appManager.apps);
        });
        ipc.send("appManager:getInstalledApps");
    });
};
window.updateAppManagerSearch = query => {
    if (window.appManagerSearchTimer) {
        clearTimeout(window.appManagerSearchTimer);
    }
    window.appManagerSearchTimer = setTimeout(() => {
        window.renderAppManagerList(query || "");
    }, 50);
};
window.shellOverlay = {
    mode: null
};
window.getShellOverlayElement = () => {
    return document.getElementById("shell_panel_overlay");
};
window.positionShellOverlay = () => {
    const overlay = window.getShellOverlayElement();
    const shell = document.getElementById("main_shell");
    if (!overlay || !shell) return;

    const shellRect = shell.getBoundingClientRect();
    const quickActions = document.getElementById("shell_quick_actions");
    const updateNotice = document.getElementById("main_shell_update_notice");
    let overlayTop = 0;

    if (quickActions) {
        const quickRect = quickActions.getBoundingClientRect();
        overlayTop = Math.max(overlayTop, quickRect.bottom - shellRect.top);
    }
    if (updateNotice && updateNotice.offsetHeight > 0) {
        const noticeRect = updateNotice.getBoundingClientRect();
        overlayTop = Math.max(overlayTop, noticeRect.bottom - shellRect.top);
    }

    overlay.style.top = `${Math.round(overlayTop + 6)}px`;
    overlay.style.left = "8px";
    overlay.style.right = "8px";
    overlay.style.bottom = "8px";
};
window.closeShellOverlay = () => {
    const overlay = window.getShellOverlayElement();
    if (!overlay) return;

    overlay.classList.remove("visible");
    overlay.innerHTML = "";
    window.shellOverlay.mode = null;
    window.appManager.modalId = null;
    window.systemExplorer.modalId = null;
    window.updateAppManagerButton();
    window.updateSystemExplorerButton();
    window.keyboard.attach();
    if (window.term[window.currentTerm] && window.term[window.currentTerm].term) {
        window.term[window.currentTerm].term.focus();
    }
};
window.openShellOverlay = (mode, html, onready) => {
    const overlay = window.getShellOverlayElement();
    if (!overlay) return;

    if (window.shellOverlay.mode && window.shellOverlay.mode !== mode) {
        window.closeShellOverlay();
    }

    window.keyboard.detach();
    overlay.innerHTML = `<div id="shell_panel_overlay_inner">${html}</div>`;
    overlay.classList.add("visible");
    window.positionShellOverlay();
    window.shellOverlay.mode = mode;
    window.appManager.modalId = mode === "appManager" ? "shell_overlay" : null;
    window.systemExplorer.modalId = mode === "systemExplorer" ? "shell_overlay" : null;
    window.updateAppManagerButton();
    window.updateSystemExplorerButton();

    if (typeof onready === "function") {
        onready();
    }
};
window.updateAppManagerButton = () => {
    const button = document.getElementById("shell_apps_button");
    if (!button) return;

    const modalIsOpen = Boolean(
        window.appManager.modalId !== null
        && window.modals
        && window.modals[window.appManager.modalId]
    );
    const overlayIsOpen = window.shellOverlay.mode === "appManager";
    const isOpen = modalIsOpen || overlayIsOpen;
    button.classList.toggle("active", isOpen);
    button.innerHTML = isOpen
        ? `<span>APP MANAGER</span><strong>CLOSE INSTALLED APPS</strong>`
        : `<span>APP MANAGER</span><strong>OPEN INSTALLED APPS</strong>`;
};
window._resolveSystemExplorerRoot = () => {
    const downloadsPath = remote.app.getPath("downloads");
    if (downloadsPath && fs.existsSync(downloadsPath)) {
        return downloadsPath;
    }
    return remote.app.getPath("home");
};
window.systemExplorer = {
    modalId: null,
    rootDir: window._resolveSystemExplorerRoot(),
    currentPath: window._resolveSystemExplorerRoot(),
    entries: [],
    searchQuery: "",
    lastError: null,
    searchTimer: null,
    cache: new Map(),
    cacheTtlMs: 4000,
    priming: false
};
window.getSystemExplorerCached = targetPath => {
    const cached = window.systemExplorer.cache.get(targetPath);
    if (!cached) return null;
    if ((Date.now() - cached.timestamp) > window.systemExplorer.cacheTtlMs) {
        window.systemExplorer.cache.delete(targetPath);
        return null;
    }
    return {
        path: cached.path,
        entries: cached.entries.map(entry => ({...entry}))
    };
};
window.setSystemExplorerCache = result => {
    if (!result || !result.path || !Array.isArray(result.entries)) return;
    window.systemExplorer.cache.set(result.path, {
        path: result.path,
        entries: result.entries.map(entry => ({...entry})),
        timestamp: Date.now()
    });
};
window.prefetchSystemExplorerChildren = (entries = []) => {
    const folderPaths = entries
        .filter(entry => entry.kind === "folder")
        .slice(0, 10)
        .map(entry => entry.path);
    if (!folderPaths.length) return;

    let index = 0;
    const step = () => {
        if (index >= folderPaths.length) return;
        window.readSystemExplorerEntries(folderPaths[index], { forceRefresh: false, silent: true });
        index += 1;
        setTimeout(step, 45);
    };
    setTimeout(step, 45);
};
window.primeSystemExplorerIndex = () => {
    if (window.systemExplorer.priming) return;
    window.systemExplorer.priming = true;
    setTimeout(() => {
        try {
            const rootResult = window.readSystemExplorerEntries(window.systemExplorer.rootDir, { forceRefresh: false, silent: true });
            window.prefetchSystemExplorerChildren(rootResult.entries);
        } finally {
            setTimeout(() => {
                window.systemExplorer.priming = false;
            }, 600);
        }
    }, 0);
};
window._resolveSystemExplorerPath = targetPath => {
    const rootPath = path.resolve(window.systemExplorer.rootDir);
    const resolvedPath = path.resolve(targetPath || rootPath);
    if (resolvedPath === rootPath || resolvedPath.startsWith(rootPath + path.sep)) {
        return resolvedPath;
    }
    return rootPath;
};
window.detectSystemExplorerName = () => {
    if (process.platform !== "linux") return "System File Explorer";

    try {
        const desktopEntry = childProcess.execFileSync("xdg-mime", ["query", "default", "inode/directory"], {
            encoding: "utf8"
        }).trim();
        const fallbackName = desktopEntry
            ? desktopEntry.replace(/\.desktop$/i, "").replace(/[-_]+/g, " ")
            : "System File Explorer";
        if (!desktopEntry) return fallbackName;

        const desktopPaths = [
            path.join(remote.app.getPath("home"), ".local/share/applications", desktopEntry),
            path.join("/usr/local/share/applications", desktopEntry),
            path.join("/usr/share/applications", desktopEntry)
        ];
        const desktopPath = desktopPaths.find(candidate => fs.existsSync(candidate));
        if (!desktopPath) return fallbackName;

        const nameLine = fs.readFileSync(desktopPath, "utf8").split(/\r?\n/).find(line => line.startsWith("Name="));
        return nameLine ? nameLine.slice(5).trim() : fallbackName;
    } catch (error) {
        console.warn("Could not detect system file explorer:", error);
        return "System File Explorer";
    }
};
window.updateSystemExplorerButton = () => {
    const button = document.getElementById("shell_files_button");
    if (!button) return;

    const isOpen = window.shellOverlay.mode === "systemExplorer";
    button.classList.toggle("active", isOpen);
    button.disabled = false;
    button.innerHTML = isOpen
        ? `<span>SYSTEM FILES</span><strong>CLOSE FILE EXPLORER</strong>`
        : `<span>SYSTEM FILES</span><strong>OPEN FILE EXPLORER</strong>`;
};
window._formatSystemExplorerSize = size => {
    if (typeof size !== "number" || Number.isNaN(size)) return "--";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};
window.readSystemExplorerEntries = (targetPath, options = {}) => {
    const { forceRefresh = false, silent = false } = options;
    const safeTargetPath = window._resolveSystemExplorerPath(targetPath || window.systemExplorer.rootDir);
    if (!forceRefresh) {
        const cached = window.getSystemExplorerCached(safeTargetPath);
        if (cached) return cached;
    }
    let names = [];
    try {
        names = fs.readdirSync(safeTargetPath);
    } catch (error) {
        if (!silent) {
            console.warn("Could not read system explorer path:", error);
        }
        return {
            path: safeTargetPath,
            entries: [],
            error: error.message || "Could not read this folder."
        };
    }

    const entries = names.map(name => {
        const entryPath = path.join(safeTargetPath, name);
        let stats = null;
        try {
            stats = fs.lstatSync(entryPath);
        } catch (error) {
            return null;
        }

        const isDirectory = stats.isDirectory();
        return {
            name,
            path: entryPath,
            kind: isDirectory ? "folder" : "file",
            size: isDirectory ? null : stats.size
        };
    }).filter(Boolean);

    entries.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name);
    });

    const result = {
        path: safeTargetPath,
        entries
    };
    window.setSystemExplorerCache(result);
    return result;
};
window.renderSystemExplorerList = () => {
    const list = document.getElementById("systemExplorerList");
    if (!list) return;

    if (window.systemExplorer.lastError) {
        list.innerHTML = `<div class="appManager_empty">${window._escapeHtml(window.systemExplorer.lastError)}</div>`;
        return;
    }

    const query = (window.systemExplorer.searchQuery || "").trim().toLowerCase();
    const visibleEntries = window.systemExplorer.entries.filter(entry => {
        if (!query) return true;
        return entry.name.toLowerCase().includes(query) || entry.path.toLowerCase().includes(query);
    });

    if (!visibleEntries.length) {
        list.innerHTML = `<div class="appManager_empty">${query ? "NO FILES MATCH THIS FILTER" : "THIS FOLDER IS EMPTY"}</div>`;
    } else {
        list.innerHTML = visibleEntries.map(entry => {
            return `
                <button class="appManager_item systemExplorer_item" onclick='window.openSystemExplorerEntry(${JSON.stringify(entry.path)}, ${JSON.stringify(entry.kind)})'>
                    <strong>${window._escapeHtml(entry.name)}</strong>
                    <span>${entry.kind === "folder" ? "Folder" : `File • ${window._escapeHtml(window._formatSystemExplorerSize(entry.size))}`}</span>
                    <small>${window._escapeHtml(entry.path)}</small>
                </button>
            `;
        }).join("");
    }
};
window.updateSystemExplorerSearch = query => {
    if (window.systemExplorer.searchTimer) {
        clearTimeout(window.systemExplorer.searchTimer);
    }
    window.systemExplorer.searchTimer = setTimeout(() => {
        window.systemExplorer.searchQuery = query || "";
        window.renderSystemExplorerList();
    }, 50);
};
window.openSystemExplorerEntry = (entryPath, kind) => {
    if (window.audioManager && window.audioManager.folder) {
        window.audioManager.folder.play();
    }
    if (kind === "folder") {
        window.renderSystemExplorer(entryPath);
        return;
    }
    electron.shell.openPath(entryPath);
};
window.goSystemExplorerBack = () => {
    const parentPath = window._resolveSystemExplorerPath(path.resolve(window.systemExplorer.currentPath || window.systemExplorer.rootDir, ".."));
    if (window.audioManager && window.audioManager.folder) {
        window.audioManager.folder.play();
    }
    if (parentPath === window.systemExplorer.currentPath) return;
    window.renderSystemExplorer(parentPath);
};
window.renderSystemExplorer = targetPath => {
    const result = window.readSystemExplorerEntries(targetPath || window.systemExplorer.currentPath || window.systemExplorer.rootDir, { forceRefresh: false });
    window.systemExplorer.currentPath = result.path;
    window.systemExplorer.entries = result.entries;
    window.systemExplorer.lastError = result.error || null;
    window.systemExplorer.searchQuery = "";
    const rootPath = path.resolve(window.systemExplorer.rootDir);
    const isAtRoot = result.path === rootPath;

    window.openShellOverlay("systemExplorer", `
        <div id="systemExplorer">
            <h2 class="shell_overlay_title">SYSTEM FILES</h2>
            ${isAtRoot ? "" : `<div id="systemExplorerTopControls"><button id="systemExplorerBack" type="button" onclick="window.goSystemExplorerBack()">BACK</button></div>`}
            <input id="systemExplorerSearch" type="text" placeholder="Search files and folders" oninput="window.updateSystemExplorerSearch(this.value)">
            <div id="systemExplorerList" class="appManager_list">
            </div>
        </div>
    `, () => {
        const list = document.getElementById("systemExplorerList");
        if (list) list.scrollTop = 0;
        const searchInput = document.getElementById("systemExplorerSearch");
        if (searchInput) searchInput.value = "";
        window.renderSystemExplorerList();
        window.prefetchSystemExplorerChildren(window.systemExplorer.entries);
    });
};
window.openSystemFileExplorer = targetPath => {
    window.renderSystemExplorer(targetPath || window.systemExplorer.rootDir);
};
window.toggleSystemExplorer = () => {
    if (window.appManager.modalId !== null && window.modals && window.modals[window.appManager.modalId]) {
        window.modals[window.appManager.modalId].close();
    }

    if (window.shellOverlay.mode === "systemExplorer") {
        window.closeShellOverlay();
        return;
    }
    window.openSystemFileExplorer(window.systemExplorer.rootDir);
};
window.renderAppManagerList = query => {
    const list = document.getElementById("appManagerList");
    if (!list) return;

    const search = (query || "").trim().toLowerCase();
    const apps = window.appManager.apps.filter(app => {
        if (!search) return true;
        return app.name.toLowerCase().includes(search)
            || app.id.toLowerCase().includes(search)
            || app.categories.toLowerCase().includes(search);
    });

    window.appManager.filteredApps = apps;
    if (!apps.length) {
        list.innerHTML = `<div class="appManager_empty">NO APPLICATIONS MATCH THIS FILTER</div>`;
        window.appManager.selectedAppId = null;
        return;
    }

    if (!window.appManager.selectedAppId || !apps.some(app => app.id === window.appManager.selectedAppId)) {
        window.appManager.selectedAppId = apps[0].id;
    }

    list.innerHTML = apps.map(app => {
        const encodedAppId = encodeURIComponent(app.id);
        return `
            <button
                class="appManager_item ${app.id === window.appManager.selectedAppId ? "active" : ""}"
                onclick="window.openAppManagerEntry(decodeURIComponent('${encodedAppId}'))">
                <strong>${window._escapeHtml(app.name)}</strong>
                <span>${window._escapeHtml(app.categories || app.exec)}</span>
                <small>${window._escapeHtml(app.terminal ? app.exec : app.id)}</small>
            </button>
        `;
    }).join("");

    const activeItem = list.querySelector(".appManager_item.active");
    if (activeItem) activeItem.scrollIntoView({block: "nearest"});
};

window.selectAppManagerItem = appId => {
    window.appManager.selectedAppId = appId;
    const search = document.getElementById("appManagerSearch");
    window.renderAppManagerList(search ? search.value : "");
};

window.openAppManagerEntry = appId => {
    if (!appId) return;
    window.selectAppManagerItem(appId);
    if (window.audioManager && window.audioManager.folder) {
        window.audioManager.folder.play();
    }
    window.launchSelectedApp();
};

window.launchSelectedApp = () => {
    if (!window.appManager.selectedAppId) return;
    ipc.send("appManager:launch", window.appManager.selectedAppId);
};

window.moveAppManagerSelection = direction => {
    const apps = window.appManager.filteredApps;
    if (!apps.length) return;

    const currentIndex = apps.findIndex(app => app.id === window.appManager.selectedAppId);
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = Math.max(0, Math.min(apps.length - 1, safeIndex + direction));
    window.selectAppManagerItem(apps[nextIndex].id);
};

window.openAppManager = () => {
    window.openShellOverlay("appManager", `
        <div id="appManager">
            <h2 class="shell_overlay_title">APP MANAGER</h2>
            <input id="appManagerSearch" type="text" placeholder="Search installed applications" oninput="window.updateAppManagerSearch(this.value)">
            <div id="appManagerList" class="appManager_list"></div>
        </div>
    `);

    const handleAppsLoaded = payload => {
        if (!document.getElementById("appManagerList")) return;
        if (payload && payload.error) {
            document.getElementById("appManagerList").innerHTML = `<div class="appManager_empty">${window._escapeHtml(payload.error)}</div>`;
            return;
        }
        window.appManager.apps = payload || [];
        window.appManager.installedAppsLoaded = true;
        window.renderAppManagerList("");
        const searchInput = document.getElementById("appManagerSearch");
        if (!searchInput) return;
        searchInput.focus();
        searchInput.addEventListener("keydown", event => {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                window.moveAppManagerSelection(1);
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                window.moveAppManagerSelection(-1);
            } else if (event.key === "Enter") {
                event.preventDefault();
                window.launchSelectedApp();
            } else if (event.key === "Escape" && window.shellOverlay.mode === "appManager") {
                event.preventDefault();
                window.closeShellOverlay();
            }
        });
    };

    if (window.appManager.installedAppsLoaded && window.appManager.apps.length) {
        handleAppsLoaded(window.appManager.apps);
    } else {
        document.getElementById("appManagerList").innerHTML = `<div class="appManager_empty">SCANNING APPLICATION DATABASE...</div>`;
        if (!window.appManager.loadingPromise) {
            window.primeAppManagerIndex();
        }
        Promise.resolve(window.appManager.loadingPromise).then(handleAppsLoaded).catch(() => {});
    }

    ipc.once("appManager:launchResult", (_event, payload) => {
        if (payload.ok) {
            window.audioManager.granted.play();
        } else {
            window.audioManager.denied.play();
        }
    });
};
window.toggleAppManager = () => {
    if (window.shellOverlay.mode === "appManager") {
        window.closeShellOverlay();
        return;
    }

    if (window.appManager.modalId !== null && window.modals && window.modals[window.appManager.modalId]) {
        window.modals[window.appManager.modalId].close();
        return;
    }

    if (window.appManager.modalId !== null && (!window.modals || !window.modals[window.appManager.modalId])) {
        window.appManager.modalId = null;
        window.updateAppManagerButton();
    }

    window.openAppManager();
};

window.setActiveShellTabUI = number => {
    window.currentTerm = number;

    document.querySelectorAll(`ul#main_shell_tabs > li`).forEach((el, index) => {
        el.setAttribute("class", index === number ? "active" : "");
    });
    document.querySelectorAll(`div#main_shell_innercontainer > pre`).forEach((el, index) => {
        const shouldBeActive = index === number;
        el.setAttribute("class", shouldBeActive ? "active" : "");
        if (!shouldBeActive) {
            el.classList.remove("prewarm");
        }
    });
};

window.finishShellTabActivation = number => {
    if (!window.term[number] || typeof window.term[number] !== "object") return;
    if (typeof window.term[number].enableHardwareAcceleration === "function") {
        window.term[number].enableHardwareAcceleration();
    }
    if (typeof window.term[number].forceRefresh === "function") {
        window.term[number].forceRefresh();
    } else {
        window.term[number].fit();
    }
    if (typeof window.term[number].focus === "function") {
        window.term[number].focus();
    } else {
        window.term[number].term.focus();
    }
    window.term[number].resendCWD();
    window.fsDisp.followTab();
};

window.spawnShellTab = (number, options = {}) => {
    const { activate = false, prewarm = false, sourceCwd = null } = options;
    const terminalEl = document.getElementById(`terminal${number}`);

    if (window.term[number] && typeof window.term[number] === "object") {
        if (activate) {
            window.setActiveShellTabUI(number);
            window.finishShellTabActivation(number);
        }
        return Promise.resolve(window.term[number]);
    }
    if (window.termLoading[number]) {
        if (prewarm && terminalEl) {
            terminalEl.classList.add("prewarm");
        }
        if (activate) {
            window.setActiveShellTabUI(number);
            window.pendingTermActivation[number] = true;
        }
        return window.termLoading[number];
    }

    if (prewarm && terminalEl) {
        terminalEl.classList.add("prewarm");
    }
    if (activate) {
        window.setActiveShellTabUI(number);
        window.pendingTermActivation[number] = true;
    }

    window.setShellTabLabel(number);

    const requestId = `shelltab-${number}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const replyChannel = `ttyspawn-reply-${requestId}`;
    const requestedCwd = sourceCwd || (window.term[0] ? (window.term[0].cwd || window.settings.cwd) : window.settings.cwd);

    window.termLoading[number] = new Promise((resolve, reject) => {
        ipc.once(replyChannel, (_event, reply) => {
            if (reply.startsWith("ERROR")) {
                if (terminalEl) terminalEl.classList.remove("prewarm");
                window.setShellTabLabel(number);
                delete window.pendingTermActivation[number];
                reject(new Error(reply));
                return;
            }

            const port = Number(reply.substr(9));
            const client = new Terminal({
                role: "client",
                parentId: `terminal${number}`,
                port
            });

            window.term[number] = client;

            client.onclose = () => {
                delete client.onprocesschange;
                delete client.onready;
                window.setShellTabLabel(number);
                if (terminalEl) {
                    terminalEl.className = "";
                    terminalEl.innerHTML = "";
                }
                if (typeof client.disableHardwareAcceleration === "function") {
                    client.disableHardwareAcceleration();
                }
                client.term.dispose();
                window.term[number] = false;
                delete window.pendingTermActivation[number];
                if (window.currentTerm === number) {
                    window.useAppShortcut("PREVIOUS_TAB");
                }
            };

            client.onprocesschange = () => {
                window.setShellTabLabel(number);
            };

            client.onready = () => {
                if (terminalEl) terminalEl.classList.remove("prewarm");
                if (window.pendingTermActivation[number] || window.currentTerm === number) {
                    delete window.pendingTermActivation[number];
                    window.setActiveShellTabUI(number);
                    window.finishShellTabActivation(number);
                }
                resolve(client);
            };

            window.setShellTabLabel(number);
        });

        ipc.send("ttyspawn", {
            cwd: requestedCwd,
            requestId
        });
    }).finally(() => {
        delete window.termLoading[number];
    });

    return window.termLoading[number];
};

window.prewarmShellTabs = async () => {
    const tasks = [];
    const sourceCwd = window.term[0] ? (window.term[0].cwd || window.settings.cwd) : window.settings.cwd;
    for (let number = 1; number <= 4; number++) {
        if (window.term[number] && typeof window.term[number] === "object") continue;
        tasks.push(window.spawnShellTab(number, {
            prewarm: true,
            sourceCwd
        }));
    }
    await Promise.allSettled(tasks);
};

window.focusShellTab = number => {
    window.audioManager.folder.play();

    if (number === window.currentTerm && window.term[number] && typeof window.term[number] === "object") {
        window.finishShellTabActivation(number);
        return;
    }

    const previousTerm = window.term[window.currentTerm];
    if (previousTerm && typeof previousTerm.disableHardwareAcceleration === "function") {
        previousTerm.disableHardwareAcceleration();
    }

    if (window.term[number] && typeof window.term[number] === "object") {
        window.setActiveShellTabUI(number);
        window.finishShellTabActivation(number);
        return;
    }

    if (number > 0 && number <= 4) {
        window.spawnShellTab(number, {
            activate: true,
            sourceCwd: window.term[window.currentTerm] ? (window.term[window.currentTerm].cwd || window.settings.cwd) : window.settings.cwd
        }).catch(() => {});
    }
};

window.settingsEditorCache = {
    keyboards: [],
    themes: [],
    ifaces: [],
    refreshedAt: 0,
    ttlMs: 30000,
    loadingPromise: null
};

window.refreshSettingsEditorCache = async (forceRefresh = false) => {
    const cache = window.settingsEditorCache;
    const cacheIsFresh = cache.refreshedAt > 0 && (Date.now() - cache.refreshedAt) < cache.ttlMs;
    if (!forceRefresh && cacheIsFresh) {
        return {
            keyboards: [...cache.keyboards],
            themes: [...cache.themes],
            ifaces: [...cache.ifaces]
        };
    }

    if (cache.loadingPromise) {
        return cache.loadingPromise;
    }

    cache.loadingPromise = (async () => {
        const keyboards = fs.readdirSync(keyboardsDir)
            .filter(kb => kb.endsWith(".json"))
            .map(kb => kb.replace(".json", ""))
            .filter(kb => !unsupportedKeyboardLayouts.has(kb));

        const themes = fs.readdirSync(themesDir)
            .filter(th => th.endsWith(".json"))
            .map(th => th.replace(".json", ""));

        let ifaces = [];
        try {
            ifaces = (await window.si.networkInterfaces())
                .map(net => (net && typeof net.iface === "string") ? net.iface.trim() : "")
                .filter(Boolean);
        } catch (error) {
            console.warn("Failed to refresh settings interfaces cache:", error);
        }

        cache.keyboards = keyboards;
        cache.themes = themes;
        cache.ifaces = [...new Set(ifaces)];
        cache.refreshedAt = Date.now();

        return {
            keyboards: [...cache.keyboards],
            themes: [...cache.themes],
            ifaces: [...cache.ifaces]
        };
    })();

    try {
        return await cache.loadingPromise;
    } finally {
        cache.loadingPromise = null;
    }
};

window.warmSettingsEditorCache = () => {
    window.refreshSettingsEditorCache().catch(() => {});
};

// Settings editor
window.openSettings = async () => {
    if (document.getElementById("settingsEditor")) return;

    // Build lists of available keyboards, themes, monitors
    const settingsEditorData = await window.refreshSettingsEditorCache();
    let keyboards = "";
    let themes = "";
    let monitors = "";
    let ifaces = `<option value="__AUTO__">Auto-detect active interface</option>`;
    settingsEditorData.keyboards.forEach(kb => {
        if (kb === window.settings.keyboard) return;
        keyboards += `<option>${kb}</option>`;
    });
    settingsEditorData.themes.forEach(th => {
        if (th === window.settings.theme) return;
        themes += `<option>${th}</option>`;
    });
    for (let i = 0; i < electron.remote.screen.getAllDisplays().length; i++) {
        if (i !== window.settings.monitor) monitors += `<option>${i}</option>`;
    }
    const currentIfaceValue = (typeof window.settings.iface === "string" && window.settings.iface.trim()) ? window.settings.iface : "__AUTO__";
    const currentIfaceLabel = currentIfaceValue === "__AUTO__"
        ? `Auto-detect (${window.mods.netstat.iface || "unavailable"})`
        : currentIfaceValue;
    settingsEditorData.ifaces.forEach(iface => {
        if (!iface || iface === currentIfaceValue || iface === window.mods.netstat.iface) return;
        ifaces += `<option>${iface}</option>`;
    });

    // Unlink the tactile keyboard from the terminal emulator to allow filling in the settings fields
    window.keyboard.detach();

    new Modal({
        type: "custom",
        fixedPosition: true,
        draggable: false,
        title: `Settings <i>(v${electron.remote.app.getVersion()})</i>`,
        html: `<div id="settingsEditorWrap"><table id="settingsEditor">
                    <tr>
                        <th>Key</th>
                        <th>Description</th>
                        <th>Value</th>
                    </tr>
                    <tr>
                        <td>about</td>
                        <td>Maintained by Ali-A-Alwahed. Original eDEX-UI created by Gabriel "Squared" Saillard. Special thanks to Hyder6112 and Ahmed Adnan.</td>
                        <td>release info</td>
                    </tr>
                    <tr>
                        <td>shell</td>
                        <td>The program to run as a terminal emulator</td>
                        <td><input type="text" id="settingsEditor-shell" value="${window.settings.shell}"></td>
                    </tr>
                    <tr>
                        <td>username</td>
                        <td>Custom username to display at boot</td>
                        <td><input type="text" id="settingsEditor-username" value="${window.settings.username || ""}"></td>
                    </tr>
                    <tr>
                        <td>keyboard</td>
                        <td>On-screen keyboard layout code</td>
                        <td><select id="settingsEditor-keyboard">
                            <option>${window.settings.keyboard}</option>
                            ${keyboards}
                        </select></td>
                    </tr>
                    <tr>
                        <td>theme</td>
                        <td>Name of the theme to load</td>
                        <td><select id="settingsEditor-theme">
                            <option>${window.settings.theme}</option>
                            ${themes}
                        </select></td>
                    </tr>
                    <tr>
                        <td>termFontSize</td>
                        <td>Size of the terminal text in pixels</td>
                        <td><input type="number" id="settingsEditor-termFontSize" value="${window.settings.termFontSize}"></td>
                    </tr>
                    <tr>
                        <td>audio</td>
                        <td>Activate audio sound effects</td>
                        <td><select id="settingsEditor-audio">
                            <option>${window.settings.audio}</option>
                            <option>${!window.settings.audio}</option>
                        </select></td>
                    </tr>
                    <tr>
                        <td>audioVolume</td>
                        <td>Set default volume for sound effects (0.0 - 1.0)</td>
                        <td><input type="number" id="settingsEditor-audioVolume" value="${window.settings.audioVolume || '1.0'}"></td>
                    </tr>
                    <tr>
                        <td>port</td>
                        <td>Local port to use for UI-shell connection</td>
                        <td><input type="number" id="settingsEditor-port" value="${window.settings.port}"></td>
                    </tr>
                    <tr>
                        <td>pingAddr</td>
                        <td>IPv4 address to test Internet connectivity</td>
                        <td><input type="text" id="settingsEditor-pingAddr" value="${window.settings.pingAddr || "1.1.1.1"}"></td>
                    </tr>
                    <tr>
                        <td>clockHours</td>
                        <td>Clock format (12/24 hours)</td>
                        <td><select id="settingsEditor-clockHours">
                            <option>${(window.settings.clockHours === 12) ? "12" : "24"}</option>
                            <option>${(window.settings.clockHours === 12) ? "24" : "12"}</option>
                        </select></td>
                    <tr>
                        <td>monitor</td>
                        <td>Which monitor to spawn the UI in (defaults to primary display)</td>
                        <td><select id="settingsEditor-monitor">
                            ${(typeof window.settings.monitor !== "undefined") ? "<option>"+window.settings.monitor+"</option>" : ""}
                            ${monitors}
                        </select></td>
                    </tr>
                    <tr>
                        <td>nointro</td>
                        <td>Skip the intro boot log and logo${(window.settings.nointroOverride) ? " (Currently overridden by CLI flag)" : ""}</td>
                        <td><select id="settingsEditor-nointro">
                            <option>${window.settings.nointro}</option>
                            <option>${!window.settings.nointro}</option>
                        </select></td>
                    </tr>
                    <tr>
                        <td>nocursor</td>
                        <td>Hide the mouse cursor${(window.settings.nocursorOverride) ? " (Currently overridden by CLI flag)" : ""}</td>
                        <td><select id="settingsEditor-nocursor">
                            <option>${window.settings.nocursor}</option>
                            <option>${!window.settings.nocursor}</option>
                        </select></td>
                    </tr>
                    <tr>
                        <td>iface</td>
                        <td>Override the interface used for network monitoring</td>
                        <td><select id="settingsEditor-iface">
                            <option value="${currentIfaceValue}">${currentIfaceLabel}</option>
                            ${ifaces}
                        </select></td>
                    </tr>
                    <tr>
                        <td>excludeThreadsFromToplist</td>
                        <td>Display threads in the top processes list</td>
                        <td><select id="settingsEditor-excludeThreadsFromToplist">
                            <option>${window.settings.excludeThreadsFromToplist}</option>
                            <option>${!window.settings.excludeThreadsFromToplist}</option>
                        </select></td>
                    </tr>
                    <tr>
                        <td>hideDotfiles</td>
                        <td>Hide files and directories starting with a dot in file display</td>
                        <td><select id="settingsEditor-hideDotfiles">
                            <option>${window.settings.hideDotfiles}</option>
                            <option>${!window.settings.hideDotfiles}</option>
                        </select></td>
                    </tr>
                    <tr>
                        <td>fsListView</td>
                        <td>Show files in a more detailed list instead of an icon grid</td>
                        <td><select id="settingsEditor-fsListView">
                            <option>${window.settings.fsListView}</option>
                            <option>${!window.settings.fsListView}</option>
                        </select></td>
                    </tr>
                    <tr>
                        <td>termHardwareAcceleration</td>
                        <td>Use GPU acceleration for the visible terminal tab only</td>
                        <td><select id="settingsEditor-termHardwareAcceleration">
                            <option>${window.settings.termHardwareAcceleration}</option>
                            <option>${!window.settings.termHardwareAcceleration}</option>
                        </select></td>
                    </tr>
                    <tr>
                        <td>enableVulkan</td>
                        <td>Prefer Vulkan rendering when the system supports it</td>
                        <td><select id="settingsEditor-enableVulkan">
                            <option>${window.settings.enableVulkan}</option>
                            <option>${!window.settings.enableVulkan}</option>
                        </select></td>
                    </tr>
                    <tr>
                        <td>disableVulkan</td>
                        <td>Force-disable Vulkan if a driver is unstable</td>
                        <td><select id="settingsEditor-disableVulkan">
                            <option>${window.settings.disableVulkan}</option>
                            <option>${!window.settings.disableVulkan}</option>
                        </select></td>
                    </tr>
                    <tr>
                        <td>optimizeVulkan</td>
                        <td>Enable safe Vulkan rasterization and zero-copy optimizations</td>
                        <td><select id="settingsEditor-optimizeVulkan">
                            <option>${window.settings.optimizeVulkan !== false}</option>
                            <option>${window.settings.optimizeVulkan === false}</option>
                        </select></td>
                    </tr>
                    <tr>
                        <td>experimentalGlobeFeatures</td>
                        <td>Toggle experimental features for the network globe</td>
                        <td><select id="settingsEditor-experimentalGlobeFeatures">
                            <option>${window.settings.experimentalGlobeFeatures}</option>
                            <option>${!window.settings.experimentalGlobeFeatures}</option>
                        </select></td>
                    </tr>
                    <tr>
                        <td>experimentalFeatures</td>
                        <td>Toggle Chrome's experimental web features (DANGEROUS)</td>
                        <td><select id="settingsEditor-experimentalFeatures">
                            <option>${window.settings.experimentalFeatures}</option>
                            <option>${!window.settings.experimentalFeatures}</option>
                        </select></td>
                    </tr>
                </table></div>
                <h6 id="settingsEditorStatus">Loaded values from memory</h6>
                <br>`,
        buttons: [
            {label: "Save", action: "window.writeSettingsFile();"},
            {label: "Reload UI", action: "window.location.reload(true);"},
            {label: "Restart eDEX", action: "electron.remote.app.relaunch();electron.remote.app.quit();"}
        ]
    }, () => {
        // Link the keyboard back to the terminal
        window.keyboard.attach();

        // Focus back on the term
        window.term[window.currentTerm].term.focus();
    });

    // Refresh cached lists in background so next open is instant and up-to-date.
    setTimeout(() => {
        window.refreshSettingsEditorCache(true).catch(() => {});
    }, 1000);
};

window.writeFile = (path) => {
    fs.writeFile(path, document.getElementById("fileEdit").value, "utf-8", () => {
        document.getElementById("fedit-status").innerHTML = "<i>File saved.</i>";
    });
};

window.writeSettingsFile = () => {
    const selectedIface = document.getElementById("settingsEditor-iface").value;

    const nextSettings = {
        ...window.settings,
        shell: document.getElementById("settingsEditor-shell").value,
        username: document.getElementById("settingsEditor-username").value,
        keyboard: document.getElementById("settingsEditor-keyboard").value,
        theme: document.getElementById("settingsEditor-theme").value,
        termFontSize: Number(document.getElementById("settingsEditor-termFontSize").value),
        audio: (document.getElementById("settingsEditor-audio").value === "true"),
        audioVolume: Number(document.getElementById("settingsEditor-audioVolume").value),
        pingAddr: document.getElementById("settingsEditor-pingAddr").value,
        clockHours: Number(document.getElementById("settingsEditor-clockHours").value),
        port: Number(document.getElementById("settingsEditor-port").value),
        monitor: Number(document.getElementById("settingsEditor-monitor").value),
        nointro: (document.getElementById("settingsEditor-nointro").value === "true"),
        nocursor: (document.getElementById("settingsEditor-nocursor").value === "true"),
        iface: selectedIface === "__AUTO__" ? false : selectedIface,
        forceFullscreen: true,
        allowWindowed: false,
        keepGeometry: false,
        excludeThreadsFromToplist: (document.getElementById("settingsEditor-excludeThreadsFromToplist").value === "true"),
        hideDotfiles: (document.getElementById("settingsEditor-hideDotfiles").value === "true"),
        fsListView: (document.getElementById("settingsEditor-fsListView").value === "true"),
        termHardwareAcceleration: (document.getElementById("settingsEditor-termHardwareAcceleration").value === "true"),
        enableVulkan: (document.getElementById("settingsEditor-enableVulkan").value === "true"),
        disableVulkan: (document.getElementById("settingsEditor-disableVulkan").value === "true"),
        optimizeVulkan: (document.getElementById("settingsEditor-optimizeVulkan").value === "true"),
        experimentalGlobeFeatures: (document.getElementById("settingsEditor-experimentalGlobeFeatures").value === "true"),
        experimentalFeatures: (document.getElementById("settingsEditor-experimentalFeatures").value === "true")
    };

    const persistedSettings = {
        ...nextSettings
    };
    delete nextSettings.disableFeedbackAudio;
    delete persistedSettings.disableFeedbackAudio;
    delete persistedSettings.shellArgs;
    delete persistedSettings.cwd;
    delete persistedSettings.env;

    Object.keys(persistedSettings).forEach(key => {
        if (persistedSettings[key] === "undefined" || typeof persistedSettings[key] === "undefined") {
            delete persistedSettings[key];
        }
    });

    window.settings = nextSettings;
    fs.writeFileSync(settingsFile, JSON.stringify(persistedSettings, "", 4));
    document.getElementById("settingsEditorStatus").innerText = "New values written to settings.json file at "+new Date().toTimeString();
};

window.toggleFullScreen = () => {
    let useFullscreen = (electronWin.isFullScreen() ? false : true);
    electronWin.setFullScreen(useFullscreen);

    //Update settings
    window.lastWindowState["useFullscreen"] = useFullscreen;

    fs.writeFileSync(lastWindowStateFile, JSON.stringify(window.lastWindowState, "", 4));
};

// Display available keyboard shortcuts and custom shortcuts helper
window.openShortcutsHelp = () => {
    if (document.getElementById("settingsEditor")) return;

    const shortcutsDefinition = {
        "COPY": "Copy selected buffer from the terminal.",
        "PASTE": "Paste system clipboard to the terminal.",
        "NEXT_TAB": "Switch to the next opened terminal tab (left to right order).",
        "PREVIOUS_TAB": "Switch to the previous opened terminal tab (right to left order).",
        "TAB_X": "Switch to terminal tab <strong>X</strong>, or create it if it hasn't been opened yet.",
        "SETTINGS": "Open the settings editor.",
        "SHORTCUTS": "List and edit available keyboard shortcuts.",
        "APP_MANAGER": "Open the installed applications launcher.",
        "FUZZY_SEARCH": "Search for entries in the current working directory.",
        "FS_LIST_VIEW": "Toggle between list and grid view in the file browser.",
        "FS_DOTFILES": "Toggle hidden files and directories in the file browser.",
        "KB_PASSMODE": "Toggle the on-screen keyboard's \"Password Mode\", which allows you to safely<br>type sensitive information even if your screen might be recorded (disable visual input feedback).",
        "DEV_DEBUG": "Open Chromium Dev Tools, for debugging purposes.",
        "DEV_RELOAD": "Trigger front-end hot reload."
    };

    let appList = "";
    window.shortcuts.filter(e => e.type === "app").forEach(cut => {
        let action = (cut.action.startsWith("TAB_")) ? "TAB_X" : cut.action;

        appList += `<tr>
                        <td>${(cut.enabled) ? 'YES' : 'NO'}</td>
                        <td><input disabled type="text" maxlength=25 value="${cut.trigger}"></td>
                        <td>${shortcutsDefinition[action]}</td>
                    </tr>`;
    });

    let customList = "";
    window.shortcuts.filter(e => e.type === "shell").forEach(cut => {
        customList += `<tr>
                            <td>${(cut.enabled) ? 'YES' : 'NO'}</td>
                            <td><input disabled type="text" maxlength=25 value="${cut.trigger}"></td>
                            <td>
                                <input disabled type="text" placeholder="Run terminal command..." value="${cut.action}">
                                <input disabled type="checkbox" name="shortcutsHelpNew_Enter" ${(cut.linebreak) ? 'checked' : ''}>
                                <label for="shortcutsHelpNew_Enter">Enter</label>
                            </td>
                        </tr>`;
    });

    window.keyboard.detach();
    new Modal({
        type: "custom",
        title: `Available Keyboard Shortcuts <i>(v${electron.remote.app.getVersion()})</i>`,
        html: `<h5>Using either the on-screen or a physical keyboard, you can use the following shortcuts:</h5>
                <details open id="shortcutsHelpAccordeon1">
                    <summary>Emulator shortcuts</summary>
                    <table class="shortcutsHelp">
                        <tr>
                            <th>Enabled</th>
                            <th>Trigger</th>
                            <th>Action</th>
                        </tr>
                        ${appList}
                    </table>
                </details>
                <br>
                <details id="shortcutsHelpAccordeon2">
                    <summary>Custom command shortcuts</summary>
                    <table class="shortcutsHelp">
                        <tr>
                            <th>Enabled</th>
                            <th>Trigger</th>
                            <th>Command</th>
                        <tr>
                       ${customList}
                    </table>
                </details>
                <br>`,
        buttons: [
            {label: "Open Shortcuts File", action:`electron.shell.openPath('${shortcutsFile}');electronWin.minimize();`},
            {label: "Reload UI", action: "window.location.reload(true);"},
        ]
    }, () => {
        window.keyboard.attach();
        window.term[window.currentTerm].term.focus();
    });

    let wrap1 = document.getElementById('shortcutsHelpAccordeon1');
    let wrap2 = document.getElementById('shortcutsHelpAccordeon2');

    wrap1.addEventListener('toggle', e => {
        wrap2.open = !wrap1.open;
    });

    wrap2.addEventListener('toggle', e => {
        wrap1.open = !wrap2.open;
    });
};

window.useAppShortcut = action => {
    switch(action) {
        case "COPY":
            window.term[window.currentTerm].clipboard.copy();
            return true;
        case "PASTE":
            window.term[window.currentTerm].clipboard.paste();
            return true;
        case "NEXT_TAB":
                if (window.term[window.currentTerm+1]) {
                    window.focusShellTab(window.currentTerm+1);
                } else if (window.term[window.currentTerm+2]) {
                    window.focusShellTab(window.currentTerm+2);
                } else if (window.term[window.currentTerm+3]) {
                    window.focusShellTab(window.currentTerm+3);
                } else if (window.term[window.currentTerm+4]) {
                    window.focusShellTab(window.currentTerm+4);
                } else {
                    window.focusShellTab(0);
                }
            return true;
        case "PREVIOUS_TAB":
                let i = window.currentTerm || 4;
                if (window.term[i] && i !== window.currentTerm) {
                    window.focusShellTab(i);
                } else if (window.term[i-1]) {
                    window.focusShellTab(i-1);
                } else if (window.term[i-2]) {
                    window.focusShellTab(i-2);
                } else if (window.term[i-3]) {
                    window.focusShellTab(i-3);
                } else if (window.term[i-4]) {
                    window.focusShellTab(i-4);
                }
            return true;
        case "TAB_1":
            window.focusShellTab(0);
            return true;
        case "TAB_2":
            window.focusShellTab(1);
            return true;
        case "TAB_3":
            window.focusShellTab(2);
            return true;
        case "TAB_4":
            window.focusShellTab(3);
            return true;
        case "TAB_5":
            window.focusShellTab(4);
            return true;
        case "SETTINGS":
            window.openSettings();
            return true;
        case "SHORTCUTS":
            window.openShortcutsHelp();
            return true;
        case "APP_MANAGER":
            window.openAppManager();
            return true;
        case "FUZZY_SEARCH":
            window.activeFuzzyFinder = new FuzzyFinder();
            return true;
        case "FS_LIST_VIEW":
            window.fsDisp.toggleListview();
            return true;
        case "FS_DOTFILES":
            window.fsDisp.toggleHidedotfiles();
            return true;
        case "KB_PASSMODE":
            window.keyboard.togglePasswordMode();
            return true;
        case "DEV_DEBUG":
            electron.remote.getCurrentWindow().webContents.toggleDevTools();
            return true;
        case "DEV_RELOAD":
            window.location.reload(true);
            return true;
        default:
            console.warn(`Unknown "${action}" app shortcut action`);
            return false;
    }
};

// Global keyboard shortcuts
const globalShortcut = electron.remote.globalShortcut;
globalShortcut.unregisterAll();

window.registerKeyboardShortcuts = () => {
    window.shortcuts.forEach(cut => {
        if (!cut.enabled) return;

        if (cut.type === "app") {
            if (cut.action === "TAB_X") {
                for (let i = 1; i <= 5; i++) {
                    let trigger = cut.trigger.replace("X", i);
                    let dfn = () => { window.useAppShortcut(`TAB_${i}`) };
                    globalShortcut.register(trigger, dfn);
                }
            } else {
                globalShortcut.register(cut.trigger, () => {
                    window.useAppShortcut(cut.action);
                });
            }
        } else if (cut.type === "shell") {
            globalShortcut.register(cut.trigger, () => {
                let fn = (cut.linebreak) ? "writelr" : "write";
                window.term[window.currentTerm][fn](cut.action);
            });
        } else {
            console.warn(`${cut.trigger} has unknown type`);
        }
    });
};
window.registerKeyboardShortcuts();

// See #361
window.addEventListener("focus", () => {
    window.registerKeyboardShortcuts();
});

window.addEventListener("blur", () => {
    globalShortcut.unregisterAll();
});

// Prevent showing menu, exiting fullscreen or app with keyboard shortcuts
document.addEventListener("keydown", e => {
    if (e.key === "Alt") {
        e.preventDefault();
    }
    if (e.code.startsWith("Alt") && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
    }
    if (e.key === "F11" && !settings.allowWindowed) {
        e.preventDefault();
    }
    if (e.code === "KeyD" && e.ctrlKey) {
        e.preventDefault();
    }
    if (e.code === "KeyA" && e.ctrlKey) {
        e.preventDefault();
    }
});

// Fix #265
window.addEventListener("keyup", e => {
    if (require("os").platform() === "win32" && e.key === "F4" && e.altKey === true) {
        electron.remote.app.quit();
    }
});

// Fix double-tap zoom on touchscreens
electron.webFrame.setVisualZoomLevelLimits(1, 1);

// Resize terminal with window
window.onresize = () => {
    if (typeof window.currentTerm !== "undefined") {
        if (typeof window.term[window.currentTerm] !== "undefined") {
            window.term[window.currentTerm].fit();
            if (typeof window.term[window.currentTerm].forceRefresh === "function") {
                window.term[window.currentTerm].forceRefresh();
            }
        }
    }
    window.positionShellOverlay();
};

// See #413
window.resizeTimeout = null;
let electronWin = electron.remote.getCurrentWindow();
electronWin.on("resize", () => {
    if (settings.keepGeometry === false) return;
});

electronWin.on("leave-full-screen", () => {
    if (settings.allowWindowed) {
        electron.remote.getCurrentWindow().maximize();
    }
});

window.addEventListener("load", () => {
    setTimeout(() => {
        if (window.term && window.term[0] && typeof window.term[0].forceRefresh === "function") {
            window.term[0].forceRefresh();
        }
    }, 250);
});
