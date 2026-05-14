import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Zap, Target, Users, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight,
  Activity, Layers, Award, Clock, FolderKanban, Search, CheckCircle2, AlertCircle
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useApp } from '../context/AppContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const Dashboard = () => {
  const { 
    dashboardProjects: projects, 
    dashboardUsers: users, 
    dashboardTasks: tasks, 
    dashboardLeave: leaves,
    isDashboardLoading: loading,
    dashboardStats: headerStats
  } = useApp();

  const stats = useMemo(() => {
    return {
      activeProjects: headerStats.activeProjects,
      intelligenceTasks: headerStats.totalTasks,
      activeAgents: new Set(tasks.map(t => t.user_id)).size,
      systemPulse: "188.3%"
    };
  }, [headerStats, tasks]);

  const teamPulse = useMemo(() => {
    const teams = [
      { id: 'MODELLING', display: 'STR MODELING' },
      { id: 'PT&REO', display: 'PT & REO' },
      { id: 'ENGINEER', display: 'ENGINEER' },
      { id: 'ETABS', display: 'ETABS' }
    ];

    const now = new Date();

    return teams.map((t) => {
      const teamUsers = users.filter(u => (u.team || '').toUpperCase() === t.id);
      const userIds = new Set(teamUsers.map(u => u.id));

      const teamTasks = tasks.filter(task => userIds.has(task.user_id));
      const workingUserIds = new Set(teamTasks.filter(task => task.status === 0).map(task => task.user_id));
      
      const leaveUserIds = new Set();
      leaves.forEach(l => {
        try {
          const leaveList = JSON.parse(l.leave_list || '[]');
          const isOnLeave = leaveList.some(range => {
            const start = new Date(range.LeaveStart);
            const end = new Date(range.LeaveEnd);
            return now >= start && now <= end;
          });
          if (isOnLeave) leaveUserIds.add(l.create_by);
        } catch(e) {}
      });

      const workingList = teamUsers.filter(u => workingUserIds.has(u.id) && !leaveUserIds.has(u.id)).map(u => u.name);
      const leaveListNames = teamUsers.filter(u => leaveUserIds.has(u.id)).map(u => u.name);
      const availableList = teamUsers.filter(u => !workingUserIds.has(u.id) && !leaveUserIds.has(u.id)).map(u => u.name);

      const teamProjectMap = new Map(projects.map(p => [p.id, p.name]));
      
      const todaysTasks = teamTasks.filter(task => {
        const taskDate = new Date(task.created_at || task.date_start || new Date());
        return taskDate.toDateString() === now.toDateString();
      });

      const teamUserMap = new Map(teamUsers.map(u => [u.id, u.name]));
      const dailyTasks = todaysTasks.map(task => {
        const projName = teamProjectMap.get(task.project_id) || 'Unknown Project';
        const userName = teamUserMap.get(task.user_id) || 'Unknown';
        const isWorking = task.status === 0;
        return {
          name: task.name || task.TaskName || task.id,
          project: projName,
          userName: userName,
          isWorking: isWorking,
          status: task.status
        };
      }).sort((a, b) => (a.isWorking === b.isWorking ? 0 : a.isWorking ? -1 : 1));

      return {
        name: t.display,
        members: teamUsers.length,
        working: workingList,
        available: availableList,
        leave: leaveListNames,
        dailyTasks: dailyTasks.length > 0 ? dailyTasks : null,
        capacity: teamUsers.length > 0 ? Math.round((workingList.length / teamUsers.length) * 100) : 0,
        hasData: teamUsers.length > 0 || teamTasks.length > 0
      };
    });
  }, [users, tasks, projects, leaves]);

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };



  return (
    <div className="bg-[var(--bg-main)] min-h-screen text-[var(--text-main)] p-5 font-['Inter'] relative overflow-x-hidden transition-colors duration-300">

      {/* Background Ambience */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />



      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="relative z-10 flex flex-col xl:flex-row gap-6" style={{ marginTop: '12px' }}>

        {/* LEFT COLUMN: Vertical Stats Cards */}
        <div className="flex flex-col gap-4 w-full xl:w-44 shrink-0" style={{ marginTop: '18px' }}>
          {/* Calendar Card */}
          <motion.div variants={itemVariants} className="bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-xl shadow-sm flex flex-col overflow-hidden" style={{ padding: '16px' }}>
            <div className="flex justify-between items-center mb-3">
              <button className="text-[var(--text-muted)] hover:text-blue-500 font-bold text-[10px]">{"<"}</button>
              <span className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-wider">Aug 2026</span>
              <button className="text-[var(--text-muted)] hover:text-blue-500 font-bold text-[10px]">{">"}</button>
            </div>
            <div className="scale-[0.85] origin-top flex flex-col items-center">
              <div className="grid grid-cols-7 gap-1 text-center mb-2 w-full">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => (
                  <span key={d} className="text-[8px] font-black text-[var(--text-muted)] uppercase">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center w-full">
                <span className="p-0.5"></span>
                <span className="p-0.5"></span>
                {Array.from({ length: 31 }).map((_, i) => {
                  const isToday = i + 1 === 13;
                  return (
                    <div key={i} className="flex justify-center">
                      <button className={`w-4 h-4 flex items-center justify-center text-[8px] font-bold rounded transition-all ${isToday ? 'bg-blue-600 text-white' : 'text-[var(--text-main)] hover:bg-[var(--glass-border)]'}`}>
                        {i + 1}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>

        {/* MIDDLE COLUMN: Team Pulse & Doughnut */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">

          {/* Team Pulse Section */}
          {/* Teams Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4 auto-rows-fr">
            {teamPulse.map((team, i) => (
              <div key={i} className="flex flex-col h-full">

                {/* Team Name Outside - Top Left */}
                <div className="flex justify-start mb-1">
                  <h2 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">{team.name}</h2>
                </div>

                <motion.div variants={itemVariants} className="bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-2xl relative shadow-sm flex flex-col md:flex-row gap-6 h-full flex-1" style={{ padding: '24px' }}>

                  {(!team.hasData && loading) ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[2px] z-20 rounded-2xl">
                       <div className="flex flex-col items-center gap-3">
                          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] animate-pulse">Syncing Data...</p>
                       </div>
                    </div>
                  ) : !team.hasData ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/5 z-20 rounded-2xl">
                       <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">No Active Logs</p>
                    </div>
                  ) : null}

                  {/* Left Column - Team Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs text-[var(--text-muted)] font-medium">{team.members} Members</p>
                    </div>

                    <div className="flex flex-col gap-3 text-[11px] font-bold text-[var(--text-main)] my-4">
                      {/* Working */}
                      <div className="group/tooltip relative flex items-center gap-2 cursor-help w-fit">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                        <span className="text-[var(--text-muted)] w-16">Working:</span>
                        <span>{team.working.length}</span>
                        {team.working.length > 0 && (
                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 hidden group-hover/tooltip:block z-[100]">
                            <div className="bg-[var(--bg-card)]/95 backdrop-blur-md border border-[var(--glass-border)] rounded-lg p-3 shadow-xl min-w-[180px]">
                              {team.working.map((name, idx) => (
                                <div key={idx} className="text-xs font-semibold text-[var(--text-main)] py-1 whitespace-nowrap opacity-95">{name}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Available */}
                      <div className="group/tooltip relative flex items-center gap-2 cursor-help w-fit">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                        <span className="text-[var(--text-muted)] w-16">Available:</span>
                        <span>{team.available.length}</span>
                        {team.available.length > 0 && (
                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 hidden group-hover/tooltip:block z-[100]">
                            <div className="bg-[var(--bg-card)]/95 backdrop-blur-md border border-[var(--glass-border)] rounded-lg p-3 shadow-xl min-w-[180px]">
                              {team.available.map((name, idx) => (
                                <div key={idx} className="text-xs font-semibold text-[var(--text-main)] py-1 whitespace-nowrap opacity-95">{name}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Leave */}
                      <div className="group/tooltip relative flex items-center gap-2 cursor-help w-fit">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
                        <span className="text-[var(--text-muted)] w-16">Leave:</span>
                        <span>{team.leave.length}</span>
                        {team.leave.length > 0 && (
                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 hidden group-hover/tooltip:block z-[100]">
                            <div className="bg-[var(--bg-card)]/95 backdrop-blur-md border border-[var(--glass-border)] rounded-lg p-3 shadow-xl min-w-[180px]">
                              {team.leave.map((name, idx) => (
                                <div key={idx} className="text-xs font-semibold text-[var(--text-main)] py-1 whitespace-nowrap opacity-95">{name}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Tasks */}
                  <div className="w-full md:w-[45%] bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl flex flex-col justify-start overflow-hidden h-[130px]">
                    <div className="flex flex-col justify-start gap-3 h-full p-4 overflow-y-auto custom-scrollbar">
                      {team.dailyTasks ? team.dailyTasks.map((t, j) => (
                        <div key={j} className="flex items-center gap-2 group cursor-default shrink-0">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.isWorking ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]' : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'}`}></span>
                          <div className="text-[11px] font-bold truncate transition-colors">
                            <span className="text-[var(--text-muted)] uppercase tracking-wide">{t.project}</span>
                            <span className="text-[var(--text-muted)]"> - </span>
                            <span className={`${t.isWorking ? 'text-rose-400 group-hover:text-rose-300' : 'text-emerald-400 group-hover:text-emerald-300'}`}>{t.name}</span>
                            <span className="text-[var(--text-dim)] font-medium"> • {t.userName}</span>
                          </div>
                        </div>
                      )) : (
                        <div className="flex items-center justify-center h-full">
                          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">No Tasks Today</span>
                        </div>
                      )}
                    </div>
                  </div>

                </motion.div>
              </div>
            ))}
          </div>

          {/* Efficiency Section */}
          <motion.div variants={itemVariants} className="bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-xl flex flex-col md:flex-row items-center justify-center gap-16 shadow-sm min-h-[300px]" style={{ padding: '32px' }}>

            {/* Doughnut Chart */}
            <div className="relative w-48 h-48">
              <Doughnut
                data={{
                  labels: ['Efficient', 'Idle'],
                  datasets: [{
                    data: [53, 47],
                    backgroundColor: ['#10b981', '#1e40af'],
                    borderWidth: 0,
                    cutout: '80%'
                  }]
                }}
                options={{
                  plugins: { legend: { display: false }, tooltip: { enabled: false } },
                  maintainAspectRatio: false
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <h4 className="text-3xl font-bold text-[var(--text-main)]">53%</h4>
                <p className="text-[10px] text-[var(--text-muted)] mt-1 uppercase font-bold tracking-tighter">Efficiency</p>
              </div>
            </div>

            {/* Stats List */}
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                <div>
                  <p className="text-[11px] text-[var(--text-muted)] font-medium uppercase">Total Tasks</p>
                  <h4 className="text-xl font-black text-[var(--text-main)]">1,240</h4>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                <div>
                  <p className="text-[11px] text-[var(--text-muted)] font-medium uppercase">Completed</p>
                  <h4 className="text-xl font-black text-[var(--text-main)]">842</h4>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span>
                <div>
                  <p className="text-[11px] text-[var(--text-muted)] font-medium uppercase">Active WIP</p>
                  <h4 className="text-xl font-black text-[var(--text-main)]">10</h4>
                </div>
              </div>
            </div>

          </motion.div>
        </div>



      </motion.div>
    </div>
  );
};

export default Dashboard;
