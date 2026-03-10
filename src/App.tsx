import React, { useState } from 'react';
import { Database, BarChart3, Activity, HeartPulse } from 'lucide-react';
import GeneralReport from './pages/LKST';
import RealtimeReport from './pages/RTST';
import UpdateData from './pages/UpData';
import StaffHealth from './pages/SKNV';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'general' | 'realtime' | 'update' | 'staff'>('update');

  return (
    <div>
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 md:px-8">
        <div className="max-w-6xl mx-auto h-14 flex items-center justify-between">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar py-2">
            <button 
              onClick={() => setCurrentPage('update')}
              className={`flex items-center gap-2 text-sm font-black whitespace-nowrap transition-colors duration-200 ${currentPage === 'update' ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600'}`}
            >
              <Database size={16} /> Cập nhật Data
            </button>
            <span className="text-slate-300">•</span>
            <button 
              onClick={() => setCurrentPage('general')}
              className={`flex items-center gap-2 text-sm font-black whitespace-nowrap transition-colors duration-200 ${currentPage === 'general' ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600'}`}
            >
              <BarChart3 size={16} /> Bi Luỹ Kế Tổng Hợp
            </button>
            <span className="text-slate-300">•</span>
            <button 
              onClick={() => setCurrentPage('realtime')}
              className={`flex items-center gap-2 text-sm font-black whitespace-nowrap transition-colors duration-200 ${currentPage === 'realtime' ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600'}`}
            >
              <Activity size={16} /> Bi Realtime Siêu Thị
            </button>
            <span className="text-slate-300">•</span>
            <button 
              onClick={() => setCurrentPage('staff')}
              className={`flex items-center gap-2 text-sm font-black whitespace-nowrap transition-colors duration-200 ${currentPage === 'staff' ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600'}`}
            >
              <HeartPulse size={16} /> Sức Khoẻ Nhân Viên
            </button>
          </div>
        </div>
      </div>
      
      {currentPage === 'update' && <UpdateData onNavigate={setCurrentPage} />}
      {currentPage === 'general' && <GeneralReport onNavigate={setCurrentPage} />}
      {currentPage === 'realtime' && <RealtimeReport />}
      {currentPage === 'staff' && <StaffHealth onNavigate={setCurrentPage} />}
    </div>
  );
}
