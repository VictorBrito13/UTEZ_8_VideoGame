import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./auth/Login";
import Register from "./auth/Register";

// Un componente de ejemplo protegido
function ProtectedDashboard() {
  const token = localStorage.getItem("access_token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
        Welcome to the Dashboard
      </h1>
      <p className="mt-4 text-slate-400">You are successfully authenticated!</p>
      <button
        onClick={() => {
          localStorage.clear();
          window.location.reload();
        }}
        className="mt-8 px-6 py-2 border border-red-500/50 text-red-400 rounded hover:bg-red-500/10 transition-colors"
      >
        Logout
      </button>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<ProtectedDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
