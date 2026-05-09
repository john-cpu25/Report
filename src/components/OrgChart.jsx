import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  Search, 
  Edit3, 
  X, 
  ChevronRight, 
  ChevronDown, 
  Save, 
  Plus, 
  Trash2, 
  UserPlus,
  GitGraph,
  Hexagon,
  Layers,
  Crown,
  LayoutGrid
} from 'lucide-react'
import initialOrgData from '../data/orgData.json'

// --- Premium Bee Icon SVG ---
const CustomBee = ({ color = "currentColor", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Wings */}
    <path d="M12 10C12 10 14 6 18 6C22 6 22 10 18 12C14 14 12 13 12 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
    <path d="M12 10C12 10 10 6 6 6C2 6 2 10 6 12C10 14 12 13 12 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
    {/* Body Stripes */}
    <path d="M9 13H15" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M10 16H14" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M11 19H13" stroke={color} strokeWidth="2" strokeLinecap="round" />
    {/* Head & Antennae */}
    <circle cx="12" cy="9" r="3" stroke={color} strokeWidth="1.5" />
    <path d="M10 7L8 4" stroke={color} strokeWidth="1" strokeLinecap="round" />
    <path d="M14 7L16 4" stroke={color} strokeWidth="1" strokeLinecap="round" />
  </svg>
)

// --- Hexagon Component ---
const HexNode = ({ node, onClick, isQueen, beeColor, beeRole, textClass, glowClass }) => {
  return (
    <motion.div
      layout
      whileHover={{ scale: 1.1, zIndex: 50 }}
      onClick={() => onClick(node)}
      className={`relative w-28 h-32 cursor-pointer group transition-all duration-500`}
      style={{
        clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"
      }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${glowClass} border-2 backdrop-blur-xl transition-all duration-300 group-hover:brightness-150`} />
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
        {isQueen ? (
          <div className="text-orange-400 animate-bounce mb-1"><Crown size={14} fill="#f97316" fillOpacity="0.2" /></div>
        ) : (
          <div className={`transition-transform duration-500 group-hover:rotate-12`}><CustomBee color={beeColor} size={18} /></div>
        )}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-6 p-3 text-center">
        <p className={`text-[8px] font-black leading-none mb-1 uppercase tracking-tighter truncate w-full ${textClass}`}>{node.name}</p>
        <p className="text-[6px] font-bold text-slate-500 uppercase tracking-widest truncate w-full">{node.position}</p>
      </div>
    </motion.div>
  )
}

// --- Mindmap OrgNode ---
const OrgNode = ({ node, onSelect, onEdit, onAdd, onDelete, isSelected, branchColor }) => {
  const hasChildren = node.children && node.children.length > 0
  const [isExpanded, setIsExpanded] = useState(true)
  const assistant = node.children?.find(c => c.isAssistant)
  const regularChildren = node.children?.filter(c => !c.isAssistant) || []

  const colors = {
    "Slab Design": "from-purple-500 to-indigo-600",
    "BIM / REO / MTO": "from-cyan-500 to-blue-600",
    "Lateral Design": "from-emerald-500 to-teal-600",
    "Leadership": "from-amber-500 to-orange-600"
  }
  const currentColor = branchColor || colors[node.team] || "from-slate-600 to-slate-700"
  const themeHex = currentColor.includes('cyan') ? '#06b6d4' : 
                   currentColor.includes('purple') ? '#8b5cf6' :
                   currentColor.includes('emerald') ? '#10b981' : '#6366f1'

  return (
    <div className="flex flex-col items-center relative">
      <div className="relative z-10">
        <motion.div layout onClick={() => onSelect(node)} className={`relative group cursor-pointer transition-all duration-500 ${isSelected?.id === node.id ? 'scale-110' : 'hover:scale-105'}`}>
          <div className={`absolute -inset-2 bg-gradient-to-r ${currentColor} rounded-full blur-xl opacity-0 group-hover:opacity-40 transition duration-1000 animate-pulse`} />
          <div className={`relative flex flex-col items-center justify-center w-24 h-24 rounded-full border bg-slate-900 shadow-2xl overflow-hidden transition-all duration-300 ${isSelected?.id === node.id ? `border-white/40 ring-4 ring-white/10` : 'border-white/10'}`}>
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${currentColor}`} />
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 text-[10px] font-black uppercase ${node.level === 0 ? 'bg-amber-500/20 text-amber-400' : `bg-white/5 text-white/80`}`}>{node.name.split(' ').map(n => n[0]).join('')}</div>
            <div className="px-2 text-center">
              <p className="text-[9px] font-black text-white truncate w-20 leading-none mb-0.5 tracking-tight">{node.name}</p>
              <p className={`text-[7px] font-bold uppercase tracking-tighter truncate w-20 ${node.level === 0 ? 'text-amber-500/60' : 'text-slate-500'}`}>{node.position}</p>
            </div>
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-1.5">
              <button onClick={(e) => { e.stopPropagation(); onEdit(node); }} className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"><Edit3 size={11} /></button>
              <button onClick={(e) => { e.stopPropagation(); onAdd(node); }} className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"><Plus size={11} /></button>
              {node.level !== 0 && <button onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} className="p-1.5 rounded-full bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"><Trash2 size={11} /></button>}
            </div>
          </div>
          {hasChildren && regularChildren.length > 0 && <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-lg ${isExpanded ? 'rotate-0' : '-rotate-90'}`}><ChevronDown size={10} /></button>}
        </motion.div>
      </div>

      <AnimatePresence>
        {isExpanded && regularChildren.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={`flex mt-16 w-full relative ${node.layout === 'vertical' ? 'flex-col items-center' : 'justify-center gap-16 pt-12 items-start'}`}>
            <svg className="absolute top-[-64px] left-0 w-full h-[calc(100%+64px)] pointer-events-none overflow-visible">
              {node.layout === 'vertical' ? (
                <>
                  <path d="M 50% 0 L 50% 100%" stroke={themeHex} strokeWidth="1" strokeDasharray="4 4" opacity="0.2" fill="none" />
                  {regularChildren.map((child, i) => (
                    <path key={child.id} d={`M 50% ${64 + i * 110} L ${child.side === 'left' ? 'calc(50% - 40px)' : 'calc(50% + 40px)'} ${64 + i * 110}`} stroke={themeHex} strokeWidth="1.5" opacity="0.3" fill="none" />
                  ))}
                </>
              ) : (
                <g opacity="0.3">
                  <path d="M 50% 0 L 50% 32" stroke={themeHex} strokeWidth="2" fill="none" />
                  <path d={`M 15% 32 L 85% 32`} stroke={themeHex} strokeWidth="2" strokeLinecap="round" />
                  {regularChildren.map((_, i) => (
                    <path key={i} d={`M ${15 + (i * 70) / (regularChildren.length - 1)}% 32 L ${15 + (i * 70) / (regularChildren.length - 1)}% 64`} stroke={themeHex} strokeWidth="2" fill="none" />
                  ))}
                </g>
              )}
            </svg>
            {regularChildren.map((child) => (
              <div key={child.id} className={`relative flex items-center ${node.layout === 'vertical' ? `w-full ${child.side === 'left' ? 'flex-row-reverse justify-start pr-[50%]' : 'flex-row justify-start pl-[50%]'} mb-12` : 'flex-col'}`}>
                <div className={node.layout === 'vertical' ? (child.side === 'left' ? 'mr-10' : 'ml-10') : ''}>
                  <OrgNode node={child} onSelect={onSelect} onEdit={onEdit} onAdd={onAdd} onDelete={onDelete} isSelected={isSelected} branchColor={node.level === 0 ? colors[child.team] : branchColor} />
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- Main Component ---
const OrgChart = () => {
  const [orgData, setOrgData] = useState(() => {
    const saved = localStorage.getItem('rincovitch_org_data_v21')
    return saved ? JSON.parse(saved) : initialOrgData
  })
  const [viewMode, setViewMode] = useState('mindmap')
  const [selectedNode, setSelectedNode] = useState(null)
  const [editingNode, setEditingNode] = useState(null)
  const [addingToNode, setAddingToNode] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    localStorage.setItem('rincovitch_org_data_v21', JSON.stringify(orgData))
  }, [orgData])

  const flattenData = (nodes) => {
    let flat = []
    nodes.forEach(node => {
      flat.push(node)
      if (node.children) flat = flat.concat(flattenData(node.children))
    })
    return flat
  }

  const findAndReplace = (nodes, id, newData) => {
    return nodes.map(node => {
      if (node.id === id) return { ...node, ...newData }
      if (node.children) return { ...node, children: findAndReplace(node.children, id, newData) }
      return node
    })
  }

  const findAndAdd = (nodes, parentId, newNode) => {
    return nodes.map(node => {
      if (node.id === parentId) return { ...node, children: [...(node.children || []), newNode] }
      if (node.children) return { ...node, children: findAndAdd(node.children, parentId, newNode) }
      return node
    })
  }

  const findAndDelete = (nodes, id) => {
    return nodes.filter(node => node.id !== id).map(node => {
      if (node.children) return { ...node, children: findAndDelete(node.children, id) }
      return node
    })
  }

  const handleUpdateNode = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const newData = { name: formData.get('name'), position: formData.get('position') }
    setOrgData(findAndReplace(orgData, editingNode.id, newData))
    if (selectedNode?.id === editingNode.id) setSelectedNode({ ...selectedNode, ...newData })
    setEditingNode(null)
  }

  const handleAddNode = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const newNode = {
      id: Date.now().toString(),
      name: formData.get('name'),
      position: formData.get('position'),
      team: addingToNode.team,
      level: (addingToNode.level || 0) + 1,
      side: formData.get('side') || 'right',
      children: []
    }
    setOrgData(findAndAdd(orgData, addingToNode.id, newNode))
    setAddingToNode(null)
  }

  const rawFlatNodes = flattenData(orgData)
  const managersNames = ["Nhân Nguyễn", "Đức Phạm", "Trí Nguyễn", "Dung Đỗ", "Sơn Lâm"]
  const leadersNames = ["Nguyên Lý", "Khánh Nguyễn", "Cường Phạm", "Tiến Trần"]

  // --- Bee Styling Logic Helper ---
  const getBeeStyles = (node) => {
    const isQueen = node.name === "Vũ Đỗ"
    const isManager = managersNames.includes(node.name)
    const isLeader = leadersNames.includes(node.name)

    let beeColor = "#ffffff"
    let beeRole = "Bee Worker"
    let glowClass = "from-white/10 to-white/5 border-white/20"
    let textClass = "text-white/60"

    if (isQueen) {
      beeColor = "#f97316"
      beeRole = "Queen Bee"
      glowClass = "from-orange-500/30 to-amber-600/30 border-orange-400 shadow-[0_0_30px_rgba(249,115,22,0.4)] scale-125 z-10"
      textClass = "text-orange-400"
    } else if (isManager) {
      beeColor = "#a855f7"
      beeRole = "Bee Manager"
      glowClass = "from-purple-500/30 to-indigo-600/30 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
      textClass = "text-purple-400"
    } else if (isLeader) {
      beeColor = "#3b82f6"
      beeRole = "Bee Leader"
      glowClass = "from-blue-500/30 to-cyan-600/30 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
      textClass = "text-blue-400"
    }
    return { isQueen, isManager, isLeader, beeColor, beeRole, glowClass, textClass }
  }

  // --- Team Mapping Logic ---
  const engineerTeam = {
    leader: rawFlatNodes.find(n => n.name === "Vũ Đỗ"),
    slab: rawFlatNodes.filter(n => ["Đức Phạm", "Dung Đỗ", "Trí Nguyễn", "Ngân Trần", "Bảo Phạm", "An Nguyễn", "Nhân Phạm", "Kỳ Phan"].includes(n.name)),
    lateral: rawFlatNodes.filter(n => ["Sơn Lâm", "Junior 1"].includes(n.name))
  }

  const drafterTeam = {
    leader: rawFlatNodes.find(n => n.name === "Nhân Nguyễn"),
    modeling: rawFlatNodes.filter(n => ["Nguyên Lý", "Khánh Nguyễn", "Quang Nguyễn", "Tâm Phan", "Khiêm Nguyễn", "Quân Nguyễn", "Khang Trịnh"].includes(n.name)),
    ptreo: rawFlatNodes.filter(n => ["Cường Phạm", "Tiến Trần", "Nhân Khưu", "Trung Nguyễn", "Đăng Nguyễn", "Hoàng Phạm"].includes(n.name))
  }

  return (
    <div className="relative min-h-[90vh] flex flex-col bg-slate-950/40 rounded-[3rem] border border-white/5 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-20 flex items-center justify-between p-10">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl text-white shadow-2xl shadow-orange-500/20">
            <CustomBee size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">Beehive Intelligence</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-2">Strategic Colony Management</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 shadow-inner">
            {[
              { id: 'mindmap', icon: <GitGraph size={14} />, label: 'Mindmap' },
              { id: 'honeycomb', icon: <CustomBee size={14} />, label: 'Beehive' },
              { id: 'team', icon: <LayoutGrid size={14} />, label: 'Teams' }
            ].map(mode => (
              <button key={mode.id} onClick={() => setViewMode(mode.id)} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === mode.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-white'}`}>{mode.icon} {mode.label}</button>
            ))}
          </div>
          <div className="relative group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={16} /><input type="text" placeholder="Scan colony..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-xs font-bold text-white outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500/30 transition-all w-64" /></div>
        </div>
      </div>

      <div className="relative flex-grow overflow-auto custom-scrollbar p-10 select-none">
        {viewMode === 'mindmap' ? (
          <div className="flex justify-center min-w-max pb-40">
            {orgData.map(rootNode => (<OrgNode key={rootNode.id} node={rootNode} onSelect={setSelectedNode} onEdit={setEditingNode} onAdd={setAddingToNode} onDelete={(id) => setOrgData(findAndDelete(orgData, id))} isSelected={selectedNode} />))}
          </div>
        ) : viewMode === 'honeycomb' ? (
          <div className="max-w-7xl mx-auto pb-40 px-10 space-y-20">
            {[
              { id: 'queen', label: 'Queen Bee', nodes: rawFlatNodes.filter(n => n.name === "Vũ Đỗ") },
              { id: 'managers', label: 'Bee Managers', nodes: rawFlatNodes.filter(n => managersNames.includes(n.name)) },
              { id: 'leaders', label: 'Bee Leaders', nodes: rawFlatNodes.filter(n => leadersNames.includes(n.name)) },
              { id: 'workers', label: 'Bee Workers', nodes: rawFlatNodes.filter(n => !managersNames.includes(n.name) && !leadersNames.includes(n.name) && n.name !== "Vũ Đỗ") }
            ].map((tier) => tier.nodes.length > 0 && (
              <div key={tier.id} className="relative">
                <div className="flex items-center gap-4 mb-6"><div className="h-[1px] flex-grow bg-gradient-to-r from-transparent via-white/10 to-transparent" /><span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 whitespace-nowrap">{tier.label}</span><div className="h-[1px] flex-grow bg-gradient-to-r from-transparent via-white/10 to-transparent" /></div>
                <div className="flex flex-wrap justify-center gap-x-2 gap-y-12">{tier.nodes.map((node, i) => (<div key={node.id} className={i % 2 !== 0 ? 'mt-18' : ''}><HexNode node={node} onClick={setSelectedNode} {...getBeeStyles(node)} /></div>))}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto pb-40 px-10 space-y-32">
            {/* Engineer Team Section */}
            <div className="relative border-l-2 border-indigo-500/20 pl-12">
              <div className="flex items-center gap-6 mb-12">
                <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400 border border-indigo-500/30 font-black text-xs">ENGINEER COMMAND</div>
                <HexNode node={engineerTeam.leader} onClick={setSelectedNode} {...getBeeStyles(engineerTeam.leader)} />
              </div>
              <div className="space-y-16">
                <div>
                  <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-8 ml-2">Slab Engineer</h4>
                  <div className="space-y-12">
                    <div className="flex flex-wrap gap-x-4">
                      {engineerTeam.slab.slice(0, 3).map((node, i) => (<div key={node.id} className={i % 2 !== 0 ? 'mt-12' : ''}><HexNode node={node} onClick={setSelectedNode} {...getBeeStyles(node)} /></div>))}
                    </div>
                    <div className="flex flex-wrap gap-x-4">
                      {engineerTeam.slab.slice(3, 6).map((node, i) => (<div key={node.id} className={i % 2 !== 0 ? 'mt-12' : ''}><HexNode node={node} onClick={setSelectedNode} {...getBeeStyles(node)} /></div>))}
                    </div>
                    <div className="flex flex-wrap gap-x-4">
                      {engineerTeam.slab.slice(6, 8).map((node, i) => (<div key={node.id} className={i % 2 !== 0 ? 'mt-12' : ''}><HexNode node={node} onClick={setSelectedNode} {...getBeeStyles(node)} /></div>))}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-8 ml-2">Lateral Engineer</h4>
                  <div className="flex flex-wrap gap-4">{engineerTeam.lateral.map(node => (<HexNode key={node.id} node={node} onClick={setSelectedNode} {...getBeeStyles(node)} />))}</div>
                </div>
              </div>
            </div>

            {/* Drafter Team Section */}
            <div className="relative border-l-2 border-purple-500/20 pl-12">
              <div className="flex items-center gap-6 mb-12">
                <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-400 border border-purple-500/30 font-black text-xs">DRAFTER COMMAND</div>
                <HexNode node={drafterTeam.leader} onClick={setSelectedNode} {...getBeeStyles(drafterTeam.leader)} />
              </div>
              <div className="space-y-16">
                <div>
                  <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-8 ml-2">Modeling - Arch</h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-12">{drafterTeam.modeling.map((node, i) => (<div key={node.id} className={i % 2 !== 0 ? 'mt-12' : ''}><HexNode node={node} onClick={setSelectedNode} {...getBeeStyles(node)} /></div>))}</div>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-8 ml-2">PT & REO - MTO</h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-12">{drafterTeam.ptreo.map((node, i) => (<div key={node.id} className={i % 2 !== 0 ? 'mt-12' : ''}><HexNode node={node} onClick={setSelectedNode} {...getBeeStyles(node)} /></div>))}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedNode && (
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-xl glass-panel p-6 z-50 flex items-center gap-8 border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)]"><div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center text-white text-2xl font-black">{selectedNode.name.split(' ').map(n => n[0]).join('')}</div><div className="flex-grow"><h3 className="text-xl font-black text-white uppercase italic tracking-tight">{selectedNode.name}</h3><p className="text-xs font-bold text-cyan-400 uppercase tracking-widest mt-1">{selectedNode.position}</p></div><button onClick={() => setSelectedNode(null)} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={20} /></button></motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(editingNode || addingToNode) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setEditingNode(null); setAddingToNode(null); }} className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" />
            <motion.form onSubmit={editingNode ? handleUpdateNode : handleAddNode} initial={{ scale: 0.9, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 40 }} className="relative w-full max-w-md glass-panel p-10 border-white/10 shadow-2xl bg-slate-900/50">
              <div className="flex items-center gap-6 mb-10"><div className="p-4 bg-white/5 rounded-3xl text-white border border-white/10 shadow-xl">{editingNode ? <Edit3 size={28} /> : <UserPlus size={28} />}</div><div><h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">{editingNode ? 'Edit Member' : 'Add Member'}</h2><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Colony Database Update</p></div></div>
              <div className="space-y-8"><div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 ml-1">Identity</label><input name="name" type="text" defaultValue={editingNode?.name || ''} required className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/40 transition-all" /></div><div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 ml-1">Position</label><input name="position" type="text" defaultValue={editingNode?.position || ''} required className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/40 transition-all" /></div><div className="flex gap-4 pt-6"><button type="button" onClick={() => { setEditingNode(null); setAddingToNode(null); }} className="flex-1 py-5 bg-white/5 hover:bg-white/10 text-slate-400 font-black text-[10px] tracking-[0.3em] rounded-2xl border border-white/10 transition-all">CANCEL</button><button type="submit" className="flex-[2] py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] tracking-[0.3em] rounded-2xl transition-all shadow-2xl shadow-indigo-500/40 flex items-center justify-center gap-3"><Save size={16} /> CONFIRM</button></div></div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default OrgChart
