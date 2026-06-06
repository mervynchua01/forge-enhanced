import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import SignOut from "./pages/SignOut";
import ProjectSpace from "./components/ProjectSpace";
import Dashboard from "./components/Dashboard";
import { theme } from "./styles/theme";
import TaskPage from "./pages/TaskPage";

function RequireAuth({ children }) {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Navigate to="/signin" replace />;

  return children;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <AuthProvider>
        <Routes>
          {/* DEFAULT */}
          <Route path="/" element={<Navigate to="/signin" replace />} />

          {/* AUTH */}
          <Route path="/signup" element={<SignUp />} />

          <Route path="/signin" element={<SignIn />} />

          <Route path="/signout" element={<SignOut />} />

          {/* DASHBOARD LAYOUT */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          >
            <Route path="/projects" element={<ProjectSpace />} />
            <Route path="/tasks/:projectId" element={<TaskPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
