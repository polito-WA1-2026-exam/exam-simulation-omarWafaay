import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import SubwayMapBackground from './components/SubwayMapBackground.jsx';
import GuestRoute from './components/GuestRoute.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import GamePage from './pages/GamePage.jsx';
import InstructionsPage from './pages/InstructionsPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RankingPage from './pages/RankingPage.jsx';
import './layout.css';

export default function App() {
  return (
    <div className="app-shell">
      <SubwayMapBackground />
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<InstructionsPage />} />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/game"
            element={
              <ProtectedRoute>
                <GamePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ranking"
            element={
              <ProtectedRoute>
                <RankingPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
