import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import LoginPage from "./features/auth/pages/LoginPage";
import RegisterPage from "./features/auth/pages/RegisterPage";
import DashboardPage from "./features/dashboard/pages/DashboardPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<DashboardPage />} />
      </Routes>
    </Router>
  );
}

export default App;
