import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Search, Edit3, Plus, Trash2, Save, UserPlus, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import initialOrgData from '../data/orgData.json'
import { useApp } from '../context/AppContext'
import { fetchOrgChartData } from '../services/supabaseService'

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
  node._x = left + node._px
  node._y = top

  if (kids.length === 0) return

  if (node.layout === 'vertical') {
    const childCardX = node._x + CARD_W / 2 + INDENT
    let childTop = top + CARD_H + V_SEP
    kids.forEach(child => {
      const childLeft = childCardX - child._px
      layoutPos(child, childLeft, childTop)
      childTop += child._sh + V_STACK_SEP
    })
  } else {
    const totalCW = kids.reduce((s, c) => s + c._sw, 0) + (kids.length - 1) * H_SEP
    let childLeft = left + (node._sw - totalCW) / 2
    const childTop = top + CARD_H + V_SEP
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
const OrgCard = ({ node, isSelected, onSelect, onEdit, onAdd, onDelete }) => {
  const tc = getColor(node.team)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); onSelect(node) }}
      style={{
        position: 'absolute',
        left: node._x,
        top: node._y,
        width: CARD_W,
        height: CARD_H,
        borderRadius: 12,
        background: '#fff',
        border: `2px solid ${isSelected ? tc.accent : tc.border}`,
        boxShadow: isSelected
          ? `0 0 0 3px ${tc.accent}33, 0 8px 25px rgba(0,0,0,0.12)`
          : '0 4px 15px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.2s',
        transform: hovered ? 'scale(1.03)' : 'scale(1)',
        zIndex: hovered ? 50 : 10,
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {/* Avatar circle */}
      <div style={{
        position: 'absolute', left: -26,
        width: 52, height: 52, borderRadius: '50%',
        background: '#fff', border: `3px solid ${tc.accent}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: tc.accent, fontWeight: 900, fontSize: 32,
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
      }}>
        {getZodiac(node.dob).emoji}
      </div>

      {/* Info */}
      <div style={{ flex: 1, paddingLeft: 36, paddingRight: 8, overflow: 'hidden' }}>
        <div style={{
          fontSize: 13, fontWeight: 800, color: '#1E293B',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          lineHeight: '1.2', marginBottom: 3,
        }}>{node.name}</div>
        <div style={{
          fontSize: 9, fontWeight: 700, color: tc.accent,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{node.position}</div>
      </div>

      {/* Hover actions */}
      {hovered && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          borderRadius: 10,
        }}>
          <button onClick={(e) => { e.stopPropagation(); onEdit(node) }}
            style={actionBtnStyle('#6366F1')}><Edit3 size={14} /></button>
          <button onClick={(e) => { e.stopPropagation(); onAdd(node) }}
            style={actionBtnStyle('#10B981')}><Plus size={14} /></button>
          {node.level !== 0 && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(node.id) }}
              style={actionBtnStyle('#EF4444')}><Trash2 size={14} /></button>
          )}
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
  const isDark = theme === 'GALAXY' || theme === 'DARK'

  const [orgData, setOrgData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState(null)
  const [editingNode, setEditingNode] = useState(null)
  const [addingToNode, setAddingToNode] = useState(null)

  // Pan & Zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(0.85)
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)

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
            // Auto-layout: roots horizontal, kids vertical
            layout: (item.manager_id === null || item.manager_id === "" || item.level === 0) ? 'horizontal' : 'vertical'
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

  // Center on mount
  useEffect(() => {
    if (containerRef.current && bounds.w) {
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
    }
  }, [bounds])

  // Pan handlers
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    setDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }, [pan])

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }, [dragging, dragStart])

  const handleMouseUp = useCallback(() => setDragging(false), [])

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

  const fitToScreen = () => {
    if (!containerRef.current) return
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
  }

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

  const handleEdit = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    setOrgData(findAndReplace(orgData, editingNode.id, { 
      name: fd.get('name'), 
      position: fd.get('position'),
      layout: fd.get('layout'),
      dob: fd.get('dob'),
      level: parseInt(fd.get('level')) || 0
    }))
    setEditingNode(null)
  }
  const handleAdd = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    setOrgData(findAndAdd(orgData, addingToNode.id, {
      id: Date.now().toString(), 
      name: fd.get('name'), 
      position: fd.get('position'),
      layout: fd.get('layout'),
      dob: fd.get('dob'),
      level: parseInt(fd.get('level')) || 0,
      team: addingToNode.team, 
      children: [],
    }))
    setAddingToNode(null)
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '88vh', background: isDark ? '#0F172A' : '#F8FAFC', borderRadius: 12, overflow: 'hidden', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
      {/* Header */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: isDark ? 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.7) 100%)' : 'linear-gradient(180deg, rgba(248,250,252,0.95) 0%, rgba(248,250,252,0.7) 100%)', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #F59E0B, #D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: isDark ? '#fff' : '#0F172A', letterSpacing: '-0.03em', margin: 0, lineHeight: 1 }}>Organization Chart</h1>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.2em', margin: '3px 0 0' }}>Rincovitch Engineering</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setZoom(z => Math.min(2, z * 1.2))} style={toolBtnStyle(isDark)}><ZoomIn size={16} /></button>
          <button onClick={() => setZoom(z => Math.max(0.2, z * 0.8))} style={toolBtnStyle(isDark)}><ZoomOut size={16} /></button>
          <button onClick={fitToScreen} style={toolBtnStyle(isDark)}><Maximize2 size={16} /></button>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, minWidth: 45, textAlign: 'center' }}>{Math.round(zoom * 100)}%</div>
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
          style={{ position: 'absolute', inset: 0, cursor: dragging ? 'grabbing' : 'grab', overflow: 'hidden' }}
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
          </svg>

          {/* Cards */}
          {nodes.map(node => (
            <OrgCard key={node.id} node={node}
              isSelected={selectedNode?.id === node.id}
              onSelect={setSelectedNode}
              onEdit={setEditingNode}
              onAdd={setAddingToNode}
              onDelete={(id) => setOrgData(findAndDelete(orgData, id))}
            />
          ))}
        </div>
      </div>
      )}

      {/* Detail Panel - centered modal */}
      {selectedNode && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setSelectedNode(null)} />
          <div style={{
            position: 'relative', width: 340, maxWidth: '90%', zIndex: 501,
            background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16,
            boxShadow: '0 30px 80px rgba(0,0,0,0.2)',
            animation: 'fadeInUp 0.3s ease-out',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
          {/* Close button */}
          <button onClick={() => setSelectedNode(null)} style={{
            position: 'absolute', top: 12, right: 12, zIndex: 10,
            width: 30, height: 30, borderRadius: 8,
            background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)',
            color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>✕</button>

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
          <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
              <tbody>
                {[
                  { label: 'Ngày sinh', value: selectedNode.dob ? new Date(selectedNode.dob).toLocaleDateString('vi-VN') : '—' },
                  { label: 'Con giáp', value: getZodiac(selectedNode.dob).name },
                  { label: 'Team', value: selectedNode.team },
                  { label: 'ID', value: selectedNode.id },
                ].map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: '10px 12px', fontSize: 10, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.12em', width: 90, verticalAlign: 'top' }}>{row.label}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: isDark ? '#E2E8F0' : '#0F172A', background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderRadius: 8 }}>{row.value || '—'}</td>
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
      `}</style>

      {/* Edit / Add Modal */}
      {(editingNode || addingToNode) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)' }} onClick={() => { setEditingNode(null); setAddingToNode(null) }} />
          <form onSubmit={editingNode ? handleEdit : handleAdd} style={{ position: 'relative', width: '100%', maxWidth: 420, background: isDark ? '#1E293B' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 16, padding: 28, boxShadow: isDark ? '0 30px 80px rgba(0,0,0,0.6)' : '0 30px 80px rgba(0,0,0,0.15)' }}>
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
