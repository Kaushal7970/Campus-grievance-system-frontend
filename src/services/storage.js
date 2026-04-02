export function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    // Some environments block localStorage; fall back to sessionStorage.
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
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
