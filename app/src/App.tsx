import { Routes, Route, Navigate } from 'react-router-dom';
import MergePage from '@/pages/MergePage';
import EditorPage from '@/pages/EditorPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MergePage />} />
      <Route path="/editor" element={<EditorPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
