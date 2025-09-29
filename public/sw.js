/**
 * Service Worker for StudyHub PWA
 * Phase 7: Push notifications and offline functionality
 */

const CACHE_NAME = "studyhub-v1";
const API_CACHE = "studyhub-api-v1";
const STATIC_CACHE = "studyhub-static-v1";

// Resources to cache on install
const STATIC_RESOURCES = [
  "/",
  "/dashboard",
  "/courses",
  "/resources",
  "/profile",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/badge-72x72.png",
  "/favicon.ico",
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /^\/api\/courses/,
  /^\/api\/resources/,
  /^\/api\/user/,
];

// Install event - cache static resources
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker");

  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log("[SW] Caching static resources");
        return cache.addAll(STATIC_RESOURCES);
      }),
      self.skipWaiting(),
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker");

  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== CACHE_NAME &&
              cacheName !== API_CACHE &&
              cacheName !== STATIC_CACHE
            ) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim(),
    ])
  );
});

// Fetch event - network with cache fallback strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip chrome-extension requests
  if (url.protocol === "chrome-extension:") {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static resources
  if (STATIC_RESOURCES.some((resource) => url.pathname === resource)) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Handle other requests with network first strategy
  event.respondWith(handleNetworkFirst(request));
});

// Push notification event
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");

  if (!event.data) {
    console.log("[SW] No push data received");
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (error) {
    console.error("[SW] Error parsing push data:", error);
    return;
  }

  const { title, body, icon, badge, data: notificationData, actions } = data;

  const options = {
    body,
    icon: icon || "/icons/icon-192x192.png",
    badge: badge || "/icons/badge-72x72.png",
    data: notificationData,
    actions: actions || [],
    requireInteraction:
      notificationData?.priority === "HIGH" ||
      notificationData?.priority === "URGENT",
    silent: notificationData?.priority === "LOW",
    tag: notificationData?.groupKey || "default",
    timestamp: Date.now(),
    vibrate: notificationData?.priority === "URGENT" ? [200, 100, 200] : [100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked");

  event.notification.close();

  const { data } = event.notification;
  let urlToOpen = "/dashboard";

  if (event.action === "open" && data?.actionUrl) {
    urlToOpen = data.actionUrl;
  } else if (data?.actionUrl) {
    urlToOpen = data.actionUrl;
  }

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && "focus" in client) {
            return client.focus();
          }
        }

        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );

  // Mark notification as read if we have the notification ID
  if (data?.notificationId) {
    event.waitUntil(markNotificationAsRead(data.notificationId));
  }
});

// Background sync event
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync triggered:", event.tag);

  if (event.tag === "notification-sync") {
    event.waitUntil(syncNotifications());
  } else if (event.tag === "offline-actions") {
    event.waitUntil(syncOfflineActions());
  }
});

// Handle API requests with cache strategies
async function handleApiRequest(request) {
  const url = new URL(request.url);

  // Check if this API should be cached
  const shouldCache = API_CACHE_PATTERNS.some((pattern) =>
    pattern.test(url.pathname)
  );

  if (!shouldCache) {
    return fetch(request);
  }

  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful response
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log(
      "[SW] Network failed for API request, trying cache:",
      url.pathname
    );

    // Fallback to cache
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response
    return new Response(
      JSON.stringify({
        error: "Offline",
        message: "This request requires an internet connection",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Handle static resource requests
async function handleStaticRequest(request) {
  // Try cache first for static resources
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log("[SW] Failed to fetch static resource:", request.url);

    // Return a basic offline page for HTML requests
    if (request.headers.get("accept")?.includes("text/html")) {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>StudyHub - Offline</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              text-align: center; 
              padding: 50px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              min-height: 100vh;
              margin: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-direction: column;
            }
            .offline-container {
              background: rgba(255, 255, 255, 0.1);
              padding: 40px;
              border-radius: 20px;
              backdrop-filter: blur(10px);
            }
            .offline-icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            .offline-title {
              font-size: 32px;
              margin-bottom: 16px;
              font-weight: bold;
            }
            .offline-message {
              font-size: 18px;
              opacity: 0.9;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="offline-icon">📚</div>
            <h1 class="offline-title">StudyHub</h1>
            <p class="offline-message">
              You're currently offline.<br>
              Some features may not be available.
            </p>
          </div>
        </body>
        </html>`,
        {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    throw error;
  }
}

// Network first strategy with cache fallback
async function handleNetworkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

// Sync notifications when online
async function syncNotifications() {
  console.log("[SW] Syncing notifications");

  try {
    // Sync any offline notification actions
    const offlineActions = await getOfflineActions();

    for (const action of offlineActions) {
      try {
        await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body,
        });

        // Remove successful action from offline storage
        await removeOfflineAction(action.id);
      } catch (error) {
        console.error("[SW] Failed to sync action:", error);
      }
    }
  } catch (error) {
    console.error("[SW] Error syncing notifications:", error);
  }
}

// Sync offline actions
async function syncOfflineActions() {
  console.log("[SW] Syncing offline actions");

  try {
    const actions = await getOfflineActions();

    for (const action of actions) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body,
        });

        if (response.ok) {
          await removeOfflineAction(action.id);
        }
      } catch (error) {
        console.error("[SW] Failed to sync offline action:", error);
      }
    }
  } catch (error) {
    console.error("[SW] Error syncing offline actions:", error);
  }
}

// Mark notification as read
async function markNotificationAsRead(notificationId) {
  try {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "markAsRead",
        notificationId,
      }),
    });
  } catch (error) {
    console.error("[SW] Failed to mark notification as read:", error);

    // Store action for later sync
    await storeOfflineAction({
      id: `mark-read-${notificationId}-${Date.now()}`,
      url: "/api/notifications",
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "markAsRead",
        notificationId,
      }),
    });
  }
}

// IndexedDB helpers for offline actions
async function getOfflineActions() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("StudyHubOffline", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(["actions"], "readonly");
      const store = transaction.objectStore("actions");
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("actions")) {
        db.createObjectStore("actions", { keyPath: "id" });
      }
    };
  });
}

async function storeOfflineAction(action) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("StudyHubOffline", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(["actions"], "readwrite");
      const store = transaction.objectStore("actions");
      const addRequest = store.put(action);

      addRequest.onsuccess = () => resolve(addRequest.result);
      addRequest.onerror = () => reject(addRequest.error);
    };
  });
}

async function removeOfflineAction(actionId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("StudyHubOffline", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(["actions"], "readwrite");
      const store = transaction.objectStore("actions");
      const deleteRequest = store.delete(actionId);

      deleteRequest.onsuccess = () => resolve(deleteRequest.result);
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

console.log("[SW] Service worker loaded");
