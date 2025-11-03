import React from "react";
import ReactDOM from "react-dom/client";
import Root from "./router";
import { AuthContextProvider } from "./context/AuthContext";

import "./index.css"; // TailwindCSS styles

// Register service worker for notifications
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then((registration) => {
      console.log('Service Worker registered successfully:', registration);
    })
    .catch((error) => {
      console.log('Service Worker registration failed:', error);
    });

  // Listen for navigation messages from service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data.type === 'navigate') {
      window.location.href = event.data.url;
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthContextProvider>
      <Root />
    </AuthContextProvider>
  </React.StrictMode>
);
