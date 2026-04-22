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
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pixel-grid opacity-30 pointer-events-none z-0"></div>
      <div className="fixed top-[-10%] right-[-5%] w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] left-[-5%] w-96 h-96 bg-secondary-container/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      
      {/* Cinematic Entrance: Pixel Poké Ball */}
      <div className="intro-pokeball fixed inset-0 flex items-center justify-center z-[100] pointer-events-none">
        <div className="intro-pokeball-inner w-32 h-32 md:w-48 md:h-48 relative">
          <div className="pokeball-graphic"></div>
          {/* Decorative pixel dots */}
          <div className="absolute -top-4 -left-4 w-4 h-4 bg-primary"></div>
          <div className="absolute -bottom-4 -right-4 w-4 h-4 bg-white"></div>
        </div>
      </div>
      
      {/* Watermark Background */}
      <div className="main-content fixed inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="watermark-pokeball opacity-20">
          <div className="pokeball-graphic w-full h-full grayscale opacity-20 border-[#2d3449]"></div>
        </div>
      </div>

      <div className="main-content relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
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
      </div>
    </Router>
  );
}

export default App;
