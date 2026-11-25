import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import OnboardingLayout from "./components/OnboardingLayout";
import Home from "./pages/Home";
import Today from "./pages/Today";
import MatchProfile from "./pages/MatchProfile";
import Chats from "./pages/Chats";
import Chat from "./pages/Chat";
import DatePlanner from "./pages/DatePlanner";
import Placeholder from "./pages/Placeholder";
import Profile from "./pages/Profile";
import Welcome from "./pages/onboarding/Welcome";
import Setup from "./pages/onboarding/Setup";
import QuickChat from "./pages/onboarding/QuickChat";
import { useStore } from "./state/store";

// WebLLM is large, so the lab only loads when someone opens it.
const ModelLab = lazy(() => import("./pages/ModelLab"));

/** Sends people who haven't finished setup to the welcome screen. */
function RequireOnboarded({ children }: { children: ReactNode }) {
  const { state } = useStore();
  return state.onboarded ? children : <Navigate to="/welcome" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<OnboardingLayout />}>
        <Route path="welcome" element={<Welcome />} />
        <Route path="setup" element={<Setup />} />
        <Route path="setup/chat" element={<QuickChat />} />
      </Route>

      <Route
        element={
          <RequireOnboarded>
            <AppShell />
          </RequireOnboarded>
        }
      >
        <Route index element={<Home />} />
        <Route path="today" element={<Today />} />
        <Route path="match/:id" element={<MatchProfile />} />
        <Route path="match/:id/plan" element={<DatePlanner />} />
        <Route
          path="match/:id/reflect"
          element={<Placeholder title="How did it go?" body="The after-date reflection arrives in M5." />}
        />
        <Route path="chats" element={<Chats />} />
        <Route path="chats/:id" element={<Chat />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route
        path="lab"
        element={
          <AppShell />
        }
      >
        <Route
          index
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
