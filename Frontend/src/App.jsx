import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./hooks/useTheme";
import DashboardLayout from "./components/DashboardLayout";
import LandingPage from "./components/LandingPage";
import AuthPage from "./pages/AuthPage";
import MarketPulse from "./pages/MarketPulse";
import IntelligenceTerminal from "./pages/IntelligenceTerminal";
import QuantLab from "./pages/QuantLab";
import CommandersVault from "./pages/CommandersVault";
import PricingPage from "./pages/PricingPage";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/markets" element={<MarketPulse />} />
          <Route path="/analysis" element={<IntelligenceTerminal />} />
          <Route path="/analysis/:id" element={<IntelligenceTerminal />} />
          <Route path="/terminal/:id" element={<IntelligenceTerminal />} />
          <Route path="/quant-lab" element={<QuantLab />} />
          <Route path="/vault" element={<CommandersVault />} />
          <Route path="/pricing" element={<PricingPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
