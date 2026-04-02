import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

let client = null;
let connected = false;
let connectingPromise = null;

function getWsBaseUrl() {
  // base REST is like http://localhost:8081/api; WS endpoint is /ws on same host
  const apiBase = process.env.REACT_APP_API_BASE_URL || "http://localhost:8081/api";
  return apiBase.replace(/\/api\/?$/, "");
}

export async function connectRealtime() {
  if (connected && client) return client;
  if (connectingPromise) return connectingPromise;

  connectingPromise = new Promise((resolve, reject) => {
    const wsBase = getWsBaseUrl();

    const c = new Client({
      webSocketFactory: () => new SockJS(`${wsBase}/ws`),
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {}
    });

    c.onConnect = () => {
      client = c;
      connected = true;
      resolve(c);
    };

    c.onStompError = (frame) => {
      reject(new Error(frame?.headers?.message || "Realtime connection failed"));
    };

    c.onWebSocketClose = () => {
      connected = false;
    };

    c.activate();
  }).finally(() => {
    connectingPromise = null;
  });

  return connectingPromise;
}

export async function subscribeTopic(topic, onMessage) {
  const c = await connectRealtime();
  const sub = c.subscribe(topic, (msg) => {
    try {
      const payload = JSON.parse(msg.body);
      onMessage(payload);
    } catch {
      onMessage(null);
    }
  });

  return () => {
    try {
      sub.unsubscribe();
    } catch {
      // ignore
    }
  };
}

export function disconnectRealtime() {
  if (!client) return;
  try {
    client.deactivate();
  } finally {
    client = null;
    connected = false;
    connectingPromise = null;
  }
}
