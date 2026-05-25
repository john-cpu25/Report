import React from 'react';
import { ListIcon, GanttIcon } from './CustomIcons';
import PillSwitcher from './PillSwitcher';

const NeumorphicWeeklySwitcher = ({ viewMode, setViewMode }) => {
  const views = [
    { id: 'list', label: 'LIST', icon: <ListIcon /> },
    { id: 'gantt', label: 'GANTT', icon: <GanttIcon /> }
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

export default NeumorphicWeeklySwitcher;
