# Personal Tab Role-Based Access Control (RBAC) Plan

## 1. Overview
This plan outlines the data access restrictions across the 7 sub-tabs in the **Personal Space** based on three user roles: **Admin**, **Leader**, and **User**.

## 2. Role Definitions
The roles are determined via the `AuthContext` variables:
- `isAdmin`: True if the user is an Admin.
- `isLeader`: True if the user is a Leader.
- `user.team`: The team the user belongs to.
- `user.name`: The user's name used for matching `create_by` or `user` fields in tasks.

---

## 3. Detailed Data Filtering Rules

### 3.1. Admin Role
- **Global Access:** Unrestricted.
- **Filter Dropdowns:** Can see and filter by all teams and all users.
- **All 7 Tabs (List, Daily, Project, Gantt, Deep Analysis, Performance, Brain):** Can view all data without restrictions.

### 3.2. Leader Role
- **Filter Dropdowns:** Restricted to show only their own team (`user.team`).
- **1. List Tab (UnifiedTable):** 
  - Data is filtered to only show tasks where the Leader is involved.
  - **Logic:** `task.createdBy === user.name OR task.userName === user.name`
- **2 & 3. Daily and Project Tabs:**
  - First, restricted to the Leader's team (`task.team === user.team`).
  - Then, restricted to tasks related to the Leader (`task.createdBy === user.name OR task.userName === user.name`).
  - **Member Column Display Logic:** 
    - If the Leader created the task (`task.createdBy === user.name`), display the assignee's name (`task.userName`).
    - If the Leader received the task (from an Admin), display the Leader's name (`user.name`).
- **4. Gantt Tab:**
  - Displays only projects that contain tasks related to the Leader (tasks they created or received).
- **5. Deep Analysis Tab:**
  - Can view all analytical data for their entire team (`task.team === user.team`).
- **6. Performance Tab:**
  - Can view performance metrics for themselves (`user.name`) AND for any users who have received tasks from this Leader.
- **7. Brain Tab (NeuralBrain):**
  - Can view all insights and data for their entire team (`task.team === user.team`).

### 3.3. User Role
- **Filter Dropdowns:** Restricted to show only their own team (`user.team`).
- **1. List Tab (UnifiedTable):** 
  - Data is filtered to only show tasks assigned to the User.
  - **Logic:** `task.userName === user.name`
- **2 & 3. Daily and Project Tabs:**
  - First, restricted to the User's team (`task.team === user.team`).
  - Then, restricted to tasks assigned to the User (`task.userName === user.name`).
  - **Member Column Display Logic:** Always displays the User's name (`user.name`).
- **4. Gantt Tab:**
  - Displays only projects that contain tasks assigned to the User.
- **5. Deep Analysis Tab:**
  - Can view all analytical data for their entire team (`task.team === user.team`).
- **6. Performance Tab:**
  - Restricted to view ONLY their own performance metrics.
- **7. Brain Tab (NeuralBrain):**
  - Can view all insights and data for their entire team (`task.team === user.team`).

---

## 4. Implementation Steps
1. **Update `PersonalSpaceEngine.js` or `dataProcessor.js`:** 
   - Add utility functions to pre-filter `dashboardTasks` based on the user's role before passing it to the 7 sub-tabs.
2. **Update Filter Components (`PersonalSpace.jsx`):**
   - Modify the team and user dropdowns to disable or hide options that are outside the allowed scope for Leaders and Users.
3. **Update TimesheetView & ProjectView:**
   - Modify the row generation logic to properly handle the `Member` column display based on the Leader/User rules.
4. **Update GanttView:**
   - Filter the project list to only include projects with tasks matching the user's role scope.
5. **Update DeepAnalysis, NeuralBrain, Performance:**
   - Pass the appropriately filtered dataset to these components.

*Awaiting your approval to proceed with the implementation.*
