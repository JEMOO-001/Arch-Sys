import React from 'react';
import { motion } from 'framer-motion';
import { Map, Home, Search, Globe, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8f8f8] flex flex-col font-sans text-[#323232]">
      {/* Fake Esri-style Thin Top Bar */}
      <div className="h-1 bg-blue-600 w-full" />
      
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative mb-8"
        >
          {/* Stylized GIS Grid Background */}
          <div className="absolute inset-0 -m-20 opacity-5 pointer-events-none">
            <div className="h-full w-full" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
          </div>

          <div className="relative">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-50 mb-6">
              <MapPin className="h-12 w-12 text-blue-600" />
            </div>
            
            <h1 className="text-5xl font-extrabold text-[#2b2b2b] mb-4 tracking-tight">
              404
            </h1>
            <h2 className="text-2xl font-bold text-[#4c4c4c] mb-6">
              This location is off the map.
            </h2>
            <p className="text-lg text-[#565656] mb-10 max-w-lg mx-auto leading-relaxed">
              The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={() => navigate('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-md font-bold transition-all shadow-lg flex items-center gap-2 text-lg"
            >
              <Home className="h-5 w-5" />
              Return to Dashboard
            </Button>
          </div>
        </motion.div>

        {/* Bottom stylized elements */}
        <div className="mt-12 pt-12 border-t border-gray-200 w-full grid grid-cols-1 md:grid-cols-3 gap-8 opacity-60">
          <div className="flex flex-col items-center gap-2">
            <Search className="h-5 w-5 text-gray-400" />
            <span className="text-xs font-bold uppercase tracking-widest">Verify ID</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Map className="h-5 w-5 text-gray-400" />
            <span className="text-xs font-bold uppercase tracking-widest">Check Layout</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Globe className="h-5 w-5 text-gray-400" />
            <span className="text-xs font-bold uppercase tracking-widest">Null Island</span>
          </div>
        </div>
      </main>

      {/* Esri-style Footer lookalike */}
      <footer className="p-8 bg-white border-t border-gray-200 text-center">
        <p className="text-xs text-gray-400 font-medium tracking-tight">
          &copy; 2026 Sentinel Archiving System | Powered by ArcGIS Pro Technology
        </p>
      </footer>
    </div>
  );
};
