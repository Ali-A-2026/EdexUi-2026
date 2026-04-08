const signale = require("signale");
const {app, BrowserWindow, dialog, shell} = require("electron");

process.on("uncaughtException", e => {
    signale.fatal(e);
    dialog.showErrorBox("EdexUi-2026 crashed", e.message || "Cannot retrieve error message.");
    if (tty) {
        tty.close();
    }
    if (extraTtys) {
        Object.keys(extraTtys).forEach(key => {
            if (extraTtys[key] !== null) {
                extraTtys[key].close();
            }
        });
    }
    process.exit(1);
});

signale.start(`Starting EdexUi-2026 v${app.getVersion()}`);
signale.info(`With Node ${process.versions.node} and Electron ${process.versions.electron}`);
signale.info(`Renderer is Chrome ${process.versions.chrome}`);

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    signale.fatal("Error: Another instance of eDEX is already running. Cannot proceed.");
    app.exit(1);
}

signale.time("Startup");

const electron = require("electron");
const remoteMain = require("@electron/remote/main");
remoteMain.initialize();
const ipc = electron.ipcMain;
const path = require("path");
const url = require("url");
const fs = require("fs");
const os = require("os");
const cp = require("child_process");
const net = require("net");
const which = require("which");
const Terminal = require("./classes/terminal.class.js").Terminal;

ipc.on("log", (e, type, content) => {
    signale[type](content);
});

var win, tty, extraTtys;
let frontendReadyShown = false;
let frontendShowFallbackTimer = null;
function clearFrontendShowFallback() {
    if (frontendShowFallbackTimer) {
        clearTimeout(frontendShowFallbackTimer);
        frontendShowFallbackTimer = null;
    }
}
function scheduleFrontendShowFallback(delayMs, reason) {
    clearFrontendShowFallback();
    frontendShowFallbackTimer = setTimeout(() => {
        if (frontendReadyShown || !win || win.isDestroyed()) return;
        signale.warn(`Showing frontend window via fallback (${reason})`);
        showFrontendWindow();
    }, delayMs);
}
function showFrontendWindow() {
    if (!win || win.isDestroyed() || frontendReadyShown) return;
    clearFrontendShowFallback();
    frontendReadyShown = true;
    win.show();
}
const settingsFile = path.join(electron.app.getPath("userData"), "settings.json");
const shortcutsFile = path.join(electron.app.getPath("userData"), "shortcuts.json");
const lastWindowStateFile = path.join(electron.app.getPath("userData"), "lastWindowState.json");
const themesDir = path.join(electron.app.getPath("userData"), "themes");
const innerThemesDir = path.join(__dirname, "assets/themes");
const kblayoutsDir = path.join(electron.app.getPath("userData"), "keyboards");
const innerKblayoutsDir = path.join(__dirname, "assets/kb_layouts");
const fontsDir = path.join(electron.app.getPath("userData"), "fonts");
const innerFontsDir = path.join(__dirname, "assets/fonts");

function copyDirRecursive(sourceDir, targetDir) {
    fs.mkdirSync(targetDir, {recursive: true});
    fs.readdirSync(sourceDir, {withFileTypes: true}).forEach(entry => {
        const sourcePath = path.join(sourceDir, entry.name);
        const targetPath = path.join(targetDir, entry.name);
        if (entry.isDirectory()) {
            copyDirRecursive(sourcePath, targetPath);
        } else if (entry.isFile()) {
            fs.copyFileSync(sourcePath, targetPath);
        }
    });
}

function migrateLegacyUserData() {
    const currentDir = electron.app.getPath("userData");
    const legacyDir = path.join(path.dirname(currentDir), "eDEX-UI");
    if (fs.existsSync(currentDir) || !fs.existsSync(legacyDir)) return;

    copyDirRecursive(legacyDir, currentDir);
    signale.info(`Imported legacy configuration from ${legacyDir}`);
}

function parseSettingsEnv(rawEnv) {
    if (!rawEnv) return {};
    if (typeof rawEnv === "object" && !Array.isArray(rawEnv)) return rawEnv;
    if (typeof rawEnv !== "string") return {};

    const trimmed = rawEnv.trim();
    if (!trimmed) return {};

    if (trimmed.startsWith("{")) {
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                return parsed;
            }
        } catch (error) {
            signale.warn("Ignoring invalid JSON env override in settings.json");
        }
    }

    const env = {};
    trimmed
        .split(/\r?\n|;/)
        .map(line => line.trim())
        .filter(Boolean)
        .forEach(line => {
            const separator = line.indexOf("=");
            if (separator <= 0) return;
            env[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
        });
    return env;
}

function parseShellArgs(rawArgs) {
    if (Array.isArray(rawArgs)) return rawArgs;
    if (typeof rawArgs !== "string") return [];

    const trimmed = rawArgs.trim();
    if (!trimmed) return [];

    const matches = trimmed.match(/"[^"]*"|'[^']*'|\S+/g);
    if (!matches) return [];

    return matches.map(arg => arg.replace(/^['"]|['"]$/g, ""));
}

function isPortAvailable(port) {
    return new Promise(resolve => {
        const server = net.createServer();
        server.once("error", () => resolve(false));
        server.once("listening", () => {
            server.close(() => resolve(true));
        });
        server.listen(port, "127.0.0.1");
    });
}

async function findAvailablePort(startPort) {
    let candidate = Number(startPort) || 3000;
    for (let i = 0; i < 50; i++) {
        if (await isPortAvailable(candidate)) return candidate;
        candidate++;
    }
    throw new Error("Could not find a free local port for the terminal backend.");
}

// Unset proxy env variables to avoid connection problems on the internal websockets
// See #222
if (process.env.http_proxy) delete process.env.http_proxy;
if (process.env.https_proxy) delete process.env.https_proxy;

function loadEarlySettings() {
    try {
        return JSON.parse(fs.readFileSync(settingsFile, "utf8"));
    } catch (error) {
        return {};
    }
}

function appendFeatureSwitch(switchName, featureName) {
    const existing = app.commandLine.getSwitchValue(switchName);
    const features = new Set(existing.split(",").map(value => value.trim()).filter(Boolean));
    features.add(featureName);
    app.commandLine.appendSwitch(switchName, Array.from(features).join(","));
}

const earlySettings = loadEarlySettings();
const vulkanDisabled = process.env.EDEX_DISABLE_VULKAN === "true" || earlySettings.disableVulkan === true;
const vulkanEnabled = !vulkanDisabled && (process.env.EDEX_ENABLE_VULKAN === "true" || earlySettings.enableVulkan === true);
const vulkanOptimizationsEnabled = vulkanEnabled
    && process.env.EDEX_DISABLE_VULKAN_OPTIMIZATIONS !== "true"
    && earlySettings.optimizeVulkan !== false;
if (vulkanDisabled) {
    appendFeatureSwitch("disable-features", "Vulkan");
}
if (vulkanEnabled) {
    appendFeatureSwitch("enable-features", "Vulkan");
    app.commandLine.appendSwitch("use-angle", "vulkan");
    if (vulkanOptimizationsEnabled) {
        app.commandLine.appendSwitch("enable-gpu-rasterization");
        app.commandLine.appendSwitch("enable-zero-copy");
        signale.info("Enabled safe Vulkan rendering optimizations");
    }
}
if (process.env.EDEX_DISABLE_GPU === "true") {
    app.disableHardwareAcceleration();
}

// Fix userData folder not setup on Windows
try {
    migrateLegacyUserData();
    fs.mkdirSync(electron.app.getPath("userData"));
    signale.info(`Created config dir at ${electron.app.getPath("userData")}`);
} catch(e) {
    signale.info(`Base config dir is ${electron.app.getPath("userData")}`);
}
// Create default settings file
if (!fs.existsSync(settingsFile)) {
    fs.writeFileSync(settingsFile, JSON.stringify({
        shell: (process.platform === "win32") ? "powershell.exe" : "bash",
        shellArgs: '',
        keyboard: "en-US",
        theme: "tron",
        termFontSize: 15,
        audio: true,
        audioVolume: 1.0,
        clockHours: 24,
        pingAddr: "1.1.1.1",
        port: 3000,
        nointro: false,
        nocursor: false,
        forceFullscreen: false,
        allowWindowed: true,
        keepGeometry: true,
        excludeThreadsFromToplist: true,
        hideDotfiles: false,
        fsListView: false,
        termHardwareAcceleration: false,
        enableVulkan: false,
        disableVulkan: false,
        optimizeVulkan: true,
        termLigatures: false,
        disableGlobe: false,
        disableUpdateCheck: false,
        experimentalGlobeFeatures: false,
        experimentalFeatures: false
    }, "", 4));
    signale.info(`Default settings written to ${settingsFile}`);
}
// Create default shortcuts file
if (!fs.existsSync(shortcutsFile)) {
    fs.writeFileSync(shortcutsFile, JSON.stringify([
        { type: "app", trigger: "Ctrl+Shift+C", action: "COPY", enabled: true },
        { type: "app", trigger: "Ctrl+Shift+V", action: "PASTE", enabled: true },
        { type: "app", trigger: "Ctrl+Tab", action: "NEXT_TAB", enabled: true },
        { type: "app", trigger: "Ctrl+Shift+Tab", action: "PREVIOUS_TAB", enabled: true },
        { type: "app", trigger: "Ctrl+X", action: "TAB_X", enabled: true },
        { type: "app", trigger: "Ctrl+Shift+S", action: "SETTINGS", enabled: true },
        { type: "app", trigger: "Ctrl+Shift+K", action: "SHORTCUTS", enabled: true },
        { type: "app", trigger: "Ctrl+Shift+A", action: "APP_MANAGER", enabled: true },
        { type: "app", trigger: "Ctrl+Shift+F", action: "FUZZY_SEARCH", enabled: true },
        { type: "app", trigger: "Ctrl+Shift+L", action: "FS_LIST_VIEW", enabled: true },
        { type: "app", trigger: "Ctrl+Shift+H", action: "FS_DOTFILES", enabled: true },
        { type: "app", trigger: "Ctrl+Shift+P", action: "KB_PASSMODE", enabled: true },
        { type: "app", trigger: "Ctrl+Shift+I", action: "DEV_DEBUG", enabled: false },
        { type: "app", trigger: "Ctrl+Shift+F5", action: "DEV_RELOAD", enabled: true },
        { type: "shell", trigger: "Ctrl+Shift+Alt+Space", action: "neofetch", linebreak: true, enabled: false }
    ], "", 4));
    signale.info(`Default keymap written to ${shortcutsFile}`);
}
//Create default window state file
if(!fs.existsSync(lastWindowStateFile)) {
    fs.writeFileSync(lastWindowStateFile, JSON.stringify({
        useFullscreen: false
    }, "", 4));
    signale.info(`Default last window state written to ${lastWindowStateFile}`);
}

// Copy default themes & keyboard layouts & fonts
signale.pending("Mirroring internal assets...");
try {
    fs.mkdirSync(themesDir);
} catch(e) {
    // Folder already exists
}
fs.readdirSync(innerThemesDir).forEach(e => {
    fs.writeFileSync(path.join(themesDir, e), fs.readFileSync(path.join(innerThemesDir, e), {encoding:"utf-8"}));
});
try {
    fs.mkdirSync(kblayoutsDir);
} catch(e) {
    // Folder already exists
}
fs.readdirSync(innerKblayoutsDir).forEach(e => {
    fs.writeFileSync(path.join(kblayoutsDir, e), fs.readFileSync(path.join(innerKblayoutsDir, e), {encoding:"utf-8"}));
});
try {
    fs.mkdirSync(fontsDir);
} catch(e) {
    // Folder already exists
}
fs.readdirSync(innerFontsDir).forEach(e => {
    fs.writeFileSync(path.join(fontsDir, e), fs.readFileSync(path.join(innerFontsDir, e)));
});

// Version history logging
const versionHistoryPath = path.join(electron.app.getPath("userData"), "versions_log.json");
var versionHistory = fs.existsSync(versionHistoryPath) ? require(versionHistoryPath) : {};
var version = app.getVersion();
if (typeof versionHistory[version] === "undefined") {
	versionHistory[version] = {
		firstSeen: Date.now(),
		lastSeen: Date.now()
	};
} else {
	versionHistory[version].lastSeen = Date.now();
}
fs.writeFileSync(versionHistoryPath, JSON.stringify(versionHistory, 0, 2), {encoding:"utf-8"});

function stripDesktopExec(execLine) {
    if (!execLine) return "";
    return execLine
        .replace(/ ?%[fFuUdDnNickvm]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function commandExists(command) {
    try {
        which.sync(command);
        return true;
    } catch (error) {
        return false;
    }
}

function parseDesktopEntry(filePath) {
    const raw = fs.readFileSync(filePath, "utf-8");
    const lines = raw.split(/\r?\n/);
    let inDesktopEntry = false;
    const entry = {};

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        if (trimmed.startsWith("[")) {
            inDesktopEntry = trimmed === "[Desktop Entry]";
            return;
        }
        if (!inDesktopEntry) return;

        const separator = trimmed.indexOf("=");
        if (separator === -1) return;
        const key = trimmed.slice(0, separator);
        const value = trimmed.slice(separator + 1);
        if (!(key in entry)) entry[key] = value;
    });

    if (entry.Type !== "Application") return null;
    if (!entry.Name || !entry.Exec) return null;
    if (entry.NoDisplay === "true" || entry.Hidden === "true") return null;
    if (entry.TryExec && !commandExists(entry.TryExec)) return null;

    return {
        id: path.basename(filePath, ".desktop"),
        name: entry.Name,
        exec: stripDesktopExec(entry.Exec),
        icon: entry.Icon || "",
        terminal: entry.Terminal === "true",
        categories: entry.Categories || "",
        filePath
    };
}

function listInstalledApps() {
    const searchDirs = [
        path.join(os.homedir(), ".local/share/applications"),
        "/usr/local/share/applications",
        "/usr/share/applications"
    ];

    const apps = new Map();
    searchDirs.forEach(dir => {
        if (!fs.existsSync(dir)) return;
        fs.readdirSync(dir)
            .filter(file => file.endsWith(".desktop"))
            .forEach(file => {
                const parsed = parseDesktopEntry(path.join(dir, file));
                if (parsed && !apps.has(parsed.id)) {
                    apps.set(parsed.id, parsed);
                }
            });
    });

    return Array.from(apps.values()).sort((a, b) => a.name.localeCompare(b.name));
}

let installedAppsCache = null;
let installedAppsCachePromise = null;

function getInstalledAppsCached(forceRefresh = false) {
    if (!forceRefresh && Array.isArray(installedAppsCache)) {
        return Promise.resolve(installedAppsCache);
    }
    if (!forceRefresh && installedAppsCachePromise) {
        return installedAppsCachePromise;
    }

    installedAppsCachePromise = Promise.resolve().then(() => {
        const apps = listInstalledApps();
        installedAppsCache = apps;
        return apps;
    }).finally(() => {
        installedAppsCachePromise = null;
    });

    return installedAppsCachePromise;
}

function launchDesktopApp(appId) {
    const app = listInstalledApps().find(entry => entry.id === appId);
    if (!app) {
        throw new Error(`Application "${appId}" not found`);
    }

    const launchers = [];
    if (app.terminal) {
        [
            ["x-terminal-emulator", ["-e", app.exec]],
            ["gnome-terminal", ["--", "sh", "-lc", app.exec]],
            ["konsole", ["-e", app.exec]],
            ["xfce4-terminal", ["-e", app.exec]],
            ["kitty", ["sh", "-lc", app.exec]],
            ["alacritty", ["-e", "sh", "-lc", app.exec]],
            ["xterm", ["-e", app.exec]]
        ].forEach(([command, args]) => {
            if (commandExists(command)) launchers.push({command, args});
        });
        launchers.push({command: "sh", args: ["-lc", app.exec]});
    } else {
        if (commandExists("gtk-launch")) launchers.push({command: "gtk-launch", args: [app.id]});
        if (commandExists("gio")) launchers.push({command: "gio", args: ["launch", app.filePath]});
        launchers.push({command: "sh", args: ["-lc", app.exec]});
    }

    let launched = false;
    let lastError = null;
    for (const launcher of launchers) {
        try {
            const child = cp.spawn(launcher.command, launcher.args, {
                cwd: os.homedir(),
                detached: true,
                stdio: "ignore"
            });
            child.on("error", error => {
                lastError = error;
            });
            child.unref();
            launched = true;
            break;
        } catch (error) {
            lastError = error;
        }
    }

    if (!launched) {
        throw lastError || new Error(`Could not launch "${app.name}"`);
    }
    return app;
}

function createWindow(settings) {
    signale.info("Creating window...");
    const allowWindowed = settings.allowWindowed !== false;
    const lockedFullscreen = allowWindowed ? (settings.forceFullscreen === true) : true;
    frontendReadyShown = false;

    let display;
    if (!isNaN(settings.monitor)) {
        display = electron.screen.getAllDisplays()[settings.monitor] || electron.screen.getPrimaryDisplay();
    } else {
        display = electron.screen.getPrimaryDisplay();
    }
    let {x, y, width, height} = display.workArea;

    win = new BrowserWindow({
        title: "EdexUi-2026",
        x,
        y,
        width,
        height,
        show: false,
        paintWhenInitiallyHidden: true,
        resizable: allowWindowed,
        movable: allowWindowed,
        fullscreen: lockedFullscreen,
        fullscreenable: allowWindowed,
        maximizable: allowWindowed,
        autoHideMenuBar: true,
        frame: allowWindowed,
        backgroundColor: '#000000',
        webPreferences: {
            devTools: true,
	    enableRemoteModule: true,
            contextIsolation: false,
            backgroundThrottling: false,
            webSecurity: true,
            nodeIntegration: true,
            nodeIntegrationInSubFrames: false,
            allowRunningInsecureContent: false,
            experimentalFeatures: settings.experimentalFeatures || false
        }
    });
    win.setBackgroundColor("#000000");
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'ui.html'),
        protocol: 'file:',
        slashes: true
    }));
    win.webContents.once("did-finish-load", () => {
        scheduleFrontendShowFallback(1500, "did-finish-load");
    });
    remoteMain.enable(win.webContents);

    signale.complete("Frontend window created!");
    if (!allowWindowed) {
        win.setResizable(false);
        win.setFullScreen(true);
    } else if (lockedFullscreen) {
        win.setFullScreen(true);
    } else if (!require(lastWindowStateFile)["useFullscreen"]) {
        win.setFullScreen(false);
        win.maximize();
    }

    signale.watch("Waiting for frontend connection...");
    scheduleFrontendShowFallback(8000, "startup-timeout");
}

app.on('ready', async () => {
    signale.pending(`Loading settings file...`);
    let settings = require(settingsFile);
    const settingsDefaults = {
        forceFullscreen: false,
        allowWindowed: true,
        keepGeometry: false,
        termHardwareAcceleration: false,
        termLigatures: false,
        enableVulkan: false,
        disableVulkan: false,
        optimizeVulkan: true,
        disableGlobe: false,
        disableUpdateCheck: false
    };
    let wroteSettingsDefaults = false;
    Object.keys(settingsDefaults).forEach(key => {
        if (typeof settings[key] === "undefined") {
            settings[key] = settingsDefaults[key];
            wroteSettingsDefaults = true;
        }
    });
    if (wroteSettingsDefaults) {
        fs.writeFileSync(settingsFile, JSON.stringify(settings, "", 4));
    }

    const resolvedStartDir = (
        typeof settings.cwd === "string"
        && settings.cwd.trim()
        && require("fs").existsSync(settings.cwd.trim())
    ) ? settings.cwd.trim() : os.homedir();
    if (Object.prototype.hasOwnProperty.call(settings, "cwd")) {
        delete settings.cwd;
        fs.writeFileSync(settingsFile, JSON.stringify(settings, "", 4));
    }

    signale.pending(`Resolving shell path...`);
    settings.shell = await which(settings.shell).catch(e => { throw(e) });
    signale.info(`Shell found at ${settings.shell}`);
    signale.success(`Settings loaded!`);

    // See #366
    let cleanEnv = await require("shell-env")(settings.shell).catch(e => { throw e; });
    const settingsEnv = parseSettingsEnv(settings.env);

    Object.assign(cleanEnv, {
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
        TERM_PROGRAM: "EdexUi-2026",
        TERM_PROGRAM_VERSION: app.getVersion()
    }, settingsEnv);

    const requestedPort = Number(settings.port) || 3000;
    const resolvedPort = await findAvailablePort(requestedPort);
    if (resolvedPort !== requestedPort) {
        signale.warn(`Port ${requestedPort} is busy, using ${resolvedPort} instead`);
        settings.port = resolvedPort;
        fs.writeFileSync(settingsFile, JSON.stringify(settings, "", 4));
    }

    signale.pending(`Creating new terminal process on port ${settings.port || '3000'}`);
    tty = new Terminal({
        role: "server",
        shell: settings.shell,
        params: parseShellArgs(settings.shellArgs),
        cwd: resolvedStartDir,
        env: cleanEnv,
        port: settings.port || 3000
    });
    signale.success(`Terminal back-end initialized!`);
    tty.onclosed = (code, signal) => {
        tty.ondisconnected = () => {};
        signale.complete("Terminal exited", code, signal);
        app.quit();
    };
    tty.onopened = () => {
        signale.success("Connected to frontend!");
        signale.timeEnd("Startup");
    };
    tty.onresized = (cols, rows) => {
        signale.info("Resized TTY to ", cols, rows);
    };
    tty.ondisconnected = () => {
        signale.error("Lost connection to frontend");
        signale.watch("Waiting for frontend connection...");
    };

    // Support for multithreaded systeminformation calls
    signale.pending("Starting multithreaded calls controller...");
    require("./_multithread.js");

    createWindow(settings);
    getInstalledAppsCached(false).catch(error => {
        signale.warn("Installed apps preload failed", error && (error.message || String(error)));
    });

    // Support for more terminals, used for creating tabs (currently limited to 4 extra terms)
    extraTtys = {};
    let basePort = settings.port || 3000;
    basePort = Number(basePort) + 2;

    for (let i = 0; i < 4; i++) {
        extraTtys[basePort+i] = null;
    }

    ipc.on("ttyspawn", (e, arg) => {
        const requestedCwd = (arg && typeof arg === "object" && typeof arg.cwd === "string" && arg.cwd.trim()) ? arg.cwd.trim() : null;
        const requestId = (arg && typeof arg === "object" && typeof arg.requestId === "string" && arg.requestId.trim()) ? arg.requestId.trim() : null;
        const replyChannel = requestId ? `ttyspawn-reply-${requestId}` : "ttyspawn-reply";
        const reply = message => {
            e.sender.send(replyChannel, message);
        };
        let port = null;
        Object.keys(extraTtys).forEach(key => {
            if (extraTtys[key] === null && port === null) {
                extraTtys[key] = {};
                port = key;
            }
        });

        if (port === null) {
            signale.error("TTY spawn denied (Reason: exceeded max TTYs number)");
            reply("ERROR: max number of ttys reached");
        } else {
            signale.pending(`Creating new TTY process on port ${port}`);
            let term = new Terminal({
                role: "server",
                shell: settings.shell,
                params: parseShellArgs(settings.shellArgs),
                cwd: requestedCwd || tty.tty._cwd || resolvedStartDir,
                env: cleanEnv,
                port: port
            });
            signale.success(`New terminal back-end initialized at ${port}`);
            term.onclosed = (code, signal) => {
                term.ondisconnected = () => {};
                term.wss.close();
                signale.complete(`TTY exited at ${port}`, code, signal);
                extraTtys[term.port] = null;
                term = null;
            };
            term.onopened = pid => {
                signale.success(`TTY ${port} connected to frontend (process PID ${pid})`);
            };
            term.onresized = () => {};
            term.ondisconnected = () => {
                term.onclosed = () => {};
                term.close();
                term.wss.close();
                extraTtys[term.port] = null;
                term = null;
            };

            extraTtys[port] = term;
            reply("SUCCESS: "+port);
        }
    });

    // Backend support for theme and keyboard hotswitch
    let themeOverride = null;
    let kbOverride = null;
    ipc.on("getThemeOverride", (e, arg) => {
        e.sender.send("getThemeOverride", themeOverride);
    });
    ipc.on("getKbOverride", (e, arg) => {
        e.sender.send("getKbOverride", kbOverride);
    });
    ipc.on("setThemeOverride", (e, arg) => {
        themeOverride = arg;
    });
    ipc.on("setKbOverride", (e, arg) => {
        kbOverride = arg;
    });
    ipc.on("frontend-ready", () => {
        // Keep hidden until renderer reports first painted boot frame.
    });
    ipc.on("frontend-painted", () => {
        showFrontendWindow();
    });
    ipc.on("appManager:getInstalledApps", e => {
        getInstalledAppsCached(false).then(apps => {
            e.sender.send("appManager:installedApps", apps);
        }).catch(error => {
            e.sender.send("appManager:installedApps", { error: error.message || String(error) });
        });
    });
    ipc.on("appManager:launch", (e, appId) => {
        try {
            const app = launchDesktopApp(appId);
            e.sender.send("appManager:launchResult", {
                ok: true,
                app
            });
        } catch (error) {
            e.sender.send("appManager:launchResult", {
                ok: false,
                error: error.message || String(error)
            });
        }
    });
});

app.on('web-contents-created', (e, contents) => {
    // Prevent creating more than one window
    contents.on('new-window', (e, url) => {
        e.preventDefault();
        shell.openExternal(url);
    });

    // Prevent loading something else than the UI
    contents.on('will-navigate', (e, url) => {
        if (url !== contents.getURL()) e.preventDefault();
    });
});

app.on('window-all-closed', () => {
    signale.info("All windows closed");
    clearFrontendShowFallback();
    app.quit();
});

app.on('before-quit', () => {
    tty.close();
    Object.keys(extraTtys).forEach(key => {
        if (extraTtys[key] !== null) {
            extraTtys[key].close();
        }
    });
    signale.complete("Shutting down...");
});
