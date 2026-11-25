import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import Home from "./pages/Home";
import Placeholder from "./pages/Placeholder";

// WebLLM is large, so the lab only loads when someone opens it.
const ModelLab = lazy(() => import("./pages/ModelLab"));

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route
          path="today"
          element={<Placeholder title="Today's match" body="Your daily match will show up here." />}
        />
        <Route path="chats" element={<Placeholder title="Chats" body="Conversations with your matches live here." />} />
        <Route path="profile" element={<Placeholder title="Profile" body="Edit your preferences and what you share." />} />
        <Route
          path="lab"
          element={
            <Suspense fallback={<p className="text-muted">Loading model lab…</p>}>
              <ModelLab />
            </Suspense>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
