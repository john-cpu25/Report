/**
 * Save Absolute Positions Script
 * Tính tọa độ tuyệt đối của mỗi thẻ (so với Vũ Đỗ = root = 0,0)
 * và lưu lên Supabase.
 */

const SUPABASE_URL = 'https://fabuhzarlzstcsaerfut.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gmnEl52U7VAkWW_3lZLTFw_hJ9BgLLm';

// ======== Layout constants (same as OrgChart.jsx) ========
const CARD_W = 210;
const CARD_H = 76;
const H_SEP = 40;
const V_SEP = 40;
const V_STACK_SEP = 16;
const INDENT = 40;

function getKids(node) { return (node.children || []).filter(c => !c.isAssistant); }

// Pass 1: measure subtree width and height
function measure(node) {
  const kids = getKids(node);
  if (kids.length === 0) {
    node._sw = CARD_W;
    node._sh = CARD_H;
    node._px = 0;
    return;
  }
  kids.forEach(c => measure(c));

  if (node.layout === 'vertical') {
    let left_overflow = 0;
    kids.forEach(c => {
      const overflow = c._px - (CARD_W / 2 + INDENT);
      if (overflow > left_overflow) left_overflow = overflow;
    });
    node._px = left_overflow;
    let max_right = CARD_W + node._px;
    let totalCH = 0;
    kids.forEach(c => {
      const right = node._px + CARD_W / 2 + INDENT - c._px + c._sw;
      if (right > max_right) max_right = right;
      totalCH += c._sh;
    });
    totalCH += (kids.length - 1) * V_STACK_SEP;
    node._sw = max_right;
    node._sh = CARD_H + V_SEP + totalCH;
  } else {
    const totalCW = kids.reduce((s, c) => s + c._sw, 0) + (kids.length - 1) * H_SEP;
    node._sw = Math.max(CARD_W, totalCW);
    node._px = (node._sw - CARD_W) / 2;
    const maxCH = Math.max(...kids.map(c => c._sh));
    node._sh = CARD_H + V_SEP + maxCH;
  }
}

// Pass 2: assign x, y positions
function layoutPos(node, left, top) {
  const kids = getKids(node);
  node._x = left + node._px + (node.offset?.x || 0);
  node._y = top + (node.offset?.y || 0);

  if (kids.length === 0) return;

  if (node.layout === 'vertical') {
    const childCardX = node._x + CARD_W / 2 + INDENT;
    let childTop = node._y + CARD_H + V_SEP;
    kids.forEach(child => {
      const childLeft = childCardX - child._px;
      layoutPos(child, childLeft, childTop);
      childTop += child._sh + V_STACK_SEP;
    });
  } else {
    const totalCW = kids.reduce((s, c) => s + c._sw, 0) + (kids.length - 1) * H_SEP;
    let childLeft = node._x + CARD_W / 2 - totalCW / 2;
    const childTop = node._y + CARD_H + V_SEP;
    kids.forEach(child => {
      layoutPos(child, childLeft, childTop);
      childLeft += child._sw + H_SEP;
    });
  }
}

// Flatten tree to array
function collectAll(node, result) {
  result.push(node);
  const kids = getKids(node);
  kids.forEach(kid => collectAll(kid, result));
}

// ======== Main ========
async function main() {
  // 1. Fetch all users from Supabase
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/NMK_User?select=id,full_name,position,email,is_assistant,level,manager_id,team_name,location,layout,offset_xy&order=level`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  const rawData = await res.json();

  // 2. Filter Vietnam users with names
  const localData = rawData.filter(u =>
    u.location?.toUpperCase() === 'VIETNAM' &&
    u.full_name && u.full_name.trim() !== ''
  );

  console.log(`\n📊 Found ${localData.length} Vietnam users\n`);

  // 3. Build tree (same logic as OrgChart.jsx)
  const nodesMap = {};
  const nameToNodeMap = {};
  const roots = [];

  localData.forEach(item => {
    let offset = { x: 0, y: 0 };
    if (item.offset_xy) {
      try {
        offset = typeof item.offset_xy === 'object' ? item.offset_xy : JSON.parse(item.offset_xy);
      } catch (e) { /* keep default */ }
    }

    const node = {
      ...item,
      name: item.full_name,
      team: item.team_name,
      isAssistant: item.is_assistant,
      children: [],
      layout: item.layout || ((item.manager_id === null || item.manager_id === '' || item.level === 0) ? 'horizontal' : 'vertical'),
      offset
    };
    nodesMap[item.id] = node;
    if (item.full_name) nameToNodeMap[item.full_name.trim()] = node;
  });

  localData.forEach(item => {
    const node = nodesMap[item.id];
    let mid = item.manager_id;
    if (typeof mid === 'string') mid = mid.trim();
    const parent = nodesMap[mid] || nameToNodeMap[mid];
    if (parent && parent.id !== node.id) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  roots.sort((a, b) => (a.level || 0) - (b.level || 0));

  // 4. Run layout engine
  let currentX = 0;
  roots.forEach(root => {
    measure(root);
    layoutPos(root, currentX, 0);
    currentX += root._sw + H_SEP * 2;
  });

  // 5. Collect all nodes and find root (Vũ Đỗ)
  const allNodes = [];
  roots.forEach(root => collectAll(root, allNodes));

  const rootNode = allNodes.find(n => n.level === 0) || allNodes[0];
  const rootX = rootNode._x;
  const rootY = rootNode._y;

  console.log(`🎯 Root node: ${rootNode.name} at absolute (_x=${rootX}, _y=${rootY})\n`);
  console.log('─'.repeat(60));
  console.log(`${'User'.padEnd(20)} ${'Old Offset'.padEnd(18)} ${'New Absolute (vs Root)'.padEnd(25)}`);
  console.log('─'.repeat(60));

  // 6. Calculate absolute positions relative to root and prepare updates
  const updates = [];
  allNodes.forEach(node => {
    const absX = Math.round(node._x - rootX);
    const absY = Math.round(node._y - rootY);
    const oldOffset = JSON.stringify(node.offset);
    const newOffset = JSON.stringify({ x: absX, y: absY });

    console.log(`${node.name.padEnd(20)} ${oldOffset.padEnd(18)} ${newOffset}`);

    updates.push({
      id: node.id,
      name: node.name,
      newOffset: { x: absX, y: absY }
    });
  });

  console.log('─'.repeat(60));
  console.log(`\n📤 Updating ${updates.length} records to Supabase...\n`);

  // 7. Batch update to Supabase
  let success = 0;
  let failed = 0;

  for (const u of updates) {
    const offsetStr = JSON.stringify(u.newOffset);
    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/NMK_User?id=eq.${u.id}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({ offset_xy: offsetStr })
      }
    );

    if (patchRes.ok) {
      success++;
      console.log(`  ✅ ${u.name}: ${offsetStr}`);
    } else {
      failed++;
      const err = await patchRes.text();
      console.log(`  ❌ ${u.name}: ${err}`);
    }
  }

  console.log(`\n🎉 Done! Success: ${success}, Failed: ${failed}`);
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
