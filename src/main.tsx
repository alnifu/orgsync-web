import React from "react";
import ReactDOM from "react-dom/client";
import Root from "./router";
import { AuthContextProvider } from "./context/AuthContext";

import "./index.css"; // TailwindCSS styles

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthContextProvider>
      <Root />
    </AuthContextProvider>
  </React.StrictMode>
);
