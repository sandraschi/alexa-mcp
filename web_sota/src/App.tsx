import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppLayout } from '@/components/layout/app-layout';
import { Dashboard } from '@/pages/dashboard';
import { Chat } from '@/pages/chat';
import { Tools } from '@/pages/tools';
import { Help } from '@/pages/help';
import { Settings } from '@/pages/settings';

function App() {
  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/help" element={<Help />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: { background: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0' },
        }}
      />
    </Router>
  );
}

export default App;
