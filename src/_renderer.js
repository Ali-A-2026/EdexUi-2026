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

// Initiate basic error handling
window.onerror = (msg, path, line, col, error) => {
    document.getElementById("boot_screen").innerHTML += `${error} :  ${msg}<br/>==> at ${path}  ${line}:${col}`;
};

const path = require("path");
const fs = require("fs");
const electron = require("electron");
const remote = require("@electron/remote");
const ipc = electron.ipcRenderer;
electron.remote = remote;

const settingsDir = remote.app.getPath("userData");
const themesDir = path.join(settingsDir, "themes");
const keyboardsDir = path.join(settingsDir, "keyboards");
const fontsDir = path.join(settingsDir, "fonts");
const settingsFile = path.join(settingsDir, "settings.json");
const shortcutsFile = path.join(settingsDir, "shortcuts.json");
const lastWindowStateFile = path.join(settingsDir, "lastWindowState.json");

// Load config
window.settings = require(settingsFile);
window.shortcuts = require(shortcutsFile);
window.lastWindowState = require(lastWindowStateFile);

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
window._loadTheme = theme => {

    if (document.querySelector("style.theming")) {
        document.querySelector("style.theming").remove();
    }

    // Load fonts
    let mainFont = new FontFace(theme.cssvars.font_main, `url("${path.join(fontsDir, theme.cssvars.font_main.toLowerCase().replace(/ /g, '_')+'.woff2').replace(/\\/g, '/')}")`);
    let lightFont = new FontFace(theme.cssvars.font_main_light, `url("${path.join(fontsDir, theme.cssvars.font_main_light.toLowerCase().replace(/ /g, '_')+'.woff2').replace(/\\/g, '/')}")`);
    let termFont = new FontFace(theme.terminal.fontFamily, `url("${path.join(fontsDir, theme.terminal.fontFamily.toLowerCase().replace(/ /g, '_')+'.woff2').replace(/\\/g, '/')}")`);

    document.fonts.add(mainFont);
    document.fonts.load("12px "+theme.cssvars.font_main);
    document.fonts.add(lightFont);
    document.fonts.load("12px "+theme.cssvars.font_main_light);
    document.fonts.add(termFont);
    document.fonts.load("12px "+theme.terminal.fontFamily);

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

    await _delay(400);

    document.body.setAttribute("class", "");
    bootScreen.setAttribute("class", "center");
    bootScreen.innerHTML = "<h1>EdexUi-2026</h1>";
    let title = document.querySelector("section > h1");

    await _delay(200);

    document.body.setAttribute("class", "solidBackground");

    await _delay(100);

    title.setAttribute("style", `background-color: rgb(${window.theme.r}, ${window.theme.g}, ${window.theme.b});border-bottom: 5px solid rgb(${window.theme.r}, ${window.theme.g}, ${window.theme.b});`);

    await _delay(300);

    title.setAttribute("style", `border: 5px solid rgb(${window.theme.r}, ${window.theme.g}, ${window.theme.b});`);

    await _delay(100);

    title.setAttribute("style", "");
    title.setAttribute("class", "glitch");

    await _delay(500);

    document.body.setAttribute("class", "");
    title.setAttribute("class", "");
    title.setAttribute("style", `border: 5px solid rgb(${window.theme.r}, ${window.theme.g}, ${window.theme.b});`);

    await _delay(1000);
    if (window.term) {
        bootScreen.remove();
        return true;
    }
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
        layout: path.join(keyboardsDir, settings.keyboard+".json"),
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
            <button id="shell_apps_button" onclick="window.openAppManager();">
                <span>APP MANAGER</span>
                <strong>OPEN INSTALLED APPS</strong>
            </button>
        </div>
        <ul id="main_shell_tabs">
            <li id="shell_tab0" onclick="window.focusShellTab(0);" class="active"><p>EdexUi-2026</p></li>
            <li id="shell_tab1" onclick="window.focusShellTab(1);"><p>EMPTY</p></li>
            <li id="shell_tab2" onclick="window.focusShellTab(2);"><p>EMPTY</p></li>
            <li id="shell_tab3" onclick="window.focusShellTab(3);"><p>EMPTY</p></li>
            <li id="shell_tab4" onclick="window.focusShellTab(4);"><p>EMPTY</p></li>
        </ul>
        <div id="main_shell_innercontainer">
            <pre id="terminal0" class="active"></pre>
            <pre id="terminal1"></pre>
            <pre id="terminal2"></pre>
            <pre id="terminal3"></pre>
            <pre id="terminal4"></pre>
        </div>`;
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
    window.termLoading = {};
    window.pendingTermActivation = {};
    window.prewarmShellTabsPromise = null;
    window.shellTabsPrewarmStarted = false;
    if (typeof window.term[0].enableHardwareAcceleration === "function") {
        window.term[0].enableHardwareAcceleration();
    }
    window.term[0].onprocesschange = p => {
        document.getElementById("shell_tab0").innerHTML = `<p>MAIN - ${p}</p>`;
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
        parentId: "filesystem"
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
}

window.themeChanger = theme => {
    ipc.send("setThemeOverride", theme);
    setTimeout(() => {
        window.location.reload(true);
    }, 100);
};

window.remakeKeyboard = layout => {
    document.getElementById("keyboard").innerHTML = "";
    window.keyboard = new Keyboard({
        layout: path.join(keyboardsDir, layout+".json" || settings.keyboard+".json"),
        container: "keyboard"
    });
    ipc.send("setKbOverride", layout);
};

window.appManager = {
    apps: [],
    filteredApps: [],
    selectedAppId: null,
    modalId: null
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

    list.innerHTML = apps.map(app => `
        <button
            class="appManager_item ${app.id === window.appManager.selectedAppId ? "active" : ""}"
            onclick="window.selectAppManagerItem('${window._escapeHtml(app.id)}')"
            ondblclick="window.launchSelectedApp()">
            <strong>${window._escapeHtml(app.name)}</strong>
            <span>${window._escapeHtml(app.categories || app.exec)}</span>
            <small>${window._escapeHtml(app.terminal ? app.exec : app.id)}</small>
        </button>
    `).join("");

    const activeItem = list.querySelector(".appManager_item.active");
    if (activeItem) activeItem.scrollIntoView({block: "nearest"});
};

window.selectAppManagerItem = appId => {
    window.appManager.selectedAppId = appId;
    const search = document.getElementById("appManagerSearch");
    window.renderAppManagerList(search ? search.value : "");
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
    if (document.getElementById("appManagerSearch")) return;

    window.keyboard.detach();
    ipc.send("appManager:getInstalledApps");

    const modalId = new Modal({
        type: "custom",
        title: `Application Manager <i>(launch installed apps)</i>`,
        html: `<div id="appManager">
                <input id="appManagerSearch" type="text" placeholder="Search installed applications" oninput="window.renderAppManagerList(this.value)">
                <div id="appManagerList" class="appManager_list">
                    <div class="appManager_empty">SCANNING APPLICATION DATABASE...</div>
                </div>
                <h6 id="appManagerStatus">Use Ctrl+Shift+A any time to reopen this launcher.</h6>
            </div>`,
        buttons: [
            {label:"Launch", action:"window.launchSelectedApp();"}
        ]
    }, () => {
        window.appManager.modalId = null;
        window.keyboard.attach();
    });
    window.appManager.modalId = modalId;

    ipc.once("appManager:installedApps", (_event, payload) => {
        if (payload && payload.error) {
            document.getElementById("appManagerList").innerHTML = `<div class="appManager_empty">${window._escapeHtml(payload.error)}</div>`;
            return;
        }
        window.appManager.apps = payload || [];
        window.renderAppManagerList("");
        document.getElementById("appManagerStatus").innerText = `${window.appManager.apps.length} applications indexed`;
        const searchInput = document.getElementById("appManagerSearch");
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
            } else if (event.key === "Escape" && window.appManager.modalId !== null) {
                event.preventDefault();
                window.modals[window.appManager.modalId].close();
            }
        });
    });

    ipc.once("appManager:launchResult", (_event, payload) => {
        if (payload.ok) {
            document.getElementById("appManagerStatus").innerText = `LAUNCHED ${payload.app.name}`;
            window.audioManager.granted.play();
            if (window.modals[modalId]) {
                window.modals[modalId].close();
            }
        } else {
            document.getElementById("appManagerStatus").innerText = payload.error || "Launch failed";
            window.audioManager.denied.play();
        }
    });
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

    document.getElementById(`shell_tab${number}`).innerHTML = "<p>LOADING...</p>";

    const requestId = `shelltab-${number}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const replyChannel = `ttyspawn-reply-${requestId}`;
    const requestedCwd = sourceCwd || (window.term[0] ? (window.term[0].cwd || window.settings.cwd) : window.settings.cwd);

    window.termLoading[number] = new Promise((resolve, reject) => {
        ipc.once(replyChannel, (_event, reply) => {
            if (reply.startsWith("ERROR")) {
                if (terminalEl) terminalEl.classList.remove("prewarm");
                document.getElementById(`shell_tab${number}`).innerHTML = "<p>ERROR</p>";
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
                document.getElementById(`shell_tab${number}`).innerHTML = "<p>EMPTY</p>";
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

            client.onprocesschange = processName => {
                document.getElementById(`shell_tab${number}`).innerHTML = `<p>#${number+1} - ${processName || "bash"}</p>`;
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

            document.getElementById(`shell_tab${number}`).innerHTML = `<p>::${port}</p>`;
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

// Settings editor
window.openSettings = async () => {
    if (document.getElementById("settingsEditor")) return;

    // Build lists of available keyboards, themes, monitors
    let keyboards, themes, monitors, ifaces;
    fs.readdirSync(keyboardsDir).forEach(kb => {
        if (!kb.endsWith(".json")) return;
        kb = kb.replace(".json", "");
        if (kb === window.settings.keyboard) return;
        keyboards += `<option>${kb}</option>`;
    });
    fs.readdirSync(themesDir).forEach(th => {
        if (!th.endsWith(".json")) return;
        th = th.replace(".json", "");
        if (th === window.settings.theme) return;
        themes += `<option>${th}</option>`;
    });
    for (let i = 0; i < electron.remote.screen.getAllDisplays().length; i++) {
        if (i !== window.settings.monitor) monitors += `<option>${i}</option>`;
    }
    let nets = await window.si.networkInterfaces();
    nets.forEach(net => {
        if (net.iface !== window.mods.netstat.iface) ifaces += `<option>${net.iface}</option>`;
    });

    // Unlink the tactile keyboard from the terminal emulator to allow filling in the settings fields
    window.keyboard.detach();

    new Modal({
        type: "custom",
        title: `Settings <i>(v${electron.remote.app.getVersion()})</i>`,
        html: `<table id="settingsEditor">
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
                        <td>shellArgs</td>
                        <td>Arguments to pass to the shell</td>
                        <td><input type="text" id="settingsEditor-shellArgs" value="${window.settings.shellArgs || ''}"></td>
                    </tr>
                    <tr>
                        <td>cwd</td>
                        <td>Working Directory to start in</td>
                        <td><input type="text" id="settingsEditor-cwd" value="${window.settings.cwd}"></td>
                    </tr>
                    <tr>
                        <td>env</td>
                        <td>Custom shell environment override</td>
                        <td><input type="text" id="settingsEditor-env" value="${window.settings.env || ""}"></td>
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
                        <td>disableFeedbackAudio</td>
                        <td>Disable recurring feedback sound FX (input/output, mostly)</td>
                        <td><select id="settingsEditor-disableFeedbackAudio">
                            <option>${window.settings.disableFeedbackAudio}</option>
                            <option>${!window.settings.disableFeedbackAudio}</option>
                        </select></td>
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
                            <option>${window.mods.netstat.iface}</option>
                            ${ifaces}
                        </select></td>
                    </tr>
                    <tr>
                        <td>allowWindowed</td>
                        <td>Allow using F11 key to set the UI in windowed mode</td>
                        <td><select id="settingsEditor-allowWindowed">
                            <option>${window.settings.allowWindowed}</option>
                            <option>${!window.settings.allowWindowed}</option>
                        </select></td>
                    </tr>
                    <tr>
                        <td>keepGeometry</td>
                        <td>Try to keep a 16:9 aspect ratio in windowed mode</td>
                        <td><select id="settingsEditor-keepGeometry">
                            <option>${(window.settings.keepGeometry === false) ? 'false' : 'true'}</option>
                            <option>${(window.settings.keepGeometry === false) ? 'true' : 'false'}</option>
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
                </table>
                <h6 id="settingsEditorStatus">Loaded values from memory</h6>
                <br>`,
        buttons: [
            {label: "Open in External Editor", action:`electron.shell.openPath('${settingsFile}');electronWin.minimize();`},
            {label: "Save to Disk", action: "window.writeSettingsFile()"},
            {label: "Reload UI", action: "window.location.reload(true);"},
            {label: "Restart eDEX", action: "electron.remote.app.relaunch();electron.remote.app.quit();"}
        ]
    }, () => {
        // Link the keyboard back to the terminal
        window.keyboard.attach();

        // Focus back on the term
        window.term[window.currentTerm].term.focus();
    });
};

window.writeFile = (path) => {
    fs.writeFile(path, document.getElementById("fileEdit").value, "utf-8", () => {
        document.getElementById("fedit-status").innerHTML = "<i>File saved.</i>";
    });
};

window.writeSettingsFile = () => {
    window.settings = {
        shell: document.getElementById("settingsEditor-shell").value,
        shellArgs: document.getElementById("settingsEditor-shellArgs").value,
        cwd: document.getElementById("settingsEditor-cwd").value,
        env: document.getElementById("settingsEditor-env").value,
        username: document.getElementById("settingsEditor-username").value,
        keyboard: document.getElementById("settingsEditor-keyboard").value,
        theme: document.getElementById("settingsEditor-theme").value,
        termFontSize: Number(document.getElementById("settingsEditor-termFontSize").value),
        audio: (document.getElementById("settingsEditor-audio").value === "true"),
        audioVolume: Number(document.getElementById("settingsEditor-audioVolume").value),
        disableFeedbackAudio: (document.getElementById("settingsEditor-disableFeedbackAudio").value === "true"),
        pingAddr: document.getElementById("settingsEditor-pingAddr").value,
        clockHours: Number(document.getElementById("settingsEditor-clockHours").value),
        port: Number(document.getElementById("settingsEditor-port").value),
        monitor: Number(document.getElementById("settingsEditor-monitor").value),
        nointro: (document.getElementById("settingsEditor-nointro").value === "true"),
        nocursor: (document.getElementById("settingsEditor-nocursor").value === "true"),
        iface: document.getElementById("settingsEditor-iface").value,
        allowWindowed: (document.getElementById("settingsEditor-allowWindowed").value === "true"),
        forceFullscreen: window.settings.forceFullscreen,
        keepGeometry: (document.getElementById("settingsEditor-keepGeometry").value === "true"),
        excludeThreadsFromToplist: (document.getElementById("settingsEditor-excludeThreadsFromToplist").value === "true"),
        hideDotfiles: (document.getElementById("settingsEditor-hideDotfiles").value === "true"),
        fsListView: (document.getElementById("settingsEditor-fsListView").value === "true"),
        termHardwareAcceleration: (document.getElementById("settingsEditor-termHardwareAcceleration").value === "true"),
        enableVulkan: (document.getElementById("settingsEditor-enableVulkan").value === "true"),
        disableVulkan: (document.getElementById("settingsEditor-disableVulkan").value === "true"),
        optimizeVulkan: (document.getElementById("settingsEditor-optimizeVulkan").value === "true"),
        termLigatures: !!window.settings.termLigatures,
        disableGlobe: !!window.settings.disableGlobe,
        disableUpdateCheck: !!window.settings.disableUpdateCheck,
        experimentalGlobeFeatures: (document.getElementById("settingsEditor-experimentalGlobeFeatures").value === "true"),
        experimentalFeatures: (document.getElementById("settingsEditor-experimentalFeatures").value === "true")
    };

    Object.keys(window.settings).forEach(key => {
        if (window.settings[key] === "undefined") {
            delete window.settings[key];
        }
    });

    fs.writeFileSync(settingsFile, JSON.stringify(window.settings, "", 4));
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
