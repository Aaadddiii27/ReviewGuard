import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import PullRequests from './pages/PullRequests';
import ReviewDetails from './pages/ReviewDetails';
import FindingsExplorer from './pages/FindingsExplorer';
import AnalyticsView from './pages/AnalyticsView';
import BenchmarkView from './pages/BenchmarkView';
import SettingsView from './pages/SettingsView';
import RepositoriesView from './pages/RepositoriesView';
import ManualReviewView from './pages/ManualReviewView';
import LoginView from './pages/LoginView';
import TriggerReviewModal from './components/TriggerReviewModal';
import { Toaster } from './components/ui/toaster';
import type { Review } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

function AppContent() {
  const [modalOpen, setModalOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleReviewSuccess = (reviewResult: Review) => {
    if (reviewResult && reviewResult.id) {
      navigate(`/reviews/${reviewResult.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col text-slate-100">
      <Navbar
        onTriggerClick={() => setModalOpen(true)}
        onMenuClick={() => setMobileSidebarOpen(true)}
      />
      <div className="flex flex-1">
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-65px)]">
          <Routes>
            <Route path="/" element={<Dashboard onTriggerClick={() => setModalOpen(true)} />} />
            <Route path="/repos" element={<RepositoriesView />} />
            <Route path="/manual" element={<ManualReviewView />} />
            <Route path="/pulls" element={<PullRequests />} />
            <Route path="/reviews/:id" element={<ReviewDetails />} />
            <Route path="/findings" element={<FindingsExplorer />} />
            <Route path="/analytics" element={<AnalyticsView />} />
            <Route path="/benchmark" element={<BenchmarkView />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="/login" element={<LoginView />} />
          </Routes>
        </main>
      </div>

      <TriggerReviewModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onReviewSuccess={handleReviewSuccess}
      />
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
