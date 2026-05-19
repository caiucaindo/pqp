import { Routes, Route, Navigate } from 'react-router-dom';
import Home from '@/pages/Home';
import MergePage from '@/pages/MergePage';
import EditorPage from '@/pages/EditorPage';
import SplitPage from '@/pages/SplitPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/merge" element={<MergePage />} />
      <Route path="/editor" element={<EditorPage />} />
      <Route path="/split" element={<SplitPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
