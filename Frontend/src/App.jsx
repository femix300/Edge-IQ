import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./components/DashboardLayout";
import OverviewPage from "./pages/OverviewPage";
import SignalsPage from "./pages/SignalsPage";
import MarketDetailPage from "./pages/MarketDetailPage";
import BacktesterPage from "./pages/BacktesterPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="/signals" element={<SignalsPage />} />
          <Route path="/markets/:marketId" element={<MarketDetailPage />} />
          <Route path="/backtester" element={<BacktesterPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
