import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout       from './components/Layout';
import LoginPage    from './pages/LoginPage';
import Dashboard    from './pages/Dashboard';
import EvaluatePage from './pages/EvaluatePage';
import HackathonsPage from './pages/HackathonsPage';
import HackathonDetail from './pages/HackathonDetail';
import LeaderboardPage from './pages/LeaderboardPage';
import ComparePage  from './pages/ComparePage';
import HistoryPage  from './pages/HistoryPage';
import AssistantPage from './pages/AssistantPage';

function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}><div className="spinner"></div></div>;
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style: { background:'#0d1525', color:'#e2e8f0', border:'1px solid rgba(59,130,246,0.2)' }
        }} />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Private><Layout /></Private>}>
            <Route index element={<Dashboard />} />
            <Route path="evaluate"  element={<EvaluatePage />} />
            <Route path="hackathons" element={<HackathonsPage />} />
            <Route path="hackathons/:id" element={<HackathonDetail />} />
            <Route path="hackathons/:id/leaderboard" element={<LeaderboardPage />} />
            <Route path="compare"   element={<ComparePage />} />
            <Route path="history"   element={<HistoryPage />} />
            <Route path="assistant" element={<AssistantPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
