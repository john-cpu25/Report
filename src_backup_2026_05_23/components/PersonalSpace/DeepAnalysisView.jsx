import React from 'react';
import { motion } from 'framer-motion';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { PieChart, BarChart2 } from 'lucide-react';

const DeepAnalysisView = ({ deepAnalysisData, selectedTimeMetric }) => {
  return (
    <div className="flex flex-col gap-[15px] animate-in fade-in duration-1000 slide-in-from-bottom-4">
      {/* Main Trend Chart Card */}
      <div className="bg-[var(--bg-card)] backdrop-blur-2xl border border-[var(--border)] rounded-xl overflow-hidden shadow-xl">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-[14px] font-black text-[var(--text-muted)] uppercase">Operational Pulse</span>
              </div>
              <h3 className="text-[14px] font-black text-[var(--text-contrast)] uppercase">Performance Trend</h3>
            </div>
            <div className="flex items-center gap-6 bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border)] shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-6 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.3)]" />
                <span className="text-[14px] font-black text-indigo-500 uppercase">T1 Duration</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-0.5 border-t-2 border-amber-500 border-dashed" />
                <span className="text-[14px] font-black text-amber-500 uppercase">Moving Avg (3P)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                <span className="text-[14px] font-black text-emerald-500 uppercase">T2 Completion</span>
              </div>
            </div>
          </div>
          <div className="h-[320px] w-full">
            <Line 
              data={{
                labels: deepAnalysisData?.trendLabels || [],
                datasets: [
                  {
                    label: 'T1 Duration',
                    data: deepAnalysisData?.t1Data || [],
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 4,
                    pointRadius: 5,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: 'var(--bg-card)',
                    pointBorderWidth: 2,
                    tension: 0.4,
                    fill: true
                  },
                  {
                    label: 'Moving Average',
                    data: deepAnalysisData?.movingAvg || [],
                    borderColor: '#f59e0b',
                    borderWidth: 2,
                    borderDash: [8, 4],
                    pointRadius: 0,
                    tension: 0.4,
                    fill: false
                  },
                  {
                    label: 'T2 Completion',
                    data: deepAnalysisData?.t2Data || [],
                    borderColor: '#10b981',
                    borderWidth: 4,
                    pointRadius: 5,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: 'var(--bg-card)',
                    pointBorderWidth: 2,
                    tension: 0.4,
                    fill: false
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: 'var(--bg-card)',
                    titleColor: 'var(--text-contrast)',
                    bodyColor: 'var(--text-main)',
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 12 },
                    padding: 15,
                    cornerRadius: 12,
                    borderColor: 'var(--border)',
                    borderWidth: 1
                  }
                },
                scales: {
                  x: { grid: { display: false }, ticks: { color: 'var(--text-muted)', font: { size: 12, weight: 'medium' }, opacity: 0.5 } },
                  y: { 
                    grid: { color: 'rgba(148, 163, 184, 0.05)', drawBorder: false }, 
                    ticks: { color: 'var(--text-muted)', font: { size: 12 }, callback: v => v.toFixed(2) + 'h', opacity: 0.5 } 
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Interactive Layer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[15px]">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 shadow-sm h-[480px] flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-[14px] font-black text-[var(--text-contrast)] uppercase">Project Distribution</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <PieChart size={18} className="text-indigo-500" />
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <div className="relative w-[360px] h-[360px] flex items-center justify-center" style={{ perspective: '2000px' }}>
              <div className="absolute inset-0 bg-indigo-500/5 rounded-full blur-[100px] animate-pulse" />
              
              <div 
                className="w-full h-full"
                style={{ 
                  transform: 'rotateX(65deg) rotateY(0deg)',
                  transformStyle: 'preserve-3d',
                }}
              >
                <motion.div 
                  className="w-full h-full"
                  animate={{ rotateZ: 360 }}
                  transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                >
                  <Doughnut 
                    data={{
                      labels: deepAnalysisData?.projectLabels || [],
                      datasets: [{
                        data: deepAnalysisData?.projectCounts || [],
                        backgroundColor: [
                          '#6366f1', '#10b981', '#f59e0b', '#3b82f6', 
                          '#f43f5e', '#8b5cf6', '#06b6d4', '#f97316'
                        ],
                        borderWidth: 0,
                        hoverOffset: 40,
                        cutout: '80%',
                        borderRadius: 10
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { 
                        legend: { display: false },
                        tooltip: { enabled: true }
                      },
                      animation: { animateScale: true, animateRotate: true }
                    }}
                  />
                </motion.div>
              </div>
              
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div 
                  className="w-32 h-32 rounded-full relative shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center overflow-hidden"
                  style={{
                    background: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #e0e7ff 20%, #818cf8 60%, #4338ca 100%)',
                    boxShadow: 'inset -10px -10px 30px rgba(0,0,0,0.5), 0 0 40px rgba(99, 102, 241, 0.4)',
                    transform: 'translateZ(60px)'
                  }}
                >
                  <div className="absolute top-[15%] left-[15%] w-8 h-6 bg-white/40 blur-[4px] rounded-full rotate-[45deg]" />
                  
                  <div className="relative z-10 flex flex-col items-center">
                    <span className="text-[14px] font-black text-white/70 uppercase tracking-widest leading-none">Global</span>
                    <span className="text-[36px] font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] leading-none my-1">
                      {deepAnalysisData?.projectLabels.length || 0}
                    </span>
                    <span className="text-[14px] font-bold text-indigo-100 uppercase tracking-tighter opacity-80">Projects</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {deepAnalysisData?.projectLabels.map((label, i) => (
              <div key={label} className="group flex items-center gap-2 bg-indigo-500/5 border border-white/5 px-4 py-2 rounded-xl transition-all hover:bg-indigo-500/20 hover:scale-110 cursor-pointer">
                <div className="w-2.5 h-2.5 rounded-full shadow-lg" style={{ backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#f43f5e', '#8b5cf6', '#06b6d4', '#f97316'][i] }} />
                <span className="text-[14px] font-black text-[var(--text-muted)] group-hover:text-indigo-400 transition-colors">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 shadow-sm h-[480px] flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-[14px] font-black text-[var(--text-contrast)] uppercase">Workload Analysis</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <BarChart2 size={18} className="text-emerald-400" />
            </div>
          </div>
          <div className="flex-1">
            <Bar 
              data={{
                labels: deepAnalysisData?.userLabels || [],
                datasets: [{
                  label: 'Total Tasks',
                  data: deepAnalysisData?.userCounts || [],
                  backgroundColor: 'rgba(99, 102, 241, 0.4)',
                  borderColor: '#6366f1',
                  borderWidth: 2,
                  borderRadius: 8,
                  hoverBackgroundColor: '#6366f1',
                  barThickness: 35
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false }, ticks: { color: 'var(--text-muted)', font: { size: 12, weight: 'medium' }, opacity: 0.5 } },
                  y: { grid: { color: 'rgba(148, 163, 184, 0.05)', drawBorder: false }, ticks: { color: 'var(--text-muted)', font: { size: 12 }, opacity: 0.5 } }
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeepAnalysisView;
