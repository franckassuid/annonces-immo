import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import AddWizard from './components/AddWizard';
import AnnonceDetails from './components/AnnonceDetails';
import { useAnnonces } from './hooks/useAnnonces';
import { useToast } from './hooks/useToast';

export default function App() {
  const { annonces, loading } = useAnnonces();
  const { toast, showToast }  = useToast();

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={<Home annonces={annonces} loading={loading} toast={toast} showToast={showToast} syncState="ok" />} 
        />
        <Route 
          path="/add" 
          element={<AddWizard onToast={showToast} />} 
        />
        <Route 
          path="/annonce/:id" 
          element={<AnnonceDetails onToast={showToast} />} 
        />
      </Routes>
      
      {toast && <div className="toast">{toast}</div>}
    </BrowserRouter>
  );
}
