import React from 'react';
import '../../UI/buttons/neumorphic_switcher.css';
import { ListIcon, GanttIcon, DailyIcon, ProjectIcon, DeepAnalysisIcon, PerformanceIcon, NeuralBrainIcon } from './CustomIcons';
import PillSwitcher from './PillSwitcher';

const NeumorphicPersonalSwitcher = ({ viewMode, setViewMode }) => {
  const views = [
    { id: 'list', label: 'LIST', icon: <ListIcon />, color: 'text-orange-500' },
    { id: 'daily', label: 'DAILY', icon: <DailyIcon />, color: 'text-orange-500' },
    { id: 'project', label: 'PROJECT', icon: <ProjectIcon />, color: 'text-emerald-500' },
    { id: 'gantt', label: 'GANTT', icon: <GanttIcon />, color: 'text-indigo-500' },
    { id: 'deep-analysis', label: 'DEEP ANALYSIS', icon: <DeepAnalysisIcon />, color: 'text-indigo-500' },
    { id: 'performance', label: 'PERFORMANCE', icon: <PerformanceIcon />, color: 'text-indigo-500' },
    { id: 'neural-brain', label: 'NEURAL BRAIN', icon: <NeuralBrainIcon />, color: 'text-purple-500' }
  ];

  return (
    <PillSwitcher 
      options={views}
      value={viewMode}
      onChange={setViewMode}
      type="icon"
      size="md"
    />
  );
};

export default NeumorphicPersonalSwitcher;
