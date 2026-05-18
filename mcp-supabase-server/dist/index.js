/**
 * Zero-Dependency Node.js MCP Server for Supabase Integration
 * Implements the Model Context Protocol (MCP) over stdio.
 * Directly communicates with Supabase REST API.
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Logger helper (send debug info to stderr so it doesn't mess with JSON-RPC stdio)
function debugLog(...args) {
  console.error('[MCP Debug]', ...args);
}

// Load environment variables from .env file securely without dependencies
function loadEnv() {
  try {
    const envPaths = [
      path.join(__dirname, '../.env'),
      path.join(__dirname, '.env'),
      path.join(process.cwd(), '.env'),
      path.join(process.cwd(), 'mcp-supabase-server/.env')
    ];
    
    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        debugLog(`Loading credentials from secure local file: ${envPath}`);
        const content = fs.readFileSync(envPath, 'utf-8');
        content.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const index = trimmed.indexOf('=');
            if (index !== -1) {
              const key = trimmed.substring(0, index).trim();
              const val = trimmed.substring(index + 1).trim();
              process.env[key] = val;
            }
          }
        });
        break;
      }
    }
  } catch (e) {
    debugLog('Failed to read secure environment file:', e.message);
  }
}

// Initialize secure environment variables
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  debugLog('CRITICAL ERROR: Supabase URL or Key is missing from secure local environment variables!');
}

// Headers for Supabase REST API
const headers = {
  'apikey': SUPABASE_KEY || '',
  'Authorization': SUPABASE_KEY ? `Bearer ${SUPABASE_KEY}` : '',
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};


// 1. Fetch Projects from Supabase to match keys with UUIDs
async function fetchProjects() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/NMK_Project?select=id,key,name`, {
      method: 'GET',
      headers
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return await res.json();
  } catch (err) {
    debugLog('Failed to fetch projects:', err.message);
    return [];
  }
}

// 2. Fetch active tasks
async function fetchActiveTasks() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/NMK_Task?select=*&order=created_at.desc&limit=100`, {
    method: 'GET',
    headers
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return await res.json();
}

// 3. Upsert a task
async function upsertTask(taskData) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/NMK_Task`, {
    method: 'POST',
    headers: {
      ...headers,
      'Prefer': 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(taskData)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return await res.json();
}

// 4. Parse DSL Text Plan
async function parseAndSyncPlan(text) {
  debugLog('Parsing plan text...');
  const lines = text.split('\n');
  const projectsList = await fetchProjects();
  const projectMap = {};
  projectsList.forEach(p => {
    if (p.key) projectMap[p.key.toUpperCase()] = p.id;
  });

  let currentProjectKey = null;
  const tasksToInsert = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Check for project marker: •DLD or •MORAY
    if (line.startsWith('•')) {
      currentProjectKey = line.substring(1).trim().toUpperCase();
      continue;
    }

    if (!currentProjectKey) continue;

    // Parse line: [Task details] => [Timestamp] => [Issue Date]
    const parts = line.split('=>').map(p => p.trim());
    if (parts.length < 2) continue; // Must have at least task and details

    const taskDetails = parts[0];
    const timestampStr = parts[1] || '';
    const issueDateStr = parts[2] || '';

    // Build standard Name string: "DLD : LEVEL 5 TO LEVEL 10"
    const standardName = `${currentProjectKey} : ${taskDetails.toUpperCase()}`;
    const projectId = projectMap[currentProjectKey] || null;

    // Prepare task object matching the database schema
    const taskObj = {
      name: standardName,
      project_id: projectId,
      status: 0, // 0 = WIP (in progress)
      user_id: 'admin@bypass.local', // Default administrator bypass
      created_at: new Date().toISOString()
    };

    tasksToInsert.push(taskObj);
  }

  if (tasksToInsert.length === 0) {
    return 'No valid task lines were discovered in the provided text format.';
  }

  debugLog(`Syncing ${tasksToInsert.length} tasks to Supabase...`);
  const syncedResults = [];
  for (const task of tasksToInsert) {
    const res = await upsertTask(task);
    if (res && res[0]) syncedResults.push(res[0]);
  }

  return `Successfully parsed and synchronized ${syncedResults.length} tasks into NMK_Task table on Supabase!`;
}

// Setup standard input/output interface for MCP Protocol
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', async (line) => {
  if (!line.trim()) return;

  let request;
  try {
    request = JSON.parse(line);
  } catch (err) {
    debugLog('Invalid JSON received:', line);
    return;
  }

  const { method, id, params } = request;
  debugLog(`Received request: ${method}, id: ${id}`);

  // 1. Initialize Handshake
  if (method === 'initialize') {
    const response = {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'supabase-planner',
          version: '1.0.0'
        }
      }
    };
    console.log(JSON.stringify(response));
    return;
  }

  // 2. List available tools
  if (method === 'tools/list') {
    const response = {
      jsonrpc: '2.0',
      id,
      result: {
        tools: [
          {
            name: 'get_current_workload',
            description: 'Fetch the 100 most recent active tasks from the Supabase database.',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'parse_and_sync_plan',
            description: 'Parse a weekly plan text utilizing the custom syntax •[PROJECT]\\n[Task Details] => [Timestamp] => [Issue Date] and synchronize it directly into the Supabase NMK_Task table.',
            inputSchema: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  description: 'The natural language planner text. Example:\n•DLD\nLevel 5 to level 10 => TIMESTAMP (NODAY - NO TIME) => Issue today 18/05/2026 (17:30)'
                }
              },
              required: ['text']
            }
          }
        ]
      }
    };
    console.log(JSON.stringify(response));
    return;
  }

  // 3. Execute tool calls
  if (method === 'tools/call') {
    const toolName = params.name;
    const args = params.arguments || {};
    let resultText = '';

    try {
      if (toolName === 'get_current_workload') {
        const tasks = await fetchActiveTasks();
        resultText = JSON.stringify(tasks, null, 2);
      } else if (toolName === 'parse_and_sync_plan') {
        resultText = await parseAndSyncPlan(args.text);
      } else {
        resultText = `Unknown tool: ${toolName}`;
      }
    } catch (err) {
      resultText = `Error executing tool: ${err.message}`;
    }

    const response = {
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: resultText
          }
        ]
      }
    };
    console.log(JSON.stringify(response));
    return;
  }

  // Fallback response for unsupported methods
  const fallbackResponse = {
    jsonrpc: '2.0',
    id,
    error: {
      code: -32601,
      message: `Method not found: ${method}`
    }
  };
  console.log(JSON.stringify(fallbackResponse));
});

debugLog('Supabase MCP Server standard stdio process started successfully.');
