/**
 * Cartesian Product helper
 */
const cartesian = (...a) => a.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));

/**
 * Pure transformation logic for task generation
 * @param {Object} input - TaskInput domain model
 * @returns {Array} - Array of TaskOutput objects
 */
export const generateTasks = (input) => {
  const { 
    projectIds, // Array of projects
    levels,     // Array of levels
    levelEnabled, 
    workflows, 
    rawLines,
    team,
    day,
    eta,
    status = "Planning"
  } = input;

  // 1. Parse rawLines
  let parsedLines = Array.from(new Set(
    rawLines
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
  ));

  // If no lines provided, we treat it as 1 task entry (just the workflow)
  if (parsedLines.length === 0) {
    parsedLines = [""];
  }

  // 2. Prepare levels array
  const activeLevels = levelEnabled ? levels.filter(l => l.trim() !== "") : [null];

  // 3. Validate basic requirements
  if (!projectIds || projectIds.length === 0 || 
      !workflows || workflows.length === 0 || 
      (levelEnabled && activeLevels.length === 0)) {
    return [];
  }

  // 4. Generate tasks using Cartesian Product
  // projects × levels × lines × workflows
  
  const tasks = [];
  const timestamp = Date.now();

  projectIds.forEach((projectId) => {
    activeLevels.forEach((level) => {
      parsedLines.forEach((line) => {
        workflows.forEach((workflow) => {
          // Create a stable unique ID
          const id = `${projectId}-${level || 'nl'}-${line}-${workflow}-${Math.random().toString(36).substr(2, 9)}`.replace(/\s+/g, '-');
          
          const taskNamePart = line || '(no detail)';
          const fullTaskString = `${level ? `LEVEL ${level} ` : ''}${taskNamePart} ${workflow}`.trim();

          tasks.push({
            id,
            projectId,
            team,
            level,
            taskName: line,
            workflow,
            status,
            createdAt: timestamp,
            // UI specific fields for current app compatibility
            task: fullTaskString,
            markupDate: null,
            markupTime: null,
            days: { 
              Monday: '', Tuesday: '', Wednesday: '', Thursday: '', Friday: '', 
              ...{ [day]: eta } 
            }
          });
        });
      });
    });
  });

  return tasks;
};

/**
 * Validation logic for the task engine
 */
export const validateTaskInput = (input) => {
  const parsedLines = input.rawLines
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const effectiveLineCount = parsedLines.length === 0 ? 1 : parsedLines.length;

  const activeLevels = input.levelEnabled ? input.levels.filter(l => l.trim() !== "") : [null];

  const totalTasks = (input.projectIds?.length || 0) * 
                    (activeLevels.length) * 
                    (effectiveLineCount) * 
                    (input.workflows?.length || 0);

  return {
    isValid: (input.projectIds?.length > 0) && 
             (input.workflows?.length > 0) && 
             (!input.levelEnabled || activeLevels.length > 0),
    lineCount: parsedLines.length,
    effectiveLineCount,
    levelCount: activeLevels.length,
    projectCount: input.projectIds?.length || 0,
    totalTasks
  };
};
