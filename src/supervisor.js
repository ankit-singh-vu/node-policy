const { fork } = require("node:child_process");
const pidusage = require("pidusage");
const path = require("node:path");
const serverPath = path.join(__dirname, "server.js");
const threshold = 70;
let child;
let checking = false;
let stopping = false;

function start() {
  if (stopping) return;
  child = fork(serverPath, [], { stdio: "inherit" });
  const monitoredChild = child;
  const timer = setInterval(async () => {
    if (
      checking ||
      monitoredChild !== child ||
      !child ||
      child.exitCode !== null
    )
      return;
    checking = true;
    try {
      const stats = await pidusage(child.pid);
      const cpu = stats.cpu / require("node:os").cpus().length;
      if (cpu >= threshold) {
        console.warn(
          `Server CPU usage ${cpu.toFixed(1)}% reached ${threshold}%; restarting.`,
        );
        child.kill("SIGTERM");
      }
    } catch (error) {
      if (error.code !== "ESRCH")
        console.error("CPU monitor error:", error.message);
    } finally {
      checking = false;
    }
  }, 1000);
  monitoredChild.once("exit", (code, signal) => {
    clearInterval(timer);
    if (!stopping) {
      console.warn(`API process exited (${signal || code}); restarting.`);
      setTimeout(start, 1000);
    }
  });
}

process.once("SIGINT", () => {
  stopping = true;
  child?.kill("SIGTERM");
});
process.once("SIGTERM", () => {
  stopping = true;
  child?.kill("SIGTERM");
});
start();
