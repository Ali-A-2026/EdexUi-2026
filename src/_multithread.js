const cluster = require("cluster");

if (cluster.isMaster) {
    const electron = require("electron");
    const ipc = electron.ipcMain;
    const signale = require("signale");
    const path = require("path");
    // Also, leave a core available for the renderer process
    const osCPUs = require("os").cpus().length - 1;
    // See #904
    const numCPUs = Math.max(0, (osCPUs > 7) ? 7 : osCPUs);

    const si = require("systeminformation");

    cluster.setupMaster({
        exec: path.join(__dirname, "_multithread.js")
    });

    let workers = [];

    function syncWorkers() {
        workers = Object.values(cluster.workers || {})
            .filter(worker => worker && worker.isConnected())
            .map(worker => worker.id);
    }

    function forkWorker() {
        const worker = cluster.fork();
        worker.on("error", error => {
            signale.warn(`Multithread worker ${worker.id} error: ${error.message || error}`);
        });
        return worker;
    }

    cluster.on("fork", () => {
        syncWorkers();
    });
    cluster.on("online", () => {
        syncWorkers();
    });
    cluster.on("disconnect", worker => {
        signale.warn(`Multithread worker ${worker.id} disconnected`);
        syncWorkers();
    });
    cluster.on("exit", worker => {
        signale.warn(`Multithread worker ${worker.id} exited`);
        syncWorkers();
        if (numCPUs > 0) {
            forkWorker();
        }
    });

    for (let i = 0; i < numCPUs; i++) {
        forkWorker();
    }

    signale.success("Multithreaded controller ready");

    let lastID = -1;
    const queue = {};

    function flushQueue(id, sender, res) {
        try {
            if (sender && !sender.isDestroyed()) {
                sender.send(`systeminformation-reply-${id}`, res);
            }
        } catch (error) {
            // Window has been closed, ignore.
        } finally {
            delete queue[id];
        }
    }

    function dispatch(type, id, arg) {
        syncWorkers();
        if (workers.length <= 0) return false;

        lastID = (lastID + 1) % workers.length;
        const worker = cluster.workers[workers[lastID]];
        if (!worker || !worker.isConnected()) {
            syncWorkers();
            return false;
        }

        try {
            worker.send(JSON.stringify({ id, type, arg }), error => {
                if (!error) return;
                signale.warn(`Failed to dispatch multithread task ${id}: ${error.message || error}`);
                const sender = queue[id];
                if (!sender) return;
                si[type](arg).then(res => flushQueue(id, sender, res)).catch(fallbackError => {
                    signale.warn(`Fallback systeminformation call failed for ${type}: ${fallbackError.message || fallbackError}`);
                    flushQueue(id, sender, null);
                });
            });
            return true;
        } catch (error) {
            signale.warn(`Dispatch threw for multithread task ${id}: ${error.message || error}`);
            return false;
        }
    }

    ipc.on("systeminformation-call", (e, type, id, ...args) => {
        if (!si[type]) {
            signale.warn("Illegal request for systeminformation");
            return;
        }

        if (args.length > 1 || workers.length <= 0) {
            si[type](...args).then(res => {
                if (e.sender) {
                    e.sender.send(`systeminformation-reply-${id}`, res);
                }
            }).catch(error => {
                signale.warn(`systeminformation direct call failed for ${type}: ${error.message || error}`);
                if (e.sender && !e.sender.isDestroyed()) {
                    e.sender.send(`systeminformation-reply-${id}`, null);
                }
            });
        } else {
            queue[id] = e.sender;
            if (!dispatch(type, id, args[0])) {
                si[type](args[0]).then(res => flushQueue(id, e.sender, res)).catch(error => {
                    signale.warn(`systeminformation fallback failed for ${type}: ${error.message || error}`);
                    flushQueue(id, e.sender, null);
                });
            }
        }
    });

    cluster.on("message", (_worker, msg) => {
        try {
            msg = JSON.parse(msg);
        } catch (_error) {
            return;
        }
        flushQueue(msg.id, queue[msg.id], msg.res);
    });
} else if (cluster.isWorker) {
    const signale = require("signale");
    const si = require("systeminformation");

    signale.info("Multithread worker started at " + process.pid);

    process.on("disconnect", () => {
        process.exit(0);
    });

    process.on("message", msg => {
        try {
            msg = JSON.parse(msg);
        } catch (_error) {
            return;
        }

        si[msg.type](msg.arg).then(res => {
            if (!process.connected) return;
            try {
                process.send(JSON.stringify({
                    id: msg.id,
                    res
                }), error => {
                    if (error && error.code !== "EPIPE") {
                        signale.warn(`Worker ${process.pid} failed to send reply: ${error.message || error}`);
                    }
                });
            } catch (error) {
                if (error.code !== "EPIPE") {
                    signale.warn(`Worker ${process.pid} send threw: ${error.message || error}`);
                }
            }
        }).catch(error => {
            signale.warn(`Worker ${process.pid} systeminformation call failed: ${error.message || error}`);
            if (!process.connected) return;
            try {
                process.send(JSON.stringify({
                    id: msg.id,
                    res: null
                }));
            } catch (_sendError) {
                // ignore closed pipes
            }
        });
    });
}
