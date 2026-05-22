import React, { useState, useRef, useEffect } from 'react';
import { PageFlip } from 'page-flip';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Users, 
  AlertCircle, 
  Layers,
  Search,
  MousePointer2,
  Workflow as WorkflowIcon,
  HelpCircle,
  Zap,
  ShieldCheck,
  ChevronLeft,
  Crown,
  Sparkles,
  Compass,
  Home,
  BookOpen,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Upload,
  Pencil,
  Save,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import libraryBg from '../assets/library.png';
import { 
  fetchFullLibrary, 
  seedLibraryToSupabase, 
  updateLibrarySpread, 
  createLibrarySpread, 
  deleteAndReorderSpreads 
} from '../services/supabaseService';
import defaultRooms from '../data/defaultLibraryRooms';
import { useAuth } from '../context/AuthContext';

// Icon map: resolve string names from Supabase JSONB → Lucide React components
const iconMap = {
  FileText, Search, MousePointer2, CheckCircle2, Clock,
  Layers, Zap, Compass, Home, ShieldCheck, HelpCircle,
  Crown, Sparkles, BookOpen, Users, AlertCircle, ArrowRight
};
const resolveIcon = (iconName) => iconMap[iconName] || HelpCircle;

// Admin inline editable text field
const EditableField = ({ value, onSave, className, tag = 'span', multiline = false, style }) => {
  const ref = React.useRef(null);
  const [editing, setEditing] = React.useState(false);
  
  const handleBlur = () => {
    setEditing(false);
    const newVal = ref.current?.innerText?.trim();
    if (newVal && newVal !== value) {
      onSave(newVal);
    }
  };

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const stopProp = (e) => {
      e.stopPropagation();
    };

    // Register native listeners directly on the element to stop propagation
    // before the page-flip library's listeners on the parent container run.
    el.addEventListener('mousedown', stopProp);
    el.addEventListener('mouseup', stopProp);
    el.addEventListener('click', stopProp);
    el.addEventListener('touchstart', stopProp);
    el.addEventListener('touchend', stopProp);
    el.addEventListener('pointerdown', stopProp);
    el.addEventListener('pointerup', stopProp);

    return () => {
      el.removeEventListener('mousedown', stopProp);
      el.removeEventListener('mouseup', stopProp);
      el.removeEventListener('click', stopProp);
      el.removeEventListener('touchstart', stopProp);
      el.removeEventListener('touchend', stopProp);
      el.removeEventListener('pointerdown', stopProp);
      el.removeEventListener('pointerup', stopProp);
    };
  }, []);

  const Tag = tag;
  return (
    <Tag
      ref={ref}
      className={`${className} ${editing ? 'outline outline-2 outline-indigo-400 bg-indigo-50/80 rounded px-1' : 'cursor-pointer hover:bg-yellow-100/50 rounded px-0.5 transition-colors'}`}
      style={style}
      contentEditable
      suppressContentEditableWarning
      onFocus={() => setEditing(true)}
      onBlur={handleBlur}
      onKeyDown={(e) => { if (e.key === 'Enter' && !multiline) { e.preventDefault(); ref.current?.blur(); } }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {value}
    </Tag>
  );
};

const Workflows = () => {
  const { isAdmin } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);
  const [currentSpread, setCurrentSpread] = useState(0);
  const [pageDirection, setPageDirection] = useState(1);
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [prevSpread, setPrevSpread] = useState(0);
  const [flipHalf, setFlipHalf] = useState('front');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Supabase data state
  const [libraryData, setLibraryData] = useState(() => {
    // Init from cache for instant display
    try {
      const cached = localStorage.getItem('nmk_library_cache');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    return localStorage.getItem('nmk_library_sync_time') || null;
  });

  const shelfRef = useRef(null);
  const bookRef = useRef(null);
  const pageFlipRef = useRef(null);

  // Derived state from libraryData (declared at the top to avoid TDZ reference errors in hooks/handlers)
  const rooms = {};
  libraryData.forEach(room => {
    const roomKey = room.division.toLowerCase();
    const wfObj = {};
    (room.workflows || []).forEach(wf => {
      wfObj[wf.id] = {
        ...wf,
        icon: resolveIcon(wf.icon || room.icon),
        spreads: wf.spreads || []
      };
    });
    rooms[roomKey] = {
      id: roomKey,
      title: room.title,
      subtitle: room.subtitle || (room.division + ' Division'),
      icon: resolveIcon(room.icon),
      color: room.color || '#10b981',
      desc: room.desc || '',
      workflows: wfObj
    };
  });

  const currentRoomData = rooms[selectedRoom];
  const activeWorkflowsList = currentRoomData ? Object.values(currentRoomData.workflows) : [];
  const selectedWorkflow = currentRoomData?.workflows[selectedWorkflowId];
  const maxSpreads = selectedWorkflow?.spreads?.length || 0;

  // Fetch from Supabase and update cache
  const fetchAndCache = async () => {
    const data = await fetchFullLibrary();
    if (data && data.length > 0) {
      localStorage.setItem('nmk_library_cache', JSON.stringify(data));
      localStorage.setItem('nmk_library_sync_time', new Date().toISOString());
      setLastSyncTime(new Date().toISOString());
    }
    return data;
  };

  // Sync local data → Supabase
  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await seedLibraryToSupabase(defaultRooms, iconMap);
      const data = await fetchAndCache();
      setLibraryData(data);
    } catch (err) {
      console.error('[Sync] Failed:', err);
      alert('Đồng bộ thất bại: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Refresh: re-fetch from Supabase without seeding
  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      const data = await fetchAndCache();
      setLibraryData(data);
    } catch (err) {
      console.error('[Refresh] Failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Admin: save edited spread page content to Supabase
  const handleSaveSpread = async (spreadId, field, pageData) => {
    if (!isAdmin || !spreadId) return;
    try {
      setIsSaving(true);
      await updateLibrarySpread(spreadId, { [field]: pageData });
      // Refresh data from Supabase
      const data = await fetchAndCache();
      setLibraryData(data);
    } catch (err) {
      console.error('[Admin Save] Failed:', err);
      alert('Lưu thất bại: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Admin: add a new spread (left steps page, right steps page)
  const handleAddSpread = async () => {
    if (!isAdmin || !selectedWorkflowId) return;
    try {
      setIsSaving(true);
      
      const newLeftPage = {
        type: "steps",
        title: "NEW PROCESS STEPS",
        steps: [
          {
            step: "STEP 1",
            icon: "FileText",
            descEn: "Enter English description here",
            descVn: "Nhập mô tả tiếng Việt ở đây",
            titleEn: "New Step Title"
          }
        ]
      };
      
      const newRightPage = {
        type: "steps",
        title: "VERIFICATION PROCEDURES",
        steps: [
          {
            step: "STEP 2",
            icon: "CheckCircle2",
            descEn: "Enter English verification here",
            descVn: "Nhập mô tả xác thực ở đây",
            titleEn: "Verification Step"
          }
        ]
      };
      
      const newIndex = maxSpreads;
      await createLibrarySpread(selectedWorkflowId, newIndex, newLeftPage, newRightPage);
      
      // Refresh data
      const data = await fetchAndCache();
      setLibraryData(data);
      
      // Go to the newly created spread
      setCurrentSpread(newIndex);
    } catch (err) {
      console.error('[Add Spread] Failed:', err);
      alert('Thêm trang đôi thất bại: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Admin: delete current spread and reorder
  const handleDeleteSpread = async (spreadId) => {
    if (!isAdmin || !spreadId || !selectedWorkflowId) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa trang đôi này không?')) return;
    
    try {
      setIsSaving(true);
      await deleteAndReorderSpreads(spreadId, selectedWorkflowId);
      
      // Refresh data
      const data = await fetchAndCache();
      setLibraryData(data);
      
      // Adjust current spread index
      if (currentSpread >= maxSpreads - 1) {
        setCurrentSpread(Math.max(0, maxSpreads - 2));
      }
    } catch (err) {
      console.error('[Delete Spread] Failed:', err);
      alert('Xóa trang đôi thất bại: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    let flipTimer = null;
    if (selectedWorkflowId && bookRef.current) {
      // Small delay of 150ms allows the AnimatePresence modal to paint, ensuring proper box measurement
      flipTimer = setTimeout(() => {
        if (pageFlipRef.current) {
          try {
            pageFlipRef.current.destroy();
          } catch (e) {
            console.error(e);
          }
          pageFlipRef.current = null;
        }

        const pageFlip = new PageFlip(bookRef.current, {
          width: 480, // Base page width (single page)
          height: 600, // Base page height
          size: 'stretch',
          minWidth: 320,
          maxWidth: 480,
          minHeight: 400,
          maxHeight: 600,
          drawShadow: true, // Dynamic soft shadow casting!
          maxShadowOpacity: 0.3, // ULTRA SOFT SHADOWS FOR ENHANCED VINTAGE REALISM!
          showCover: false, // Set to false to prevent the library from forcing rigid 'hard' cover rendering
          usePortrait: false, // Forces dual-page spread
          flippingTime: 1200, // Butter-smooth slower organic timing (makes paper feel soft & heavy)
          swipeDistance: 30, // Responsive corner dragging
          clickEventForward: true, // Forward click events to DOM elements inside the pages
          disableFlipByClick: true, // Prevent page flipping when clicking the body of the page (so editing works)
        });

        try {
          pageFlip.loadFromHTML(bookRef.current.querySelectorAll('.page-item'));
          pageFlipRef.current = pageFlip;

          // Restore current page spread upon initialization
          if (currentSpread > 0 && currentSpread < maxSpreads) {
            if (typeof pageFlip.turnToPage === 'function') {
              pageFlip.turnToPage(currentSpread * 2);
            } else if (typeof pageFlip.flip === 'function') {
              pageFlip.flip(currentSpread * 2);
            }
          }

          pageFlip.on('flip', (e) => {
            const spreadIdx = Math.floor(e.data / 2);
            setCurrentSpread(spreadIdx);
          });
        } catch (err) {
          console.error("Failed to load PageFlip:", err);
        }
      }, 150);
    }

    return () => {
      if (flipTimer) clearTimeout(flipTimer);
      if (pageFlipRef.current) {
        try {
          pageFlipRef.current.destroy();
        } catch (e) {
          console.error(e);
        }
        pageFlipRef.current = null;
      }
    };
  }, [selectedWorkflowId, maxSpreads]);

  // Fetch library data from Supabase on mount (cache-first)
  useEffect(() => {
    let cancelled = false;
    const loadLibrary = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const data = await fetchAndCache();
        if (!cancelled) setLibraryData(data);
      } catch (err) {
        console.error('Failed to load library:', err);
        if (!cancelled) setLoadError(err.message);
        // Keep cached data if available
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    loadLibrary();
    return () => { cancelled = true; };
  }, []);

  const handleBookClick = (id) => {
    setPageDirection(1);
    setSelectedWorkflowId(id);
    setCurrentSpread(0);
  };
  const leftThickness = maxSpreads > 1 ? (currentSpread / (maxSpreads - 1)) * 10 + 2 : 2;
  const rightThickness = maxSpreads > 1 ? ((maxSpreads - 1 - currentSpread) / (maxSpreads - 1)) * 10 + 2 : 2;

  const handlePageTurn = (direction) => {
    if (isFlipping) return;
    const next = currentSpread + direction;
    if (next < 0 || next >= maxSpreads) return;

    if (pageFlipRef.current) {
      if (direction === 1) {
        pageFlipRef.current.flipNext();
      } else {
        pageFlipRef.current.flipPrev();
      }
    }

    setPrevSpread(currentSpread);
    setPageDirection(direction);
    setIsFlipping(true);
    setFlipHalf('front');
    setCurrentSpread(next);

    setTimeout(() => {
      setFlipHalf('back');
    }, 475); // Set to back face exactly halfway through 950ms flip

    setTimeout(() => {
      setIsFlipping(false);
    }, 950); // 0.95s flip animation duration
  };

  const renderLeftPageContent = (spreadIndex) => {
    const leftData = selectedWorkflow?.spreads[spreadIndex]?.left;
    if (!leftData) return null;
    return (
      <div className="flex flex-col justify-between h-full">
        {/* Left Page Header */}
        <div className="border-b border-stone-300 pb-2 flex justify-between items-center text-[9px] font-black text-stone-400 tracking-[0.25em] uppercase shrink-0">
          <span>Rincovitch Standard Log</span>
          <span>{selectedWorkflow.title}</span>
        </div>

        {/* Left page content switcher */}
        <div className={`flex-grow flex flex-col ${leftData.type === 'cover' ? 'justify-center' : 'justify-start'} my-3`}>
          {leftData.type === 'cover' && (
            <div className="flex-grow flex flex-col justify-center items-center text-center">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-md border-2 border-dashed relative animate-pulse"
                style={{ 
                  borderColor: leftData.stampColor,
                  backgroundColor: `${leftData.stampColor}08`
                }}
              >
                <img 
                  src={`${import.meta.env.BASE_URL}rincovitch-logo.svg`} 
                  className="w-8 h-8 object-contain select-none" 
                  alt="Rincovitch Logo" 
                />
                <div className="absolute inset-[3px] rounded-full border border-dashed opacity-40" style={{ borderColor: leftData.stampColor }} />
              </div>

              {isEditMode && isAdmin ? (
                <EditableField
                  value={leftData.classification}
                  tag="h3"
                  className="text-[10px] font-black text-stone-400 tracking-[0.3em] uppercase mb-1"
                  onSave={(val) => {
                    const spread = selectedWorkflow.spreads[spreadIndex];
                    const page = { ...spread.left };
                    page.classification = val;
                    handleSaveSpread(spread.spreadId, 'left_page', page);
                  }}
                />
              ) : (
                <h3 className="text-[10px] font-black text-stone-400 tracking-[0.3em] uppercase mb-1">{leftData.classification}</h3>
              )}

              {isEditMode && isAdmin ? (
                <EditableField
                  value={leftData.title}
                  tag="h2"
                  className="text-[28px] font-black text-stone-800 leading-tight uppercase tracking-wide mb-3 font-serif"
                  style={{ fontFamily: 'Georgia, serif' }}
                  onSave={(val) => {
                    const spread = selectedWorkflow.spreads[spreadIndex];
                    const page = { ...spread.left };
                    page.title = val;
                    handleSaveSpread(spread.spreadId, 'left_page', page);
                  }}
                />
              ) : (
                <h2 className="text-[28px] font-black text-stone-800 leading-tight uppercase tracking-wide mb-3 font-serif" style={{ fontFamily: 'Georgia, serif' }}>
                  {leftData.title}
                </h2>
              )}

              <div className="w-12 h-[1.5px] bg-stone-300 my-2" />

              {isEditMode && isAdmin ? (
                <EditableField
                  value={leftData.subtitle}
                  tag="p"
                  multiline
                  className="text-[13px] text-stone-500 font-bold max-w-[260px] leading-relaxed italic block"
                  onSave={(val) => {
                    const spread = selectedWorkflow.spreads[spreadIndex];
                    const page = { ...spread.left };
                    page.subtitle = val;
                    handleSaveSpread(spread.spreadId, 'left_page', page);
                  }}
                />
              ) : (
                <p className="text-[13px] text-stone-500 font-bold max-w-[260px] leading-relaxed italic">
                  {leftData.subtitle}
                </p>
              )}

              {isEditMode && isAdmin ? (
                <EditableField
                  value={leftData.volume}
                  tag="span"
                  className="mt-8 px-3 py-1 bg-stone-200/50 text-stone-600 text-[9px] font-black uppercase rounded tracking-wider border border-stone-300/40 inline-block"
                  onSave={(val) => {
                    const spread = selectedWorkflow.spreads[spreadIndex];
                    const page = { ...spread.left };
                    page.volume = val;
                    handleSaveSpread(spread.spreadId, 'left_page', page);
                  }}
                />
              ) : (
                <span className="mt-8 px-3 py-1 bg-stone-200/50 text-stone-600 text-[9px] font-black uppercase rounded tracking-wider border border-stone-300/40">{leftData.volume}</span>
              )}
            </div>
          )}

          {leftData.type === 'steps' && (
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-stone-400 tracking-[0.25em] uppercase border-b border-stone-200 pb-2">{leftData.title}</h3>
              <div className="space-y-6 max-h-[440px] overflow-y-auto pr-2 custom-scrollbar">
                {leftData.steps.map((step, sIdx) => {
                  const StepIcon = typeof step.icon === 'string' ? resolveIcon(step.icon) : (step.icon || HelpCircle);
                  return (
                  <div key={sIdx} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-md shrink-0"
                        style={{ backgroundColor: selectedWorkflow.color }}
                      >
                        <StepIcon size={16} />
                      </div>
                      <div>
                        <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: selectedWorkflow.color }}>{step.step}</span>
                        {isEditMode && isAdmin ? (
                          <div className="flex items-center gap-2">
                            <EditableField
                              value={step.titleEn}
                              tag="h4"
                              className="text-[13px] font-black text-stone-800 uppercase tracking-tight leading-none mt-0.5"
                              onSave={(val) => {
                                const spread = selectedWorkflow.spreads[spreadIndex];
                                const page = { ...spread.left };
                                page.steps = [...page.steps];
                                page.steps[sIdx] = { ...page.steps[sIdx], titleEn: val };
                                handleSaveSpread(spread.spreadId, 'left_page', page);
                              }}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const spread = selectedWorkflow.spreads[spreadIndex];
                                const page = { ...spread.left };
                                const updatedSteps = page.steps
                                  .filter((_, idx) => idx !== sIdx)
                                  .map((s, idx) => ({
                                    ...s,
                                    step: `STEP ${idx + 1}`
                                  }));
                                page.steps = updatedSteps;
                                handleSaveSpread(spread.spreadId, 'left_page', page);
                              }}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer shrink-0"
                              title="Xóa bước này"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <h4 className="text-[13px] font-black text-stone-800 uppercase tracking-tight leading-none mt-0.5">{step.titleEn}</h4>
                        )}
                      </div>
                    </div>
                    <div className="pl-12 space-y-1.5 border-l-2 border-stone-200 ml-4.5">
                      {isEditMode && isAdmin ? (
                        <>
                          <EditableField
                            value={step.descEn}
                            tag="p"
                            multiline
                            className="text-[11px] text-stone-600 font-bold leading-relaxed"
                            onSave={(val) => {
                              const spread = selectedWorkflow.spreads[spreadIndex];
                              const page = { ...spread.left };
                              page.steps = [...page.steps];
                              page.steps[sIdx] = { ...page.steps[sIdx], descEn: val };
                              handleSaveSpread(spread.spreadId, 'left_page', page);
                            }}
                          />
                          <EditableField
                            value={step.descVn}
                            tag="p"
                            multiline
                            className="text-[11px] text-indigo-900 font-semibold leading-relaxed italic pr-2"
                            onSave={(val) => {
                              const spread = selectedWorkflow.spreads[spreadIndex];
                              const page = { ...spread.left };
                              page.steps = [...page.steps];
                              page.steps[sIdx] = { ...page.steps[sIdx], descVn: val };
                              handleSaveSpread(spread.spreadId, 'left_page', page);
                            }}
                          />
                        </>
                      ) : (
                        <>
                          <p className="text-[11px] text-stone-600 font-bold leading-relaxed">{formatContent(step.descEn, step.highlight)}</p>
                          <p className="text-[11px] text-indigo-900 font-semibold leading-relaxed italic pr-2">{step.descVn}</p>
                        </>
                      )}
                    </div>
                  </div>
                  );
                })}
                {isEditMode && isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const spread = selectedWorkflow.spreads[spreadIndex];
                      const page = { ...spread.left };
                      const newStepNum = (page.steps?.length || 0) + 1;
                      page.steps = [
                        ...(page.steps || []),
                        {
                          step: `STEP ${newStepNum}`,
                          titleEn: "New Step Title",
                          descEn: "English description",
                          descVn: "Mô tả tiếng Việt",
                          icon: "FileText"
                        }
                      ];
                      handleSaveSpread(spread.spreadId, 'left_page', page);
                    }}
                    className="mt-4 w-full py-2.5 border-2 border-dashed border-stone-300 hover:border-indigo-400 hover:bg-indigo-50/20 text-stone-500 hover:text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Plus size={14} /> Thêm Bước (Step)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Left Page Footer */}
        <div className="flex justify-between text-[9px] text-stone-400 font-bold tracking-widest uppercase shrink-0">
          <span>PAGE {spreadIndex * 2 + 1}</span>
          <span>CONFIDENTIAL</span>
        </div>
      </div>
    );
  };

  const renderRightPageContent = (spreadIndex, showControls = false) => {
    const rightData = selectedWorkflow?.spreads[spreadIndex]?.right;
    if (!rightData) return null;
    return (
      <div className="flex flex-col justify-between h-full">
        {/* Right Page Header */}
        <div className="border-b border-stone-300 pb-2 flex justify-between items-center text-[9px] font-black text-stone-400 tracking-[0.25em] uppercase shrink-0">
          <span>Standard Operating Guidelines</span>
          <span>Classified</span>
        </div>

        {/* Right page content switcher */}
        <div className="flex-grow flex flex-col justify-start my-3">
          {rightData.type === 'intro' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h4 className="text-[9px] font-black text-stone-400 tracking-[0.2em] uppercase flex items-center gap-2">
                  <Sparkles size={12} className="text-yellow-600" /> Executive Overview
                </h4>
                {isEditMode && isAdmin ? (
                  <EditableField
                    value={rightData.desc}
                    tag="p"
                    multiline
                    className="text-[13px] text-stone-700 leading-relaxed text-justify first-letter:text-[36px] first-letter:font-black first-letter:text-stone-800 first-letter:mr-2 first-letter:float-left first-letter:leading-[0.8] first-letter:font-serif block"
                    onSave={(val) => {
                      const spread = selectedWorkflow.spreads[spreadIndex];
                      const page = { ...spread.right };
                      page.desc = val;
                      handleSaveSpread(spread.spreadId, 'right_page', page);
                    }}
                  />
                ) : (
                  <p className="text-[13px] text-stone-700 leading-relaxed text-justify first-letter:text-[36px] first-letter:font-black first-letter:text-stone-800 first-letter:mr-2 first-letter:float-left first-letter:leading-[0.8] first-letter:font-serif">
                    {rightData.desc}
                  </p>
                )}
              </div>

              <div className="pt-6 border-t border-stone-200 space-y-4">
                <h5 className="text-[9px] font-black text-stone-400 tracking-[0.2em] uppercase">Volume Index</h5>
                <div className="space-y-2">
                  {(rightData.meta || []).map((m, mIdx) => (
                    <div key={mIdx} className="flex justify-between text-[11px] text-stone-600 border-b border-stone-100 pb-1.5 last:border-0 items-center">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isEditMode && isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const spread = selectedWorkflow.spreads[spreadIndex];
                              const page = { ...spread.right };
                              page.meta = page.meta.filter((_, idx) => idx !== mIdx);
                              handleSaveSpread(spread.spreadId, 'right_page', page);
                            }}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer shrink-0"
                            title="Xóa dòng"
                          >
                            <X size={10} />
                          </button>
                        )}
                        {isEditMode && isAdmin ? (
                          <EditableField
                            value={m.label}
                            tag="span"
                            className="font-bold text-stone-400 uppercase tracking-widest text-[8px]"
                            onSave={(val) => {
                              const spread = selectedWorkflow.spreads[spreadIndex];
                              const page = { ...spread.right };
                              page.meta = [...page.meta];
                              page.meta[mIdx] = { ...page.meta[mIdx], label: val };
                              handleSaveSpread(spread.spreadId, 'right_page', page);
                            }}
                          />
                        ) : (
                          <span className="font-bold text-stone-400 uppercase tracking-widest text-[8px]">{m.label}</span>
                        )}
                      </div>
                      
                      {isEditMode && isAdmin ? (
                        <EditableField
                          value={m.val}
                          tag="span"
                          className="font-black text-stone-800"
                          onSave={(val) => {
                            const spread = selectedWorkflow.spreads[spreadIndex];
                            const page = { ...spread.right };
                            page.meta = [...page.meta];
                            page.meta[mIdx] = { ...page.meta[mIdx], val: val };
                            handleSaveSpread(spread.spreadId, 'right_page', page);
                          }}
                        />
                      ) : (
                        <span className="font-black text-stone-800">{m.val}</span>
                      )}
                    </div>
                  ))}
                  {isEditMode && isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const spread = selectedWorkflow.spreads[spreadIndex];
                        const page = { ...spread.right };
                        page.meta = [...(page.meta || []), { label: "NEW KEY", val: "New Value" }];
                        handleSaveSpread(spread.spreadId, 'right_page', page);
                      }}
                      className="mt-2 text-[9px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={10} /> Thêm dòng index
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {rightData.type === 'steps' && (
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-stone-400 tracking-[0.25em] uppercase border-b border-stone-200 pb-2">{rightData.title}</h3>
              <div className="space-y-6 max-h-[440px] overflow-y-auto pr-2 custom-scrollbar">
                {rightData.steps.map((step, sIdx) => {
                  const StepIcon = typeof step.icon === 'string' ? resolveIcon(step.icon) : (step.icon || HelpCircle);
                  return (
                  <div key={sIdx} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-md shrink-0"
                        style={{ backgroundColor: selectedWorkflow.color }}
                      >
                        <StepIcon size={16} />
                      </div>
                      <div>
                        <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: selectedWorkflow.color }}>{step.step}</span>
                        {isEditMode && isAdmin ? (
                          <div className="flex items-center gap-2">
                            <EditableField
                              value={step.titleEn}
                              tag="h4"
                              className="text-[13px] font-black text-stone-800 uppercase tracking-tight leading-none mt-0.5"
                              onSave={(val) => {
                                const spread = selectedWorkflow.spreads[spreadIndex];
                                const page = { ...spread.right };
                                page.steps = [...page.steps];
                                page.steps[sIdx] = { ...page.steps[sIdx], titleEn: val };
                                handleSaveSpread(spread.spreadId, 'right_page', page);
                              }}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const spread = selectedWorkflow.spreads[spreadIndex];
                                const page = { ...spread.right };
                                const updatedSteps = page.steps
                                  .filter((_, idx) => idx !== sIdx)
                                  .map((s, idx) => ({
                                    ...s,
                                    step: `STEP ${idx + 1}`
                                  }));
                                page.steps = updatedSteps;
                                handleSaveSpread(spread.spreadId, 'right_page', page);
                              }}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer shrink-0"
                              title="Xóa bước này"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <h4 className="text-[13px] font-black text-stone-800 uppercase tracking-tight leading-none mt-0.5">{step.titleEn}</h4>
                        )}
                      </div>
                    </div>
                    <div className="pl-12 space-y-1.5 border-l-2 border-stone-200 ml-4.5">
                      {isEditMode && isAdmin ? (
                        <>
                          <EditableField
                            value={step.descEn}
                            tag="p"
                            multiline
                            className="text-[11px] text-stone-600 font-bold leading-relaxed"
                            onSave={(val) => {
                              const spread = selectedWorkflow.spreads[spreadIndex];
                              const page = { ...spread.right };
                              page.steps = [...page.steps];
                              page.steps[sIdx] = { ...page.steps[sIdx], descEn: val };
                              handleSaveSpread(spread.spreadId, 'right_page', page);
                            }}
                          />
                          <EditableField
                            value={step.descVn}
                            tag="p"
                            multiline
                            className="text-[11px] text-indigo-900 font-semibold leading-relaxed italic pr-2"
                            onSave={(val) => {
                              const spread = selectedWorkflow.spreads[spreadIndex];
                              const page = { ...spread.right };
                              page.steps = [...page.steps];
                              page.steps[sIdx] = { ...page.steps[sIdx], descVn: val };
                              handleSaveSpread(spread.spreadId, 'right_page', page);
                            }}
                          />
                        </>
                      ) : (
                        <>
                          <p className="text-[11px] text-stone-600 font-bold leading-relaxed">{formatContent(step.descEn, step.highlight)}</p>
                          <p className="text-[11px] text-indigo-900 font-semibold leading-relaxed italic pr-2">{step.descVn}</p>
                        </>
                      )}
                    </div>
                  </div>
                  );
                })}
                {isEditMode && isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const spread = selectedWorkflow.spreads[spreadIndex];
                      const page = { ...spread.right };
                      const newStepNum = (page.steps?.length || 0) + 1;
                      page.steps = [
                        ...(page.steps || []),
                        {
                          step: `STEP ${newStepNum}`,
                          titleEn: "New Step Title",
                          descEn: "English description",
                          descVn: "Mô tả tiếng Việt",
                          icon: "FileText"
                        }
                      ];
                      handleSaveSpread(spread.spreadId, 'right_page', page);
                    }}
                    className="mt-4 w-full py-2.5 border-2 border-dashed border-stone-300 hover:border-indigo-400 hover:bg-indigo-50/20 text-stone-500 hover:text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Plus size={14} /> Thêm Bước (Step)
                  </button>
                )}
              </div>
            </div>
          )}

          {rightData.type === 'signoff' && (
            <div className="space-y-6">
              <div className="space-y-3">
                {isEditMode && isAdmin ? (
                  <EditableField
                    value={rightData.title}
                    tag="h4"
                    className="text-[9px] font-black text-stone-400 tracking-[0.2em] uppercase block"
                    onSave={(val) => {
                      const spread = selectedWorkflow.spreads[spreadIndex];
                      const page = { ...spread.right };
                      page.title = val;
                      handleSaveSpread(spread.spreadId, 'right_page', page);
                    }}
                  />
                ) : (
                  <h4 className="text-[9px] font-black text-stone-400 tracking-[0.2em] uppercase">{rightData.title}</h4>
                )}
                <div className="grid grid-cols-1 gap-2">
                  {rightData.checklist.map((c, cIdx) => (
                    <div key={cIdx} className="flex items-center justify-between gap-2.5 p-2 bg-stone-100/50 rounded border border-stone-200/40">
                      <div className="flex items-center gap-2.5 flex-grow min-w-0">
                        <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                        {isEditMode && isAdmin ? (
                          <EditableField
                            value={c}
                            tag="span"
                            className="text-[10px] font-bold text-stone-700 leading-tight block w-full"
                            onSave={(val) => {
                              const spread = selectedWorkflow.spreads[spreadIndex];
                              const page = { ...spread.right };
                              page.checklist = [...page.checklist];
                              page.checklist[cIdx] = val;
                              handleSaveSpread(spread.spreadId, 'right_page', page);
                            }}
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-stone-700 leading-tight">{c}</span>
                        )}
                      </div>
                      {isEditMode && isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const spread = selectedWorkflow.spreads[spreadIndex];
                            const page = { ...spread.right };
                            page.checklist = page.checklist.filter((_, idx) => idx !== cIdx);
                            handleSaveSpread(spread.spreadId, 'right_page', page);
                          }}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer shrink-0"
                          title="Xóa mục"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {isEditMode && isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const spread = selectedWorkflow.spreads[spreadIndex];
                      const page = { ...spread.right };
                      page.checklist = [...(page.checklist || []), "New verification task"];
                      handleSaveSpread(spread.spreadId, 'right_page', page);
                    }}
                    className="mt-2 text-[9px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={10} /> Thêm checklist item
                  </button>
                )}
              </div>

              <div className="pt-4 border-t border-stone-200">
                <span className="text-[8px] font-bold text-stone-400 uppercase tracking-widest leading-none mb-1 block">Authoritative Note</span>
                {isEditMode && isAdmin ? (
                  <EditableField
                    value={rightData.notes}
                    tag="p"
                    multiline
                    className="text-[11px] font-medium text-stone-600 italic leading-relaxed bg-amber-500/5 p-3 border-l-2 border-amber-500/50 rounded-r block"
                    onSave={(val) => {
                      const spread = selectedWorkflow.spreads[spreadIndex];
                      const page = { ...spread.right };
                      page.notes = val;
                      handleSaveSpread(spread.spreadId, 'right_page', page);
                    }}
                  />
                ) : (
                  <p className="text-[11px] font-medium text-stone-600 italic leading-relaxed bg-amber-500/5 p-3 border-l-2 border-amber-500/50 rounded-r">{rightData.notes}</p>
                )}
              </div>

              <div className="pt-3 border-t border-dashed border-stone-300 flex justify-between items-end">
                <div>
                  <p className="text-[8px] text-stone-400 font-bold uppercase tracking-wider leading-none mb-1">Standardized by</p>
                  <p className="text-[12px] text-stone-700 italic font-serif leading-none" style={{ fontFamily: 'Georgia, serif' }}>Rincovitch Engineering</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] text-stone-400 font-bold uppercase tracking-wider leading-none mb-1">Status</p>
                  <p className="text-[8px] font-black text-emerald-700 tracking-widest uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 leading-none">VERIFIED</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Page Footer */}
        <div className="flex justify-between items-center text-[9px] text-stone-400 font-bold tracking-widest uppercase shrink-0">
          <span>PAGE {spreadIndex * 2 + 2}</span>
          
          {showControls && (
            <>
              {/* Page turning brass-styled control arrows */}
              <div className="flex items-center gap-2">
                <button
                  disabled={currentSpread === 0 || isFlipping}
                  onClick={(e) => { e.stopPropagation(); handlePageTurn(-1); }}
                  className={`p-2.5 rounded-full transition-all border shadow-[0_4px_10px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.4)] lib-book-nav-btn ${currentSpread === 0 ? 'opacity-35 cursor-not-allowed' : 'active:scale-90 active:shadow-inner cursor-pointer'}`}
                  title="Turn Back"
                >
                  <ChevronLeft size={15} className="stroke-[2.5]" />
                </button>
                
                <button
                  disabled={currentSpread === maxSpreads - 1 || isFlipping}
                  onClick={(e) => { e.stopPropagation(); handlePageTurn(1); }}
                  className={`p-2.5 rounded-full transition-all border shadow-[0_4px_10px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.4)] lib-book-nav-btn ${currentSpread === maxSpreads - 1 || isFlipping ? 'opacity-35 cursor-not-allowed' : 'active:scale-90 active:shadow-inner cursor-pointer'}`}
                  title="Turn Page"
                >
                  <ChevronRight size={15} className="stroke-[2.5]" />
                </button>
 
                <div className="h-6 w-px bg-stone-300 mx-2" />
 
                <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedWorkflowId(null); }}
                  className="px-5 py-2.5 rounded-md text-[12px] font-black uppercase tracking-widest transition-all shadow active:translate-y-0.5 cursor-pointer lib-book-close-btn"
                >
                  Close Volume
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };


  const scrollShelf = (direction) => {
    if (shelfRef.current) {
      const scrollAmount = 300;
      shelfRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const formatContent = (text, highlight) => {
    if (!text || !highlight) return text;
    const parts = text.split(highlight);
    return parts.map((part, i) => (
      <React.Fragment key={i}>
        {part}
        {i < parts.length - 1 && (
          <span className="text-[var(--text-main)] font-black border-b-2 border-indigo-500/30 pb-0.5 bg-indigo-500/5 px-1.5 rounded">{highlight}</span>
        )}
      </React.Fragment>
    ));
  };

  return (
    <div 
      className="tab-library w-full mx-auto pb-12 relative min-h-screen rounded-2xl overflow-hidden"
      style={{
        backgroundImage: `url(${libraryBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'local'
      }}
    >
      <div className="p-0 max-w-full mx-auto relative min-h-screen">
        <AnimatePresence mode="wait">
          {!selectedRoom ? (
            /* ROOM SELECTION SCREEN */
            <>
              {/* Admin-only: Sync & Refresh controls (fixed positioning to escape overflow-hidden) */}
              {isAdmin && (
              <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-2">
                {lastSyncTime && (
                  <span className="text-[9px] font-bold text-slate-500/70 tracking-wider">
                    Synced: {new Date(lastSyncTime).toLocaleString('vi-VN')}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-xl border border-white/10 flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
                    title="Refresh từ Supabase"
                  >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="h-10 px-4 rounded-full bg-indigo-600/80 backdrop-blur-xl border border-indigo-400/20 flex items-center gap-2 text-white text-[11px] font-black uppercase tracking-wider hover:bg-indigo-500 transition-all cursor-pointer disabled:opacity-50"
                    title="Đồng bộ data local lên Supabase"
                  >
                    {isSyncing ? (
                      <><Loader2 size={14} className="animate-spin" /> Đang đồng bộ...</>
                    ) : (
                      <><Upload size={14} /> Đồng bộ</>
                    )}
                  </motion.button>
                </div>
              </div>
              )}

              {/* Room icons sidebar — or empty state */}
              {Object.keys(rooms).length === 0 ? (
                /* EMPTY STATE */
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center z-20"
                >
                  <BookOpen size={48} className="text-slate-500/50 mb-4" />
                  <p className="text-[14px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Library trống</p>
                  <p className="text-[11px] text-slate-500 mb-6">Chưa có data trên Supabase. Bấm đồng bộ để đẩy data lên.</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-[13px] font-black uppercase tracking-wider hover:bg-indigo-500 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-3"
                  >
                    {isSyncing ? (
                      <><Loader2 size={18} className="animate-spin" /> Đang đồng bộ...</>
                    ) : (
                      <><Upload size={18} /> Đồng bộ lên Supabase</>
                    )}
                  </motion.button>
                </motion.div>
              ) : (
              <motion.div
                key="room-selection"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute right-0 top-0 bottom-0 w-28 flex flex-col items-center justify-center gap-10 z-20 py-8"
                style={{ height: '100vh' }}
              >
              {Object.values(rooms).map((r) => {
                const IconComponent = r.icon;
                const isHovered = hoveredRoom === r.id;
                
                return (
                  <div key={r.id} className="relative flex items-center justify-center">
                    {/* Hover text label sliding out to the left */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                          className="absolute right-[115%] px-8 py-4 bg-slate-950/95 backdrop-blur-2xl border rounded-lg font-black text-[12px] tracking-[0.2em] whitespace-nowrap shadow-2xl flex items-center justify-center z-30"
                          style={{ borderColor: r.color }}
                        >
                          <span style={{ color: r.color }} className="uppercase text-[17px] font-black tracking-wider">{r.title}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Circular Icon button */}
                    <motion.div
                      onMouseEnter={() => setHoveredRoom(r.id)}
                      onMouseLeave={() => setHoveredRoom(null)}
                      onClick={() => {
                        setSelectedRoom(r.id);
                        setHoveredRoom(null);
                      }}
                      whileHover={{ 
                        scale: 1.15,
                        boxShadow: `0 0 25px ${r.color}60`,
                        borderColor: r.color,
                      }}
                      className="w-16 h-16 rounded-full flex items-center justify-center border border-white/10 bg-slate-950/70 backdrop-blur-xl cursor-pointer transition-all duration-300 relative group"
                      style={{
                        boxShadow: isHovered ? `0 0 35px ${r.color}70` : '0 8px 24px rgba(0,0,0,0.5)',
                        borderColor: isHovered ? r.color : 'rgba(255,255,255,0.1)'
                      }}
                    >
                      {/* Subtle backglow matching room color */}
                      <div 
                        className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 blur-md transition-opacity duration-300 pointer-events-none"
                        style={{ backgroundColor: r.color }}
                      />

                      <IconComponent 
                        size={24} 
                        className="transition-colors duration-300"
                        style={{ color: isHovered ? '#ffffff' : r.color }}
                      />
                    </motion.div>
                  </div>
                );
              })}
            </motion.div>
              )}
            </>
          ) : (
            /* ACTIVE DIVISION SHELF SCREEN */
            <motion.div
              key="division-shelf"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 p-6 md:p-10 max-w-7xl mx-auto"
            >
              {/* Division Title Banner */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 backdrop-blur-md rounded-2xl border shadow-md lib-division-banner">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: `${currentRoomData.color}20`, color: currentRoomData.color }}
                  >
                    {React.createElement(currentRoomData.icon, { size: 22 })}
                  </div>
                  <div>
                    <h2 className="text-[24px] font-black uppercase tracking-tight leading-none lib-division-banner-title">{currentRoomData.title}</h2>
                    <p className="text-[9px] font-bold uppercase tracking-widest mt-1 lib-division-banner-subtitle">{currentRoomData.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3 md:mt-0">
                  <div className="px-5 py-3 rounded-lg border text-[11px] font-black tracking-wider uppercase flex items-center justify-center lib-division-btn" style={{ pointerEvents: 'none' }}>
                    Division Active
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    onClick={() => { setSelectedRoom(null); setSelectedWorkflowId(null); }}
                    className="flex items-center gap-2.5 px-6 py-3 text-[13px] font-black uppercase tracking-widest rounded-lg border transition-colors shadow-md cursor-pointer lib-division-btn"
                  >
                    <ArrowLeft size={16} /> Back to Divisions
                  </motion.button>
                </div>
              </div>

              {/* Bookshelf block */}
              <div className="rounded-2xl p-10 min-h-[520px] flex flex-col justify-end shadow-2xl relative group/shelf lib-shelf-container border">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent pointer-events-none rounded-2xl" />

                {/* Left/Right scroll controls */}
                {activeWorkflowsList.length > 5 && (
                  <>
                    <button
                      onClick={() => scrollShelf('left')}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border shadow-lg flex items-center justify-center z-30 transition-all active:scale-95 group/btn lib-scroll-btn"
                      title="Scroll Left"
                    >
                      <ArrowRight size={18} className="rotate-180 group-hover/btn:-translate-x-0.5 transition-transform" />
                    </button>

                    <button
                      onClick={() => scrollShelf('right')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border shadow-lg flex items-center justify-center z-30 transition-all active:scale-95 group/btn lib-scroll-btn"
                      title="Scroll Right"
                    >
                      <ArrowRight size={18} className="group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                  </>
                )}

                {/* Books container */}
                <div 
                  ref={shelfRef}
                  className="w-full overflow-x-auto flex items-end justify-center gap-12 relative z-10 px-10 py-6 min-h-[380px] scroll-smooth rounded-2xl"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {activeWorkflowsList.map((wf, idx) => {
                    const bookWidth = [60, 68, 62, 65][idx % 4];
                    const bookHeight = [300, 315, 290, 310][idx % 4];
                    
                    return (
                      <motion.div
                        key={wf.id}
                        initial={{ y: 60, opacity: 0 }}
                        animate={{ 
                          y: [0, -3, 0], 
                          opacity: 1,
                          rotateZ: idx % 2 === 0 ? [-3, -1, -3] : [2, 4, 2]
                        }}
                        transition={{
                          y: { duration: 3.5 + (idx * 0.4), repeat: Infinity, ease: "easeInOut" },
                          rotateZ: { duration: 4.5 + (idx * 0.3), repeat: Infinity, ease: "easeInOut" }
                        }}
                        whileHover={{ 
                          y: -30, 
                          rotateZ: 0, 
                          scale: 1.05,
                          zIndex: 50,
                          transition: { type: "spring", stiffness: 350 }
                        }}
                        onClick={() => handleBookClick(wf.id)}
                        className="relative group/book cursor-pointer shrink-0 transition-all duration-300"
                        style={{
                          width: `${bookWidth}px`,
                          height: `${bookHeight}px`,
                          backgroundColor: wf.color,
                          backgroundImage: `
                            repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.04) 0px, rgba(255, 255, 255, 0.04) 1px, transparent 1px, transparent 4px),
                            linear-gradient(to right, 
                              rgba(0,0,0,0.55) 0%, 
                              rgba(255,255,255,0.2) 10%, 
                              rgba(255,255,255,0.28) 18%, 
                              transparent 35%, 
                              rgba(0,0,0,0.15) 85%, 
                              rgba(0,0,0,0.6) 100%)
                          `,
                          boxShadow: 'inset -2px 0 6px rgba(0,0,0,0.5), inset 2px 0 6px rgba(255,255,255,0.3), 8px 4px 18px rgba(0,0,0,0.45)',
                          borderRadius: '4px 6px 6px 4px',
                          border: '1px solid rgba(0,0,0,0.2)',
                        }}
                      >
                        {/* Trim */}
                        <div className="absolute top-0 left-0 w-full h-[8px] bg-slate-950/60 border-b border-white/10 z-10" />

                        {/* Gold Foil Accent Labels */}
                        <div className="absolute top-[8%] left-0 w-full h-[3px] bg-gradient-to-r from-amber-600 via-yellow-300 to-amber-600 opacity-90 shadow-[0_1px_2px_rgba(0,0,0,0.3)] z-10" />
                        <div className="absolute top-[11%] left-0 w-full h-[1px] bg-black/40 z-10" />
                        
                        <div className="absolute bottom-[20%] left-0 w-full h-[3px] bg-gradient-to-r from-amber-600 via-yellow-300 to-amber-600 opacity-90 shadow-[0_1px_2px_rgba(0,0,0,0.3)] z-10" />
                        <div className="absolute bottom-[23%] left-0 w-full h-[1px] bg-black/40 z-10" />

                        {/* Embossed Spines */}
                        <div className="absolute top-[28%] left-0 w-full h-[5px] bg-black/40 border-t border-white/15 border-b border-black/60 z-10" />
                        <div className="absolute bottom-[32%] left-0 w-full h-[5px] bg-black/40 border-t border-white/15 border-b border-black/60 z-10" />

                        {/* Ribbon Bookmark */}
                        {idx % 2 === 0 && (
                          <div 
                            className="absolute bottom-[-22px] left-[35%] w-[8px] h-[26px] rounded-b-[2px] z-[-1] shadow-[2px_3px_5px_rgba(0,0,0,0.45)] transition-transform duration-300 group-hover/book:translate-y-1.5"
                            style={{
                              backgroundColor: idx === 0 ? '#ef4444' : '#f59e0b',
                              transform: 'rotate(-4deg)'
                            }}
                          />
                        )}

                        <div className="absolute inset-0 flex flex-col items-center py-12 px-1 z-20">
                          <div className="text-[8px] font-black text-white/50 tracking-widest uppercase mb-8 leading-none select-none">
                            {(wf.title || '').substring(0, 4).toUpperCase()}
                          </div>

                          <div className="flex-1 flex items-center justify-center overflow-hidden w-full px-0.5">
                            <span 
                              className="text-[10px] font-black text-white/95 uppercase whitespace-nowrap rotate-90 tracking-[0.25em] origin-center select-none"
                              style={{
                                fontFamily: idx % 2 === 0 ? 'Georgia, serif' : 'system-ui, sans-serif',
                                fontStyle: idx % 2 === 0 ? 'italic' : 'normal',
                                textShadow: '1px 1px 1px rgba(255,255,255,0.1), -1px -1px 1px rgba(0,0,0,0.7)'
                              }}
                            >
                              {wf.title}
                            </span>
                          </div>

                          <div className="mt-auto flex flex-col items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-950/70 border border-white/15 shadow-inner flex items-center justify-center text-white/80 group-hover/book:border-indigo-400/40">
                              {React.createElement(wf.icon, { size: 14 })}
                            </div>
                            <div className="w-12 h-1 bg-white/10 rounded-full" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Mahogany bookend */}
                  <div 
                    className="w-[26px] shrink-0 self-end mr-6 relative z-10 transition-transform duration-300 hover:scale-105"
                    style={{
                      height: '230px',
                      background: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)',
                      boxShadow: 'inset 2px 2px 5px rgba(255,255,255,0.25), 4px 4px 12px rgba(0,0,0,0.45)',
                      borderRadius: '0 16px 4px 0',
                      borderLeft: `4px solid ${currentRoomData.color}`,
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center rotate-90 pointer-events-none">
                      <span className="text-[9px] font-black uppercase tracking-[0.40em] whitespace-nowrap" style={{ color: currentRoomData.color }}>VAULT</span>
                    </div>
                  </div>
                </div>

                {/* Wooden shelf structure */}
                <div className="w-full h-8 bg-gradient-to-b from-[#451a03] to-[#1c1917] rounded-md shadow-2xl mt-[-4px] relative z-[5] border-t-2 border-[#78350f] border-b border-black/40" />

                {/* Caption overlay */}
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-10 py-2 bg-indigo-500/10 backdrop-blur-md rounded-full border border-indigo-500/20 opacity-0 group-hover/shelf:opacity-100 transition-all duration-700 pointer-events-none">
                  <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.5em]">{currentRoomData.title} Vault Active</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3D Multi-Page Flip Book Modal */}
      <AnimatePresence>
         {selectedWorkflowId && selectedWorkflow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 md:p-12 overflow-y-auto" style={{ perspective: 1500 }}>
            {/* Dark background overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSelectedWorkflowId(null); setIsEditMode(false); }}
              className="absolute inset-0 backdrop-blur-2xl z-10 lib-book-overlay"
            />
            
            {/* Hardcover Outer wrap */}
            <motion.div
              initial={{ rotateY: 20, scale: 0.85, opacity: 0 }}
              animate={{ rotateY: 0, scale: 1, opacity: 1 }}
              exit={{ rotateY: -20, scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 180, damping: 22 }}
              className="relative w-full max-w-5xl rounded-[12px] sys-p flex flex-col z-20 transition-all"
              style={{
                backgroundColor: selectedWorkflow.color,
                backgroundImage: `
                  linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.25)),
                  radial-gradient(circle at 50% 50%, transparent 10%, rgba(0,0,0,0.35) 100%),
                  repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 3px),
                  repeating-linear-gradient(-45deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 3px)
                `,
                boxShadow: `
                  0 35px 70px -15px rgba(0,0,0,0.85),
                  inset 0 1px 2px rgba(255,255,255,0.25),
                  inset 0 -1px 2px rgba(0,0,0,0.5),
                  0 0 0 4px ${selectedWorkflow.color},
                  0 8px 0 #d9d2c5,
                  0 9px 0 rgba(0,0,0,0.4),
                  0 25px 35px rgba(0,0,0,0.6)
                `
              }}
            >
              {/* Floating Buttons above the Book cover (escapes TopBar overlay) */}
              <div className="absolute -top-16 right-0 z-50 flex items-center gap-3">
                {isAdmin && isEditMode && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleAddSpread}
                      className="h-11 px-4 rounded-full border-2 flex items-center gap-2 text-[12px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xl lib-book-btn-primary"
                      title="Thêm trang đôi mới"
                    >
                      <Plus size={16} /> Thêm Trang
                    </motion.button>

                    {maxSpreads > 1 && currentSpread > 0 && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const currentSpreadObj = selectedWorkflow?.spreads[currentSpread];
                          if (currentSpreadObj) {
                            handleDeleteSpread(currentSpreadObj.spreadId);
                          }
                        }}
                        className="h-11 px-4 rounded-full border-2 flex items-center gap-2 text-[12px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xl lib-book-btn-danger"
                        title="Xóa trang đôi hiện tại"
                      >
                        <Trash2 size={16} /> Xóa Trang
                      </motion.button>
                    )}
                  </>
                )}
                {isAdmin && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`w-11 h-11 rounded-full backdrop-blur-xl border-2 flex items-center justify-center transition-all cursor-pointer shadow-xl lib-book-btn-edit ${
                      isEditMode ? 'active' : ''
                    }`}
                    title={isEditMode ? 'Tắt chỉnh sửa' : 'Bật chỉnh sửa (Admin)'}
                  >
                    <Pencil size={18} />
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setSelectedWorkflowId(null); setIsEditMode(false); }}
                  className="w-11 h-11 rounded-full backdrop-blur-xl border-2 flex items-center justify-center transition-all cursor-pointer shadow-xl lib-book-btn-close"
                  title="Đóng sách"
                >
                  <ArrowLeft size={18} />
                </motion.button>
              </div>

              {/* Edit mode indicator floating above book cover */}
              {isEditMode && isAdmin && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 bg-indigo-600 backdrop-blur-xl rounded-full flex items-center gap-2 shadow-2xl border border-indigo-400/30"
                >
                  <Pencil size={14} className="text-indigo-200" />
                  <span className="text-[11px] font-black text-white uppercase tracking-wider">Edit Mode</span>
                  {isSaving && <Loader2 size={14} className="text-white animate-spin" />}
                </motion.div>
              )}

              {/* Inner hardcover soft shadow */}
              <div className="absolute inset-[10px] rounded-[6px] bg-slate-900/10 pointer-events-none z-10" />
              
              {/* Embossed Luxury Gold Foil Cover Borders */}
              <div className="absolute inset-[14px] border border-yellow-500/20 rounded-[8px] pointer-events-none z-10" />
              <div className="absolute inset-y-[14px] left-[28px] w-[1px] bg-yellow-500/15 pointer-events-none z-10 hidden md:block" />
              <div className="absolute inset-y-[14px] right-[28px] w-[1px] bg-yellow-500/15 pointer-events-none z-10 hidden md:block" />

              {/* DYNAMIC PAGE EDGES STACKING (Book thickness) */}
              <div 
                className="book-page-edges-left hidden md:block" 
                style={{ 
                  width: `${leftThickness}px`, 
                  left: `-${leftThickness - 10}px`,
                  transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' 
                }} 
              />
              <div 
                className="book-page-edges-right hidden md:block" 
                style={{ 
                  width: `${rightThickness}px`, 
                  right: `-${rightThickness - 10}px`,
                  transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' 
                }} 
              />

              {/* Realistic Paper spreads wrapper */}
              <div className="relative rounded-[6px] min-h-[580px] md:h-[600px] shadow-[inset_0_0_40px_rgba(0,0,0,0.08)] border z-20 flex justify-center items-center lib-paper">
                
                {/* Vintage Left/Right paper page creases & gradients (overlay decoration) */}
                <div className="absolute inset-y-0 left-0 w-[15px] bg-gradient-to-r from-black/[0.03] to-transparent pointer-events-none z-[1]" />
                <div className="absolute inset-y-0 right-1/2 w-[40px] bg-gradient-to-r from-transparent via-black/[0.005] to-black/[0.06] pointer-events-none z-[1] hidden md:block" />
                
                <div className="absolute inset-y-0 left-1/2 w-[40px] bg-gradient-to-l from-transparent via-black/[0.005] to-black/[0.06] pointer-events-none z-[1] hidden md:block" />
                <div className="absolute inset-y-0 right-0 w-[15px] bg-gradient-to-l from-black/[0.03] to-transparent pointer-events-none z-[1]" />

                {/* Book Spine Crease Line & Deep Cleft Shadow */}
                <div className="absolute top-0 bottom-0 left-1/2 w-[1px] -translate-x-1/2 bg-black/10 z-[1] pointer-events-none hidden md:block" />
                <div className="absolute top-0 bottom-0 left-1/2 w-[12px] -translate-x-1/2 bg-gradient-to-r from-black/[0.06] via-transparent to-black/[0.06] z-[1] pointer-events-none hidden md:block" />
                <div className="absolute top-0 bottom-0 left-1/2 w-[28px] -translate-x-1/2 bg-gradient-to-r from-black/[0.04] via-transparent to-black/[0.04] z-[1] pointer-events-none hidden md:block" />

                {/* ST PAGE FLIP CONTAINER - REBUILD FROM SCRATCH FOR ULTIMATE REALISM */}
                <div ref={bookRef} className="page-flip-book">
                  {selectedWorkflow.spreads.flatMap((spread, spreadIdx) => [
                    // LEFT PAGE
                    <div key={`page-${spreadIdx}-left`} className="page-item" data-density="soft">
                      <div className="book-page-left h-full border-r border-stone-200/70 relative">
                        {renderLeftPageContent(spreadIdx)}
                      </div>
                    </div>,
                    
                    // RIGHT PAGE
                    <div key={`page-${spreadIdx}-right`} className="page-item" data-density="soft">
                      <div className="book-page-right h-full relative">
                        {renderRightPageContent(spreadIdx, false)}
                      </div>
                    </div>
                  ])}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Workflows;
