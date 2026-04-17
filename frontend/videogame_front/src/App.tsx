import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import LoginPage from "./features/auth/pages/LoginPage";
import RegisterPage from "./features/auth/pages/RegisterPage";
import DashboardPage from "./features/dashboard/pages/DashboardPage";
import { PokedexPage } from "./features/creatures/pages/PokedexPage";
import { InventoryPage } from "./features/inventory/pages/InventoryPage";
import { MatchmakingPage } from "./features/combat/pages/MatchmakingPage";
import { BattlePage } from "./features/combat/pages/BattlePage";
import LeaderboardPage from "./features/ranking/pages/LeaderboardPage";

function App() {
  return (
    <Router>
      <Toaster richColors position="top-center" theme="dark" closeButton />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/pokedex" element={<PokedexPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/matchmaking" element={<MatchmakingPage />} />
        <Route path="/battle/:battleId" element={<BattlePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/" element={<DashboardPage />} />
      </Routes>
    </Router>
  );
}

export default App;
