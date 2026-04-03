export function safeGetItem(key) {
  try {
    const localValue = localStorage.getItem(key);
    if (localValue !== null) return localValue;
  } catch {
    // Some environments block localStorage; fall back to sessionStorage.
  }

  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Some environments block localStorage; fall back to sessionStorage.
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // ignore
    }
  }
}

export function safeClear() {
  try {
    localStorage.clear();
  } catch {
    // ignore
  }
  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }
}

export function getStoredUser() {
  try {
    const raw = safeGetItem("user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function parseJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replaceAll("-", "+").replaceAll("_", "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isTokenExpired(token, skewSeconds = 30) {
  const payload = parseJwtPayload(token);
  const exp = Number(payload?.exp || 0);
  if (!exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return exp <= now + Math.max(0, Number(skewSeconds) || 0);
}
