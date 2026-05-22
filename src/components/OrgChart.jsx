import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Search, Edit3, Plus, Trash2, Save, UserPlus, ZoomIn, ZoomOut, Maximize2, GitBranch, RotateCcw, ArrowLeftRight, ArrowUpDown, LayoutGrid } from 'lucide-react'
import initialOrgData from '../data/orgData.json'
import { useApp } from '../context/AppContext'
import { fetchOrgChartData, updateUserOrgNode } from '../services/supabaseService'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'

// ==================== UTILITIES FOR MERGING & ALIGNMENT ====================
function isDescendant(parent, childId) {
  if (!parent.children) return false
  for (const child of parent.children) {
    if (child.id === childId) return true
    if (isDescendant(child, childId)) return true
  }
  return false
}

function findNodeInfo(nodes, id, parent = null) {
  for (const node of nodes) {
    if (node.id === id) {
      return { node, parent, siblings: parent ? parent.children.filter(c => c.id !== id) : [] }
    }
    if (node.children) {
      const res = findNodeInfo(node.children, id, node)
      if (res) return res
    }
  }
  return null
}

function mergeBranch(nodes, dragId, targetId) {
  let dragNode = null

  // Helper to find and remove the drag node from its parent
  const removeNode = (list) => {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === dragId) {
        dragNode = list[i]
        list.splice(i, 1)
        return true
      }
      if (list[i].children && list[i].children.length > 0) {
        if (removeNode(list[i].children)) return true
      }
    }
    return false
  }

  // Clone current state to manipulate
  const cloned = JSON.parse(JSON.stringify(nodes))
  removeNode(cloned)

  if (!dragNode) return nodes // If node not found

  // Update dragged node properties
  dragNode.manager_id = targetId
  dragNode.offset = { x: 0, y: 0 } // reset offset on merge

  // Helper to add the drag node as a child of target node
  const addNode = (list) => {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === targetId) {
        list[i].children = [...(list[i].children || []), dragNode]
        return true
      }
      if (list[i].children && list[i].children.length > 0) {
        if (addNode(list[i].children)) return true
      }
    }
    return false
  }

  addNode(cloned)
  return cloned
}

// ==================== LAYOUT ENGINE ====================
const CARD_W = 210
const CARD_H = 76
const H_SEP = 40
const V_SEP = 40
const V_STACK_SEP = 16
const INDENT = 40

const TEAM_COLORS = {
  "Leadership": { accent: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
  "Slab Design": { accent: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
  "BIM / REO / MTO": { accent: '#06B6D4', bg: '#ECFEFF', border: '#A5F3FC' },
  "BIM": { accent: '#06B6D4', bg: '#ECFEFF', border: '#A5F3FC' },
  "Lateral Design": { accent: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
  "Support": { accent: '#F43F5E', bg: '#FFF1F2', border: '#FECDD3' },
}

function getColor(team) {
  return TEAM_COLORS[team] || { accent: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE' }
}

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)) }

function getKids(node) { return (node.children || []).filter(c => !c.isAssistant) }

const getZodiac = (dob) => {
  if (!dob) return { name: 'Chưa rõ', emoji: '🧑‍💻' };
  const year = new Date(dob).getFullYear();
  if (isNaN(year)) return { name: 'Chưa rõ', emoji: '🧑‍💻' };
  const zodiacs = [
    { name: 'Thân', emoji: '🐵' }, // 0
    { name: 'Dậu', emoji: '🐔' },  // 1
    { name: 'Tuất', emoji: '🐶' }, // 2
    { name: 'Hợi', emoji: '🐷' },  // 3
    { name: 'Tý', emoji: '🐭' },   // 4
    { name: 'Sửu', emoji: '🐮' },  // 5
    { name: 'Dần', emoji: '🐯' },  // 6
    { name: 'Mão', emoji: '🐱' },  // 7
    { name: 'Thìn', emoji: '🐲' }, // 8
    { name: 'Tỵ', emoji: '🐍' },   // 9
    { name: 'Ngọ', emoji: '🐴' },  // 10
    { name: 'Mùi', emoji: '🐐' },  // 11
  ];
  return zodiacs[year % 12];
}

// Pass 1: measure subtree width and height
function measure(node) {
  const kids = getKids(node)
  if (kids.length === 0) {
    node._sw = CARD_W
    node._sh = CARD_H
    node._px = 0
    return
  }
  kids.forEach(c => measure(c))

  if (node.layout === 'vertical') {
    let left_overflow = 0
    kids.forEach(c => {
      const overflow = c._px - (CARD_W / 2 + INDENT)
      if (overflow > left_overflow) left_overflow = overflow
    })
    node._px = left_overflow

    let max_right = CARD_W + node._px
    let totalCH = 0
    kids.forEach(c => {
      const right = node._px + CARD_W / 2 + INDENT - c._px + c._sw
      if (right > max_right) max_right = right
      totalCH += c._sh
    })
    totalCH += (kids.length - 1) * V_STACK_SEP

    node._sw = max_right
    node._sh = CARD_H + V_SEP + totalCH
  } else {
    const totalCW = kids.reduce((s, c) => s + c._sw, 0) + (kids.length - 1) * H_SEP
    node._sw = Math.max(CARD_W, totalCW)
    node._px = (node._sw - CARD_W) / 2
    const maxCH = Math.max(...kids.map(c => c._sh))
    node._sh = CARD_H + V_SEP + maxCH
  }
}

// Pass 2: assign x, y positions
function layoutPos(node, left, top) {
  const kids = getKids(node)
  node._x = left + node._px + (node.offset?.x || 0)
  node._y = top + (node.offset?.y || 0)

  if (kids.length === 0) return

  if (node.layout === 'vertical') {
    const childCardX = node._x + CARD_W / 2 + INDENT
    let childTop = node._y + CARD_H + V_SEP
    kids.forEach(child => {
      const childLeft = childCardX - child._px
      layoutPos(child, childLeft, childTop)
      childTop += child._sh + V_STACK_SEP
    })
  } else {
    const totalCW = kids.reduce((s, c) => s + c._sw, 0) + (kids.length - 1) * H_SEP
    let childLeft = node._x + CARD_W / 2 - totalCW / 2
    const childTop = node._y + CARD_H + V_SEP
    kids.forEach(child => {
      layoutPos(child, childLeft, childTop)
      childLeft += child._sw + H_SEP
    })
  }
}

// Collect flat arrays of nodes and edges
const R = 12 // corner radius for rounded connectors

function collectAll(node, nodes, edges) {
  nodes.push(node)
  const kids = getKids(node)
  if (kids.length === 0) return

  const pcx = node._x + CARD_W / 2
  const pby = node._y + CARD_H
  const col = getColor(node.team).accent

  if (node.layout === 'vertical') {
    // Each child gets an L-shaped rounded path from parent bottom center
    kids.forEach(kid => {
      const ky = kid._y + CARD_H / 2
      const kx = kid._x
      const kc = getColor(kid.team).accent
      edges.push({
        d: `M${pcx},${pby} L${pcx},${ky - R} Q${pcx},${ky} ${pcx + R},${ky} L${kx},${ky}`,
        color: kc
      })
    })
  } else {
    // Each child gets a U-shaped rounded path from parent bottom center
    const midY = pby + V_SEP / 2
    kids.forEach(kid => {
      const ccx = kid._x + CARD_W / 2
      const cty = kid._y
      const kc = getColor(kid.team).accent
      if (Math.abs(ccx - pcx) < 2) {
        // Directly below — straight line
        edges.push({ d: `M${pcx},${pby} L${ccx},${cty}`, color: kc })
      } else {
        const dx = ccx > pcx ? 1 : -1
        edges.push({
          d: `M${pcx},${pby} L${pcx},${midY - R} Q${pcx},${midY} ${pcx + dx * R},${midY} L${ccx - dx * R},${midY} Q${ccx},${midY} ${ccx},${midY + R} L${ccx},${cty}`,
          color: kc
        })
      }
    })
  }
  kids.forEach(kid => collectAll(kid, nodes, edges))
}

// ==================== CARD COMPONENT ====================
const OrgCard = ({ node, isSelected, isMergeTarget, onSelect, onEdit, onAdd, onDelete, onDragStart, onToggleLayout, onResetPosition, onAlignSiblings, isAdmin, isDark, hasMovedRef }) => {
  const tc = getColor(node.team)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={(e) => {
        // Only admins can drag, only left click, and not clicking on action buttons
        if (!isAdmin) return
        if (e.button !== 0) return
        e.stopPropagation()
        onDragStart(node, e)
      }}
      onClick={(e) => {
        e.stopPropagation()
        if (hasMovedRef && hasMovedRef.current) {
          hasMovedRef.current = false // Reset drag flag
          return
        }
        onSelect(node)
      }}
      style={{
        position: 'absolute',
        left: node._x,
        top: node._y,
        width: CARD_W,
        height: CARD_H,
        borderRadius: 12,
        background: isDark ? '#1E293B' : '#fff',
        border: isMergeTarget
          ? '3px dashed #10B981'
          : `2px solid ${isSelected ? tc.accent : (isDark ? 'rgba(255,255,255,0.1)' : tc.border)}`,
        boxShadow: isMergeTarget
          ? '0 0 25px rgba(16, 185, 129, 0.6), 0 8px 30px rgba(16, 185, 129, 0.3)'
          : (isSelected
            ? `0 0 0 3px ${tc.accent}33, 0 8px 25px rgba(0,0,0,0.12)`
            : '0 4px 15px rgba(0,0,0,0.08)'),
        cursor: isAdmin ? 'grab' : 'pointer',
        transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.2s',
        transform: hovered ? 'scale(1.03)' : 'scale(1)',
        zIndex: hovered ? 50 : 10,
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {/* Merge Target Badge */}
      {isMergeTarget && (
        <div style={{
          position: 'absolute',
          top: -30,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#10B981',
          color: '#fff',
          fontSize: 9,
          fontWeight: 900,
          padding: '4px 10px',
          borderRadius: 20,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 10px rgba(16, 185, 129, 0.4)',
          border: '1px solid #059669',
          zIndex: 100,
          animation: 'pulse 1s infinite'
        }}>
          GỘP NHÁNH VÀO ĐÂY 📥
        </div>
      )}

      {/* Avatar circle */}
      <div style={{
        position: 'absolute', left: -26,
        width: 52, height: 52, borderRadius: '50%',
        background: isDark ? '#1E293B' : '#fff', border: `3px solid ${tc.accent}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: tc.accent, fontWeight: 900, fontSize: 32,
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
      }}>
        {getZodiac(node.dob).emoji}
      </div>

      {/* Info */}
      <div style={{ flex: 1, paddingLeft: 36, paddingRight: 8, overflow: 'hidden' }}>
        <div style={{
          fontSize: 13, fontWeight: 800, color: isDark ? '#F8FAFC' : '#1E293B',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          lineHeight: '1.2', marginBottom: 3,
        }}>{node.name}</div>
        <div style={{
          fontSize: 9, fontWeight: 700, color: tc.accent,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{node.position}</div>
      </div>

      {/* Hover actions - Structured 2-row premium design */}
      {hovered && isAdmin && (
        <div 
          onMouseDown={(e) => e.stopPropagation()} // Stop drag when clicking buttons
          style={{
            position: 'absolute', inset: -2, background: isDark ? 'rgba(30,41,59,0.97)' : 'rgba(255,255,255,0.97)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
            borderRadius: 12,
            border: `2px solid ${tc.accent}`,
            zIndex: 100,
            padding: 4,
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
          }}
        >
          {/* Row 1: Administrative CRUD */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={(e) => { e.stopPropagation(); onEdit(node) }}
              style={actionBtnStyle('#6366F1')} title="Chỉnh sửa"><Edit3 size={12} /></button>
            <button onClick={(e) => { e.stopPropagation(); onAdd(node) }}
              style={actionBtnStyle('#10B981')} title="Thêm nhân sự cấp dưới"><Plus size={12} /></button>
            {node.level !== 0 && (
              <button onClick={(e) => { e.stopPropagation(); onDelete(node.id) }}
                style={actionBtnStyle('#EF4444')} title="Xóa nhân sự"><Trash2 size={12} /></button>
            )}
          </div>

          {/* Row 2: Layout & Alignment Positioning */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={(e) => { e.stopPropagation(); onToggleLayout(node) }}
              style={actionBtnStyle('#F59E0B')} title={`Đổi layout sang ${node.layout === 'vertical' ? 'Ngang' : 'Dọc'}`}><GitBranch size={12} style={{ transform: node.layout === 'vertical' ? 'rotate(90deg)' : 'none' }} /></button>

            {node.level !== 0 && (
              <button onClick={(e) => { e.stopPropagation(); onAlignSiblings(node, 'horizontal') }}
                style={actionBtnStyle('#8B5CF6')} title="Căn ngang hàng các thẻ cùng cấp"><ArrowLeftRight size={12} /></button>
            )}

            {node.level !== 0 && (
              <button onClick={(e) => { e.stopPropagation(); onAlignSiblings(node, 'vertical') }}
                style={actionBtnStyle('#EC4899')} title="Căn dọc hàng các thẻ cùng cấp"><ArrowUpDown size={12} /></button>
            )}

            {(node.offset?.x !== 0 || node.offset?.y !== 0) && (
              <button onClick={(e) => { e.stopPropagation(); onResetPosition(node) }}
                style={actionBtnStyle('#3B82F6')} title="Đặt lại vị trí mặc định"><RotateCcw size={12} /></button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const actionBtnStyle = (color) => ({
  width: 32, height: 32, borderRadius: '50%',
  border: `1.5px solid ${color}30`, background: `${color}10`,
  color, display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', transition: 'all 0.15s',
})

// ==================== MAIN COMPONENT ====================
const OrgChart = () => {
  const { theme } = useApp()
  const { isAdmin } = useAuth()
  const isDark = theme === 'GALAXY' || theme === 'DARK'

  const [orgData, setOrgData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState(null)
  const [editingNode, setEditingNode] = useState(null)
  const [addingToNode, setAddingToNode] = useState(null)

  // Temporary draft/offline sync states
  const [originalOrgData, setOriginalOrgData] = useState([])
  const [deletedNodeIds, setDeletedNodeIds] = useState([])
  const [hasPendingChanges, setHasPendingChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Pan & Zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(0.85)
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)

  // Drag and drop card state
  const [draggedNodeId, setDraggedNodeId] = useState(null)
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 })
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 })

  // Alignment, Grid Snapping & Branch Merging States
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [dragGuidelines, setDragGuidelines] = useState([])
  const [hoveredMergeNodeId, setHoveredMergeNodeId] = useState(null)
  const hasMovedRef = useRef(false)
  const hasCenteredRef = useRef(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const rawData = await fetchOrgChartData()
        
        // Filter only Vietnam users and valid full_name
        const localData = rawData.filter(u => 
          u.location?.toUpperCase() === 'VIETNAM' && 
          u.full_name && 
          u.full_name.trim() !== ''
        )
        
        // Transform flat data to tree
        const nodesMap = {}
        const nameToNodeMap = {}
        const roots = []
        
        // Pass 1: Create node objects and name mapping
        localData.forEach(item => {
          const node = {
            ...item,
            name: item.full_name,
            team: item.team_name,
            isAssistant: item.is_assistant,
            children: [],
            // Check custom layout or use auto-layout logic
            layout: item.layout || ((item.manager_id === null || item.manager_id === "" || item.level === 0) ? 'horizontal' : 'vertical'),
            // Check custom offset or use default
            offset: item.offset_xy ? (() => {
              try {
                return JSON.parse(item.offset_xy)
              } catch(e) {
                return { x: 0, y: 0 }
              }
            })() : { x: 0, y: 0 }
          }
          nodesMap[item.id] = node
          if (item.full_name) nameToNodeMap[item.full_name.trim()] = node
        })
        
        // Pass 2: Build hierarchy using both ID and Name for manager_id
        localData.forEach(item => {
          const node = nodesMap[item.id]
          let mid = item.manager_id
          if (typeof mid === 'string') mid = mid.trim()
          
          // Try to find parent by ID first, then by Name
          const parent = nodesMap[mid] || nameToNodeMap[mid]
          
          if (parent && parent.id !== node.id) {
            parent.children.push(node)
          } else {
            roots.push(node)
          }
        })
        
        // Sort roots by level to ensure top-down order
        roots.sort((a, b) => (a.level || 0) - (b.level || 0))
        setOrgData(roots)
        setOriginalOrgData(deepClone(roots))
        hasCenteredRef.current = false
      } catch (err) {
        console.error('Failed to load org chart data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Layout calculation
  const { nodes, edges, bounds } = useMemo(() => {
    if (!orgData || orgData.length === 0) {
      return { nodes: [], edges: [], bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, h: 0 } }
    }
    const tree = deepClone(orgData)
    
    // Arrange multiple roots horizontally
    let currentX = 0
    tree.forEach(root => { 
      measure(root)
      layoutPos(root, currentX, 0) 
      currentX += root._sw + H_SEP * 2 // Add extra spacing between independent trees
    })
    
    const nodes = [], edges = []
    tree.forEach(root => collectAll(root, nodes, edges))
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    nodes.forEach(n => {
      minX = Math.min(minX, n._x)
      minY = Math.min(minY, n._y)
      maxX = Math.max(maxX, n._x + CARD_W)
      maxY = Math.max(maxY, n._y + CARD_H)
    })
    return { nodes, edges, bounds: { minX, minY, maxX, maxY, w: maxX - minX + 100, h: maxY - minY + 100 } }
  }, [orgData])

  // Center on mount (runs only once upon initial load)
  useEffect(() => {
    if (containerRef.current && bounds.w && !hasCenteredRef.current) {
      const cw = containerRef.current.clientWidth
      const ch = containerRef.current.clientHeight
      const headerH = 60
      const fitZoom = Math.min((cw - 40) / bounds.w, (ch - headerH - 40) / bounds.h, 1)
      const z = Math.max(0.3, Math.min(fitZoom, 1))
      setZoom(z)
      setPan({
        x: (cw - bounds.w * z) / 2 - bounds.minX * z,
        y: headerH + (ch - headerH - bounds.h * z) / 2 - bounds.minY * z,
      })
      hasCenteredRef.current = true
    }
  }, [bounds])

  // Drag handlers for cards
  const handleDragStart = useCallback((node, e) => {
    setDraggedNodeId(node.id)
    setDragStartPos({ x: e.clientX, y: e.clientY })
    setDragStartOffset({ x: node.offset?.x || 0, y: node.offset?.y || 0 })
    hasMovedRef.current = false
  }, [])

  // Pan handlers for canvas
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    setDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }, [pan])

  // Helper to check descendants recursively
  const checkDescendant = useCallback((parent, childId) => {
    return isDescendant(parent, childId)
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (draggedNodeId) {
      const clientDx = e.clientX - dragStartPos.x
      const clientDy = e.clientY - dragStartPos.y
      
      // If moved more than 4px, treat it as drag and prevent opening detail/edit panel
      if (Math.abs(clientDx) > 4 || Math.abs(clientDy) > 4) {
        hasMovedRef.current = true
      }

      // Calculate scaled drag coordinates based on zoom factor
      const dx = clientDx / zoom
      const dy = clientDy / zoom
      
      let newOffsetX = Math.round(dragStartOffset.x + dx)
      let newOffsetY = Math.round(dragStartOffset.y + dy)
      
      // 1. Grid Snapping
      if (snapToGrid) {
        newOffsetX = Math.round(newOffsetX / 20) * 20
        newOffsetY = Math.round(newOffsetY / 20) * 20
      }

      // 2. Intelligent Auto-Align Guidelines
      const threshold = 15
      let finalOffsetX = newOffsetX
      let finalOffsetY = newOffsetY
      let guidelines = []

      // Snap offset to center (0,0)
      if (Math.abs(finalOffsetX) < threshold) {
        finalOffsetX = 0
      }
      if (Math.abs(finalOffsetY) < threshold) {
        finalOffsetY = 0
      }

      const info = findNodeInfo(orgData, draggedNodeId)
      if (info) {
        const renderedSelf = nodes.find(n => n.id === draggedNodeId)
        if (renderedSelf) {
          const baseY = renderedSelf._y - (renderedSelf.offset?.y || 0)
          const baseX = renderedSelf._x - (renderedSelf.offset?.x || 0)
          
          const currentAbsX = baseX + finalOffsetX
          const currentAbsY = baseY + finalOffsetY
          
          // A. Snap to siblings
          if (info.siblings && info.siblings.length > 0) {
            for (const sib of info.siblings) {
              const renderedSib = nodes.find(n => n.id === sib.id)
              if (renderedSib) {
                // Snap horizontally (Y axis)
                if (Math.abs(currentAbsY - renderedSib._y) < threshold) {
                  finalOffsetY = renderedSib._y - baseY
                  guidelines.push({
                    x1: currentAbsX + CARD_W / 2,
                    y1: renderedSib._y + CARD_H / 2,
                    x2: renderedSib._x + CARD_W / 2,
                    y2: renderedSib._y + CARD_H / 2,
                    type: 'horizontal'
                  })
                }
                
                // Snap vertically (X axis)
                if (Math.abs(currentAbsX - renderedSib._x) < threshold) {
                  finalOffsetX = renderedSib._x - baseX
                  guidelines.push({
                    x1: renderedSib._x + CARD_W / 2,
                    y1: currentAbsY + CARD_H / 2,
                    x2: renderedSib._x + CARD_W / 2,
                    y2: renderedSib._y + CARD_H / 2,
                    type: 'vertical'
                  })
                }
              }
            }
          }

          // B. Snap to parent vertical center
          if (info.parent) {
            const renderedParent = nodes.find(n => n.id === info.parent.id)
            if (renderedParent) {
              const parentCenterX = renderedParent._x + CARD_W / 2
              const selfCenterX = currentAbsX + CARD_W / 2
              if (Math.abs(selfCenterX - parentCenterX) < threshold) {
                finalOffsetX = parentCenterX - CARD_W / 2 - baseX
                guidelines.push({
                  x1: parentCenterX,
                  y1: renderedParent._y + CARD_H,
                  x2: parentCenterX,
                  y2: currentAbsY,
                  type: 'parent-vertical'
                })
              }
            }
          }
        }
      }

      setDragGuidelines(guidelines)

      // 3. Branch Merging Dropzone Identification
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        
        // Convert mouse coordinate to zoomed canvas space
        const canvasX = (mouseX - pan.x) / zoom
        const canvasY = (mouseY - pan.y) / zoom
        
        let targetMergeId = null
        
        for (const n of nodes) {
          if (n.id === draggedNodeId) continue
          
          // Exclude descendants to avoid circular cycles
          const dragNodeObj = nodes.find(item => item.id === draggedNodeId)
          if (dragNodeObj && isDescendant(dragNodeObj, n.id)) continue
          
          if (
            canvasX >= n._x && canvasX <= n._x + CARD_W &&
            canvasY >= n._y && canvasY <= n._y + CARD_H
          ) {
            targetMergeId = n.id
            break
          }
        }
        setHoveredMergeNodeId(targetMergeId)
      }

      setOrgData(prevData => {
        const updateOffset = (items) => items.map(item => {
          if (item.id === draggedNodeId) {
            return {
              ...item,
              offset: { x: finalOffsetX, y: finalOffsetY }
            }
          }
          if (item.children && item.children.length > 0) {
            return {
              ...item,
              children: updateOffset(item.children)
            }
          }
          return item
        })
        return updateOffset(prevData)
      })
    } else if (dragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    }
  }, [draggedNodeId, dragStartPos, dragStartOffset, zoom, dragging, dragStart, snapToGrid, nodes, orgData, pan])

  const fitToScreen = useCallback(() => {
    if (!containerRef.current || !bounds.w) return
    const cw = containerRef.current.clientWidth
    const ch = containerRef.current.clientHeight
    const headerH = 60
    const fitZoom = Math.min((cw - 40) / bounds.w, (ch - headerH - 40) / bounds.h, 1)
    const z = Math.max(0.25, fitZoom)
    setZoom(z)
    setPan({
      x: (cw - bounds.w * z) / 2 - bounds.minX * z,
      y: headerH + (ch - headerH - bounds.h * z) / 2 - bounds.minY * z,
    })
  }, [bounds])

  const handleMouseUp = useCallback(() => {
    if (draggedNodeId) {
      // Handle interactive branch merge drop
      if (hoveredMergeNodeId) {
        const dragNode = nodes.find(n => n.id === draggedNodeId)
        const targetNode = nodes.find(n => n.id === hoveredMergeNodeId)
        
        if (dragNode && targetNode) {
          const confirmMsg = `Bạn có chắc chắn muốn GỘP NHÁNH của nhân sự "${dragNode.name}" vào làm cấp dưới của "${targetNode.name}" không?\n(Toàn bộ nhân sự cấp dưới của ${dragNode.name} cũng sẽ chuyển theo)`
          if (window.confirm(confirmMsg)) {
            setOrgData(prev => mergeBranch(prev, draggedNodeId, hoveredMergeNodeId))
            setHasPendingChanges(true)
          }
        }
        setHoveredMergeNodeId(null)
      }
      
      setDraggedNodeId(null)
      setDragGuidelines([])
      setHasPendingChanges(true)
    }
    setDragging(false)
  }, [draggedNodeId, hoveredMergeNodeId, nodes, fitToScreen])

  const handleToggleLayout = useCallback((node) => {
    const newLayout = node.layout === 'vertical' ? 'horizontal' : 'vertical'
    
    // Update local state
    const updateLayout = (nodes) => nodes.map(n => {
      if (n.id === node.id) {
        return { ...n, layout: newLayout }
      }
      if (n.children) {
        return { ...n, children: updateLayout(n.children) }
      }
      return n
    })
    setOrgData(updateLayout(orgData))
    setHasPendingChanges(true)
  }, [orgData])

  const handleResetPosition = useCallback((node) => {
    // Update local state
    const resetOffset = (nodes) => nodes.map(n => {
      if (n.id === node.id) {
        return { ...n, offset: { x: 0, y: 0 } }
      }
      if (n.children) {
        return { ...n, children: resetOffset(n.children) }
      }
      return n
    })
    setOrgData(resetOffset(orgData))
    setHasPendingChanges(true)
  }, [orgData])

  // Explicitly align siblings horizontally/vertically
  const handleAlignSiblings = useCallback((node, direction) => {
    const info = findNodeInfo(orgData, node.id)
    if (!info || info.siblings.length === 0) {
      alert('Thẻ này không có thẻ nào khác cùng cấp!')
      return
    }

    const targetOffsetY = node.offset?.y || 0
    const targetOffsetX = node.offset?.x || 0

    const updateSiblings = (nodes) => nodes.map(n => {
      const isSibling = info.siblings.some(sib => sib.id === n.id)
      if (isSibling) {
        return {
          ...n,
          offset: {
            x: direction === 'vertical' ? targetOffsetX : (n.offset?.x || 0),
            y: direction === 'horizontal' ? targetOffsetY : (n.offset?.y || 0)
          }
        }
      }
      if (n.children) {
        return { ...n, children: updateSiblings(n.children) }
      }
      return n
    })

    setOrgData(updateSiblings(orgData))
    setHasPendingChanges(true)
  }, [orgData])

  // Helper to fetch flat list of valid potential managers (excluding self and descendants)
  const getPotentialManagers = useCallback((nodeId) => {
    const flatList = []
    const flatten = (items) => {
      items.forEach(item => {
        flatList.push(item)
        if (item.children) flatten(item.children)
      })
    }
    flatten(orgData)
    
    if (!nodeId) return flatList
    
    // Find the node to check descendants
    const findNodeObj = (items, id) => {
      for (const item of items) {
        if (item.id === id) return item
        if (item.children) {
          const found = findNodeObj(item.children, id)
          if (found) return found
        }
      }
      return null
    }
    const nodeObj = findNodeObj(orgData, nodeId)
    
    return flatList.filter(item => {
      if (item.id === nodeId) return false
      if (nodeObj && isDescendant(nodeObj, item.id)) return false
      return true
    })
  }, [orgData])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Calculate content position relative to zoom
    const contentX = (mouseX - pan.x) / zoom
    const contentY = (mouseY - pan.y) / zoom

    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.1, Math.min(3, zoom * delta))

    // Adjust pan to zoom towards mouse position
    setPan({
      x: mouseX - contentX * newZoom,
      y: mouseY - contentY * newZoom
    })
    setZoom(newZoom)
  }, [zoom, pan])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])



  // CRUD helpers
  const findAndReplace = (nodes, id, data) => nodes.map(n => {
    if (n.id === id) return { ...n, ...data }
    if (n.children) return { ...n, children: findAndReplace(n.children, id, data) }
    return n
  })
  const findAndAdd = (nodes, pid, child) => nodes.map(n => {
    if (n.id === pid) return { ...n, children: [...(n.children || []), child] }
    if (n.children) return { ...n, children: findAndAdd(n.children, pid, child) }
    return n
  })
  const findAndDelete = (nodes, id) => nodes.filter(n => n.id !== id).map(n => {
    if (n.children) return { ...n, children: findAndDelete(n.children, id) }
    return n
  })

  const handleDiscardChanges = () => {
    if (window.confirm("Bạn có chắc chắn muốn hủy bỏ toàn bộ những thay đổi chưa đồng bộ không?")) {
      setOrgData(deepClone(originalOrgData))
      setDeletedNodeIds([])
      setHasPendingChanges(false)
      hasCenteredRef.current = false
    }
  }

  const handleSaveChanges = async () => {
    if (isSaving) return
    try {
      setIsSaving(true)
      
      // 1. Delete nodes in deletedNodeIds
      if (deletedNodeIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('NMK_User')
          .delete()
          .in('id', deletedNodeIds)
        
        if (deleteError) {
          console.error('Error deleting nodes from Supabase:', deleteError)
          throw new Error('Không thể xóa nhân sự khỏi hệ thống Supabase.')
        }
      }
      
      // 2. Flatten current tree to flat list to prepare for upsert
      const flatCurrentNodes = []
      const flatten = (nodes, parentId = null) => {
        nodes.forEach(node => {
          flatCurrentNodes.push({
            ...node,
            manager_id: parentId
          })
          if (node.children && node.children.length > 0) {
            flatten(node.children, node.id)
          }
        })
      }
      flatten(orgData)
      
      // 3. Perform batch upsert
      const upsertPayload = flatCurrentNodes.map(node => {
        const offsetStr = node.offset ? JSON.stringify(node.offset) : JSON.stringify({ x: 0, y: 0 })
        
        return {
          id: node.id,
          full_name: node.name,
          name: node.name, // compatibility
          position: node.position,
          email: node.email || `${node.name.toLowerCase().replace(/\s+/g, '')}@rincovitch.com.au`,
          level: node.level || 0,
          manager_id: node.manager_id || null,
          team_name: node.team || 'General',
          layout: node.layout || 'horizontal',
          offset_xy: offsetStr,
          location: node.location || 'VIETNAM',
          is_assistant: node.isAssistant || false
        }
      })
      
      if (upsertPayload.length > 0) {
        const { error: upsertError } = await supabase
          .from('NMK_User')
          .upsert(upsertPayload, { onConflict: 'id' })
        
        if (upsertError) {
          console.error('Error upserting nodes to Supabase:', upsertError)
          throw new Error('Không thể lưu thông tin nhân sự vào Supabase.')
        }
      }
      
      // 4. Re-fetch data to confirm everything matches Supabase database
      const rawData = await fetchOrgChartData()
      
      const localData = rawData.filter(u => 
        u.location?.toUpperCase() === 'VIETNAM' && 
        u.full_name && 
        u.full_name.trim() !== ''
      )
      
      const nodesMap = {}
      const nameToNodeMap = {}
      const roots = []
      
      localData.forEach(item => {
        const node = {
          ...item,
          name: item.full_name,
          team: item.team_name,
          isAssistant: item.is_assistant,
          children: [],
          layout: item.layout || ((item.manager_id === null || item.manager_id === "" || item.level === 0) ? 'horizontal' : 'vertical'),
          offset: item.offset_xy ? (() => {
            try {
              return JSON.parse(item.offset_xy)
            } catch(e) {
              return { x: 0, y: 0 }
            }
          })() : { x: 0, y: 0 }
        }
        nodesMap[item.id] = node
        if (item.full_name) nameToNodeMap[item.full_name.trim()] = node
      })
      
      localData.forEach(item => {
        const node = nodesMap[item.id]
        let mid = item.manager_id
        if (typeof mid === 'string') mid = mid.trim()
        
        const parent = nodesMap[mid] || nameToNodeMap[mid]
        
        if (parent && parent.id !== node.id) {
          parent.children.push(node)
        } else {
          roots.push(node)
        }
      })
      
      roots.sort((a, b) => (a.level || 0) - (b.level || 0))
      
      setOrgData(roots)
      setOriginalOrgData(deepClone(roots))
      setDeletedNodeIds([])
      setHasPendingChanges(false)
      hasCenteredRef.current = false
      
      alert('Đồng bộ sơ đồ tổ chức lên Supabase thành công!')
    } catch (err) {
      console.error('Save error:', err)
      alert(`Đồng bộ thất bại: ${err.message || err}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const newManagerId = fd.get('manager_id') || null
    const name = fd.get('name')
    const position = fd.get('position')
    const email = fd.get('email')
    const layout = fd.get('layout')
    const dob = fd.get('dob')
    const level = parseInt(fd.get('level')) || 0
    const team = fd.get('team')

    // Update node details first
    let updatedData = findAndReplace(orgData, editingNode.id, {
      name,
      position,
      email,
      layout,
      dob,
      level,
      team
    })

    // If manager_id changed, restructure the tree (gộp nhánh)
    if (newManagerId !== editingNode.manager_id) {
      if (!newManagerId) {
        // Move to root level (no parent)
        let dragNode = null
        const removeNode = (list) => {
          for (let i = 0; i < list.length; i++) {
            if (list[i].id === editingNode.id) {
              dragNode = list[i]
              list.splice(i, 1)
              return true
            }
            if (list[i].children && list[i].children.length > 0) {
              if (removeNode(list[i].children)) return true
            }
          }
          return false
        }
        const cloned = deepClone(updatedData)
        removeNode(cloned)
        if (dragNode) {
          dragNode.manager_id = null
          dragNode.offset = { x: 0, y: 0 }
          cloned.push(dragNode)
        }
        updatedData = cloned
      } else {
        updatedData = mergeBranch(updatedData, editingNode.id, newManagerId)
      }
    }

    setOrgData(updatedData)
    setEditingNode(null)
    setHasPendingChanges(true)
  }

  const handleAdd = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const targetManagerId = fd.get('manager_id')
    const newId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)
    
    const newNode = {
      id: newId, 
      name: fd.get('name'), 
      position: fd.get('position'),
      email: fd.get('email') || `${fd.get('name').toLowerCase().replace(/\s+/g, '')}@rincovitch.com.au`,
      layout: fd.get('layout'),
      dob: fd.get('dob'),
      level: parseInt(fd.get('level')) || 0,
      team: fd.get('team') || 'General', 
      children: [],
      offset: { x: 0, y: 0 }
    }

    setOrgData(prev => findAndAdd(prev, targetManagerId, newNode))
    setAddingToNode(null)
    setHasPendingChanges(true)
  }

  return (
    <div className="tab-org">
      {/* Header */}
      <div className="org-header" style={{ background: isDark ? 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.7) 100%)' : 'linear-gradient(180deg, rgba(248,250,252,0.95) 0%, rgba(248,250,252,0.7) 100%)' }}>
        <div className="org-header-branding">
          <div className="org-icon-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div>
            <h1 className="org-title">Organization Chart</h1>
            <p className="org-subtitle">Rincovitch Engineering</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Draft indicator */}
          {isAdmin && hasPendingChanges && (
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              color: '#F59E0B',
              background: 'rgba(245, 158, 11, 0.1)',
              padding: '6px 12px',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid rgba(245, 158, 11, 0.25)',
              marginRight: 10,
              animation: 'pulse 2s infinite'
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }} />
              Bản nháp (chưa đồng bộ)
            </span>
          )}

          {/* Snap grid / Auto-align switch */}
          <button 
            onClick={() => setSnapToGrid(s => !s)} 
            className={`org-tool-btn ${snapToGrid ? 'active-snap' : ''}`}
            title={snapToGrid ? "Đang BẬT tự dóng hàng / Hít lưới (20px)" : "Đang TẮT tự dóng hàng / Hít lưới"}
          >
            <LayoutGrid size={16} />
          </button>

          {/* Zoom controls */}
          <button onClick={() => setZoom(z => Math.min(2, z * 1.2))} className="org-tool-btn" title="Phóng to"><ZoomIn size={16} /></button>
          <button onClick={() => setZoom(z => Math.max(0.2, z * 0.8))} className="org-tool-btn" title="Thu nhỏ"><ZoomOut size={16} /></button>
          <button onClick={fitToScreen} className="org-tool-btn" title="Vừa khít màn hình"><Maximize2 size={16} /></button>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, minWidth: 45, textAlign: 'center', marginRight: 10 }}>{Math.round(zoom * 100)}%</div>

          {/* Sync controls */}
          {isAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {hasPendingChanges && (
                <button
                  onClick={handleDiscardChanges}
                  disabled={isSaving}
                  className="org-btn-cancel"
                  title="Hủy toàn bộ thay đổi chưa đồng bộ"
                >
                  <RotateCcw size={14} /> HỦY
                </button>
              )}
              <button
                onClick={handleSaveChanges}
                disabled={!hasPendingChanges || isSaving}
                className={`org-btn-sync ${hasPendingChanges && !isSaving ? 'ready' : (isSaving ? 'saving ready' : 'disabled')}`}
                title="Đồng bộ sơ đồ hiện tại lên Supabase"
              >
                {isSaving ? (
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  <Save size={14} />
                )}
                {isSaving ? 'ĐANG LƯU...' : 'ĐỒNG BỘ SUPABASE'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      {loading ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: isDark ? '#0F172A' : '#F8FAFC', zIndex: 50 }}>
          <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p style={{ fontSize: 10, fontWeight: 900, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Fetching Corporate Hierarchy...</p>
        </div>
      ) : (
        <div ref={containerRef}
          style={{ position: 'absolute', inset: 0, cursor: (draggedNodeId || dragging) ? 'grabbing' : 'grab', overflow: 'hidden' }}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        >
        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', position: 'relative' }}>
          {/* SVG Connectors */}
          <svg style={{ position: 'absolute', left: 0, top: 0, width: bounds.maxX + 200, height: bounds.maxY + 200, pointerEvents: 'none', overflow: 'visible' }}>
            {edges.map((edge, i) => {
              const delay = -(i % 4) * 0.2;
              return (
                <g key={i}>
                  {/* Base line */}
                  <path d={edge.d} fill="none" stroke={edge.color} strokeWidth="2" opacity="0.15" strokeLinecap="round" />
                  {/* Tail 3 (Faintest) */}
                  <path d={edge.d} fill="none" stroke={edge.color} strokeWidth="1" strokeLinecap="round" opacity="0.2"
                    style={{ strokeDasharray: '30 232', animation: `flowLight 1.2s linear infinite ${delay}s` }} />
                  {/* Tail 2 (Mid) */}
                  <path d={edge.d} fill="none" stroke={edge.color} strokeWidth="2" strokeLinecap="round" opacity="0.5"
                    style={{ strokeDasharray: '15 247', animation: `flowLight 1.2s linear infinite ${delay - 0.07}s` }} />
                  {/* Head (Brightest) */}
                  <path d={edge.d} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" 
                    style={{
                      filter: `drop-shadow(0 0 5px ${edge.color}) drop-shadow(0 0 10px #fff)`,
                      strokeDasharray: '4 258',
                      animation: `flowLight 1.2s linear infinite ${delay - 0.12}s`
                    }} 
                  />
                </g>
              )
            })}

            {/* Alignment Guidelines (Snapping lines) */}
            {dragGuidelines.map((gl, idx) => (
              <g key={`gl-${idx}`}>
                <line
                  x1={gl.x1}
                  y1={gl.y1}
                  x2={gl.x2}
                  y2={gl.y2}
                  stroke="#F59E0B"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  style={{
                    filter: 'drop-shadow(0 0 4px #F59E0B)',
                    opacity: 0.85
                  }}
                />
                <circle cx={gl.x1} cy={gl.y1} r="4" fill="#F59E0B" />
                <circle cx={gl.x2} cy={gl.y2} r="4" fill="#F59E0B" />
              </g>
            ))}
          </svg>

          {/* Cards */}
          {nodes.map(node => (
            <OrgCard key={node.id} node={node}
              isSelected={selectedNode?.id === node.id}
              isMergeTarget={hoveredMergeNodeId === node.id}
              onSelect={setSelectedNode}
              onEdit={setEditingNode}
              onAdd={setAddingToNode}
              onDelete={(id) => {
                if (window.confirm("Bạn có chắc chắn muốn xóa nhân sự này khỏi sơ đồ tổ chức không?")) {
                  setOrgData(findAndDelete(orgData, id))
                  setDeletedNodeIds(prev => [...prev, id])
                  setHasPendingChanges(true)
                }
              }}
              onDragStart={handleDragStart}
              onToggleLayout={handleToggleLayout}
              onResetPosition={handleResetPosition}
              onAlignSiblings={handleAlignSiblings}
              isAdmin={isAdmin}
              isDark={isDark}
              hasMovedRef={hasMovedRef}
            />
          ))}
        </div>
      </div>
      )}

      {/* Detail Panel - centered modal */}
      {selectedNode && (
        <div className="org-modal-wrapper">
          <div className="org-modal-backdrop" onClick={() => setSelectedNode(null)} />
          <div className="org-modal-content">
          {/* Close button */}
          <button onClick={() => setSelectedNode(null)} className="org-modal-close">✕</button>

          {/* Header with accent color band */}
          <div style={{
            background: `linear-gradient(135deg, ${getColor(selectedNode.team).accent}20, ${getColor(selectedNode.team).accent}08)`,
            borderBottom: `2px solid ${getColor(selectedNode.team).accent}40`,
            padding: '28px 24px 24px', textAlign: 'center',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 14px',
              background: `${getColor(selectedNode.team).accent}15`,
              border: `3px solid ${getColor(selectedNode.team).accent}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: getColor(selectedNode.team).accent, fontWeight: 900, fontSize: 40,
              boxShadow: `0 0 30px ${getColor(selectedNode.team).accent}20`, overflow: 'hidden'
            }}>
              {getZodiac(selectedNode.dob).emoji}
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: isDark ? '#fff' : '#0F172A', marginBottom: 4 }}>{selectedNode.name}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: getColor(selectedNode.team).accent, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{selectedNode.position}</div>
          </div>

          {/* Info table */}
          <div className="org-modal-body">
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
              <tbody>
                {[
                  { label: 'Email', value: selectedNode.email || '—' },
                  { label: 'Ngày sinh', value: selectedNode.dob ? new Date(selectedNode.dob).toLocaleDateString('vi-VN') : '—' },
                  { label: 'Con giáp', value: getZodiac(selectedNode.dob).name },
                  { label: 'Team', value: selectedNode.team },
                  { label: 'ID', value: selectedNode.id },
                ].map((row, i) => (
                  <tr key={i}>
                    <td className="org-modal-label">{row.label}</td>
                    <td className="org-modal-value">{row.value || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Team badge */}
            <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: 12, background: `${getColor(selectedNode.team).accent}08`, border: `1px solid ${getColor(selectedNode.team).accent}20` }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Department</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: getColor(selectedNode.team).accent }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{selectedNode.team || 'General'}</span>
              </div>
            </div>

            {/* Action buttons */}
            {isAdmin && (
              <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                <button onClick={() => { setEditingNode(selectedNode); setSelectedNode(null) }} style={{
                  flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)',
                  background: 'rgba(99,102,241,0.1)', color: '#818CF8', fontWeight: 800, fontSize: 11,
                  textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}><Edit3 size={13} /> Edit</button>
                <button onClick={() => { setAddingToNode(selectedNode); setSelectedNode(null) }} style={{
                  flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.3)',
                  background: 'rgba(16,185,129,0.1)', color: '#34D399', fontWeight: 800, fontSize: 11,
                  textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}><Plus size={13} /> Add Sub</button>
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes fadeInUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes flowLight {
          from { stroke-dashoffset: 262; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.65; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Edit / Add Modal */}
      {(editingNode || addingToNode) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)' }} onClick={() => { setEditingNode(null); setAddingToNode(null) }} />
          <form onSubmit={editingNode ? handleEdit : handleAdd} style={{ position: 'relative', width: '100%', maxWidth: 420, background: isDark ? '#1E293B' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 16, padding: 28, boxShadow: isDark ? '0 30px 80px rgba(0,0,0,0.6)' : '0 30px 80px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1' }}>
                {editingNode ? <Edit3 size={20} /> : <UserPlus size={20} />}
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: isDark ? '#fff' : '#0F172A', margin: 0 }}>{editingNode ? 'Edit Member' : 'Add Member'}</h2>
                <p style={{ fontSize: 10, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '2px 0 0' }}>Update organization</p>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle(isDark)}>Name</label>
              <input name="name" defaultValue={editingNode?.name || ''} required style={inputStyle(isDark)} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle(isDark)}>Email</label>
              <input type="email" name="email" defaultValue={editingNode?.email || ''} placeholder="example@rincovitch.com.au" style={inputStyle(isDark)} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle(isDark)}>Position</label>
              <input name="position" defaultValue={editingNode?.position || ''} required style={inputStyle(isDark)} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle(isDark)}>Level</label>
              <input type="number" name="level" defaultValue={editingNode?.level ?? (addingToNode ? (addingToNode.level || 0) + 1 : 0)} required style={inputStyle(isDark)} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle(isDark)}>Ngày sinh (DOB)</label>
              <input type="date" name="dob" defaultValue={editingNode?.dob || ''} style={inputStyle(isDark)} />
            </div>

            {/* Direct Manager (Branch Merge) select */}
            {editingNode && (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle(isDark)}>Quản lý trực tiếp (Gộp nhánh)</label>
                <select name="manager_id" defaultValue={editingNode.manager_id || ''} style={inputStyle(isDark)}>
                  <option value="">-- Không có (Cấp cao nhất) --</option>
                  {getPotentialManagers(editingNode.id).map(mgr => (
                    <option key={mgr.id} value={mgr.id}>
                      {mgr.name} ({mgr.position})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {addingToNode && (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle(isDark)}>Quản lý trực tiếp</label>
                <select name="manager_id" defaultValue={addingToNode.id} style={inputStyle(isDark)}>
                  {getPotentialManagers(null).map(mgr => (
                    <option key={mgr.id} value={mgr.id}>
                      {mgr.name} ({mgr.position})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle(isDark)}>Phòng ban / Màu sắc (Team)</label>
              <select name="team" defaultValue={editingNode?.team || addingToNode?.team || 'General'} style={inputStyle(isDark)}>
                <option value="Leadership">Leadership (Vàng hổ phách)</option>
                <option value="Slab Design">Slab Design (Tím)</option>
                <option value="BIM / REO / MTO">BIM / REO / MTO (Xanh ngọc)</option>
                <option value="BIM">BIM (Xanh ngọc)</option>
                <option value="Lateral Design">Lateral Design (Xanh lá)</option>
                <option value="Support">Support (Đỏ hồng)</option>
                <option value="General">General (Xanh lam)</option>
              </select>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle(isDark)}>Children Layout</label>
              <select name="layout" defaultValue={editingNode?.layout || 'horizontal'} style={inputStyle(isDark)}>
                <option value="horizontal">Horizontal (Trải ngang)</option>
                <option value="vertical">Vertical (Xếp dọc)</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => { setEditingNode(null); setAddingToNode(null) }} style={{ flex: 1, padding: '10px', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 10, color: isDark ? '#94A3B8' : '#475569', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ flex: 2, padding: '10px', background: '#6366F1', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Save size={14} /> Confirm</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

const toolBtnStyle = (isDark) => ({ width: 34, height: 34, borderRadius: 8, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: isDark ? '#94A3B8' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' })
const labelStyle = (isDark) => ({ display: 'block', fontSize: 10, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 })
const inputStyle = (isDark) => ({ width: '100%', padding: '10px 14px', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 10, color: isDark ? '#fff' : '#0F172A', fontSize: 14, fontWeight: 600, outline: 'none', boxSizing: 'border-box' })

export default OrgChart
