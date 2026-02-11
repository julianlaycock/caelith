import { execSync } from 'child_process';

function getPortArg() {
  const arg = process.argv[2];
  const parsed = Number(arg);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 3001;
}

function unique(values) {
  return [...new Set(values)];
}

function killOnWindows(port) {
  const cmd = `powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue; if ($c) { $c | Select-Object -ExpandProperty OwningProcess -Unique }"`;
  let out = '';
  try {
    out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return;
  }
  if (!out) return;

  const pids = unique(
    out
      .split(/\r?\n/)
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isInteger(v) && v > 0 && v !== process.pid)
  );

  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: ['ignore', 'ignore', 'ignore'] });
      console.log(`[free-port] Killed PID ${pid} on port ${port}`);
    } catch {
      // Ignore if process exited between detection and kill.
    }
  }
}

function killOnUnix(port) {
  let out = '';
  try {
    out = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return;
  }
  if (!out) return;

  const pids = unique(
    out
      .split(/\r?\n/)
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isInteger(v) && v > 0 && v !== process.pid)
  );

  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
      console.log(`[free-port] Sent SIGTERM to PID ${pid} on port ${port}`);
    } catch {
      // Ignore if process exited between detection and kill.
    }
  }
}

const port = getPortArg();

if (process.platform === 'win32') {
  killOnWindows(port);
} else {
  killOnUnix(port);
}
