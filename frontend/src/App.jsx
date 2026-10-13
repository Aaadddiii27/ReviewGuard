import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import PullRequests from './pages/PullRequests';
import ReviewDetails from './pages/ReviewDetails';
import FindingsExplorer from './pages/FindingsExplorer';
import AnalyticsView from './pages/AnalyticsView';
import BenchmarkView from './pages/BenchmarkView';
import SettingsView from './pages/SettingsView';
import TriggerReviewModal from './components/TriggerReviewModal';

function AppContent() {
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleReviewSuccess = (reviewResult) => {
    if (reviewResult && reviewResult.id) {
      navigate(`/reviews/${reviewResult.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col text-slate-100">
      <Navbar onTriggerClick={() => setModalOpen(true)} />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-65px)]">
          <Routes>
            <Route path="/" element={<Dashboard onTriggerClick={() => setModalOpen(true)} />} />
            <Route path="/pulls" element={<PullRequests />} />
            <Route path="/reviews/:id" element={<ReviewDetails />} />
            <Route path="/findings" element={<FindingsExplorer />} />
            <Route path="/analytics" element={<AnalyticsView />} />
            <Route path="/benchmark" element={<BenchmarkView />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
        </main>
      </div>

      <TriggerReviewModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onReviewSuccess={handleReviewSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
