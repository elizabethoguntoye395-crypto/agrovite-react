import React, { useState, useEffect } from "react";
import App from "./App";
import AdminDashboard from "./AdminDashboard";

/* Shows AdminDashboard when the URL path starts with "/admin",
   otherwise shows the public App. Also listens for back/forward
   navigation (popstate) so it stays correct without a full reload. */
export default function Root() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return path.startsWith("/admin") ? <AdminDashboard /> : <App />;
}
