import React, { useState } from 'react';
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
  ShieldCheck
} from 'lucide-react';

const Workflows = () => {
  const [activeWorkflow, setActiveWorkflow] = useState('general');
  const [activeStep, setActiveStep] = useState(0);

  const workflows = {
    general: {
      id: 'general',
      title: 'General Workflow',
      subtitle: 'App Work Sheet (Quy trình chung)',
      icon: WorkflowIcon,
      color: 'indigo',
      type: 'flow',
      steps: [
        { id: 'accept', label: 'ACCEPT TASK', desc: 'Manager assigns task, team member accepts.' },
        { id: 'start', label: 'START', desc: 'Official start of production work.' },
        { id: 'complete', label: 'COMPLETE', desc: 'Work is finished and ready for initial review.' },
        { id: 'recheck', label: 'RECHECK', desc: 'Internal self-review or peer correction loop.' },
        { id: 'checked', label: 'CHECKED', desc: 'Final approval from Manager/Leader.' }
      ],
      flow: [
        { from: 'accept', to: 'start' },
        { from: 'start', to: 'complete' },
        { from: 'complete', to: 'checked' },
        { from: 'complete', to: 'recheck', curved: true },
        { from: 'recheck', to: 'complete', curved: true },
        { from: 'recheck', to: 'checked' }
      ]
    },
    str_modeling: {
      id: 'str_modeling',
      title: 'STR Modeling',
      subtitle: 'QA Check Process (Quy trình QA)',
      icon: Layers,
      color: 'emerald',
      type: 'detailed',
      steps: [
        {
          step: 'STEP 1',
          titleEn: 'RECEIVE MARKUP & FILE SETUP',
          titleVn: 'NHẬN MARKUP & TẠO FILE',
          descEn: 'When you receive the markup from the Manager/Leader, create a new file with your name added. EX: MARKUP-LOADING PLAN -> MARKUP-LOADING PLAN_NHAN',
          descVn: 'Khi bạn nhận được markup từ Manager/Leader, tạo 1 file mới có tên của mình. EX: MARKUP-LOADING PLAN => MARKUP-LOADING PLAN_NHÂN',
          highlight: 'NHAN',
          icon: FileText
        },
        {
          step: 'STEP 2',
          titleEn: 'HIGHLIGHT COMPLETED AREAS',
          titleVn: 'TÔ MÀU VỊ TRÍ HOÀN THÀNH',
          descEn: 'HIGHLIGHT the areas on the markup that you have completed.',
          descVn: 'TÔ MÀU lên những vị trí markup đã hoàn thành xong vào bản markup đó.',
          highlight: 'HIGHLIGHT',
          icon: Search
        },
        {
          step: 'STEP 3',
          titleEn: 'PRINT & SECOND HIGHLIGHT',
          titleVn: 'IN RA VÀ TÔ MÀU LẦN 2',
          descEn: 'After finishing, print out the drawing and HIGHLIGHT again on the markup drawing.',
          descVn: 'Sau khi hoàn thành thì in ra và TÔ MÀU 1 lần nữa lên bản đã markup.',
          highlight: 'HIGHLIGHT AGAIN',
          icon: MousePointer2
        },
        {
          step: 'STEP 4',
          titleEn: 'CROSS-CHECK & STAMPING',
          titleVn: 'CHECK CHÉO & ĐÓNG DẤU',
          descEn: 'Cross-check (This step can be skipped if not applicable). The checker must add a STAMP and save the file with their name. EX: MARKUP-LOADING PLAN_Checked By NN',
          descVn: 'Check chéo [Bước này có hoặc không cũng được]. Người check nhớ ĐÓNG STAMP và lưu lại theo lại bản markup theo tên. EX: MARKUP-LOADING PLAN_Checked By NN',
          highlight: 'STAMP',
          icon: CheckCircle2
        },
        {
          step: 'STEP 5',
          titleEn: 'FINAL MANAGER REVIEW',
          titleVn: 'LEADER CHECK LẦN CUỐI',
          descEn: 'Manager/Leader performs the final check before issuing the drawing.',
          descVn: 'Manager/Leader check lần cuối trước khi issue bản vẽ và gửi đi.',
          highlight: 'FINAL CHECK',
          icon: Clock
        }
      ]
    },
    issues: {
      id: 'issues',
      title: 'Issue Process',
      subtitle: 'Problem Resolution Flow (Quy trình xử lý vấn đề)',
      icon: AlertCircle,
      color: 'rose',
      type: 'detailed',
      steps: [
        {
          step: 'PHASE 1',
          titleEn: 'IDENTIFY & PAUSE',
          titleVn: 'XÁC ĐỊNH & TẠM DỪNG',
          descEn: 'Stop work on the affected area immediately. Do not guess or continue until clarified.',
          descVn: 'Dừng công việc tại vị trí bị lỗi ngay lập tức. Không tự ý đoán hoặc làm tiếp khi chưa rõ.',
          highlight: 'STOP WORK',
          icon: AlertCircle
        },
        {
          step: 'PHASE 2',
          titleEn: 'REPORT TO LEADER',
          titleVn: 'BÁO CÁO CHO LEADER',
          descEn: 'Inform your Manager or Team Leader via chat or in person. Provide screenshots of the issue.',
          descVn: 'Thông báo cho Manager hoặc Team Leader. Cung cấp hình ảnh (screenshot) minh họa lỗi.',
          highlight: 'REPORT',
          icon: Users
        },
        {
          step: 'PHASE 3',
          titleEn: 'LOG & ANALYZE',
          titleVn: 'GHI CHÉP & PHÂN TÍCH',
          descEn: 'Log the issue in the Weekly Planner with status ISSUE. Analyze the root cause.',
          descVn: 'Ghi lại vấn đề vào Weekly Planner với trạng thái ISSUE. Phân tích nguyên nhân cốt lõi.',
          highlight: 'LOG ISSUE',
          icon: FileText
        },
        {
          step: 'PHASE 4',
          titleEn: 'RESOLVE & VERIFY',
          titleVn: 'KHẮC PHỤC & KIỂM TRA',
          descEn: 'Apply the solution provided by the Leader. Verify the fix against project standards.',
          descVn: 'Thực hiện giải pháp được Leader đưa ra. Kiểm tra lại theo tiêu chuẩn dự án.',
          highlight: 'VERIFY',
          icon: CheckCircle2
        }
      ]
    },
    specialty: {
      id: 'specialty',
      title: 'Specialty',
      subtitle: 'Engineering Documentation (Tài liệu kỹ thuật đặc thù)',
      icon: HelpCircle,
      color: 'amber',
      type: 'detailed',
      steps: [
        {
          step: 'TECH 01',
          titleEn: 'STR MODELING STANDARDS',
          titleVn: 'TIÊU CHUẨN STR MODELING',
          descEn: 'Advanced GA/LP planning and high-precision sectioning requirements.',
          descVn: 'Quy trình triển khai GA/LP nâng cao và các yêu cầu cắt Section độ chính xác cao.',
          highlight: 'PRECISION',
          icon: Layers
        },
        {
          step: 'TECH 02',
          titleEn: 'PT & REO COMPLEXITY',
          titleVn: 'ĐỘ PHỨC TẠP PT & REO',
          descEn: 'Managing tendon profiles, bursting reinforcement, and heavy shear zones.',
          descVn: 'Xử lý tendon profile, thép đai chống nứt và các khu vực lực cắt lớn.',
          highlight: 'COMPLEXITY',
          icon: Zap
        },
        {
          step: 'TECH 03',
          titleEn: 'LATERAL DESIGN DOCS',
          titleVn: 'TÀI LIỆU LATERAL DESIGN',
          descEn: 'Standard operating procedures for shear walls and core wall reinforcement.',
          descVn: 'Quy trình chuẩn cho thép vách cứng và lõi thang máy.',
          highlight: 'CORE WALL',
          icon: ShieldCheck
        }
      ]
    }
  };

  return (
    <div className="w-full space-y-[10px] pb-12">
      {/* Navigation Header */}
      <div className="ocd-card flex flex-wrap items-center justify-between gap-[10px] shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-[10px] rounded-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <WorkflowIcon size={20} />
            </div>
            <div>
              <h2 className="text-xs font-black text-indigo-500 uppercase tracking-widest leading-none">Workflow Intelligence</h2>
              <p className="text-[8px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em] mt-1">Standard Operating Procedures</p>
            </div>
          </div>

          <div className="h-8 w-px bg-[var(--border)] mx-2" />

          <div className="flex items-center gap-[10px] p-[10px] bg-white/5 rounded-[8px] border border-white/5">
            {Object.values(workflows).map((wf) => (
              <button
                key={wf.id}
                onClick={() => { setActiveWorkflow(wf.id); setActiveStep(0); }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-[8px] text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeWorkflow === wf.id 
                    ? `bg-${wf.color}-500 text-white shadow-lg` 
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                {React.createElement(wf.icon, { size: 14 })}
                {wf.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeWorkflow}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="space-y-[10px]"
        >
          {/* Workflow Header */}
          <div className="text-center space-y-3">
            <h1 className="text-[30px] font-black text-white tracking-tighter uppercase italic leading-none">
              {workflows[activeWorkflow].title}
            </h1>
            <p className="text-xs font-black text-indigo-500 uppercase tracking-[0.5em]">
              {workflows[activeWorkflow].subtitle}
            </p>
          </div>

          {workflows[activeWorkflow].type === 'flow' && (
            <div className="max-w-5xl mx-auto ocd-card relative overflow-hidden">
               {/* Background Glow */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
               
               <div className="relative flex flex-col items-center gap-12">
                 {/* Main Flow nodes */}
                 <div className="flex flex-wrap justify-center items-center gap-[10px]">
                    {workflows[activeWorkflow].steps.slice(0, 3).map((step, idx) => (
                      <React.Fragment key={step.id}>
                        <motion.div
                          whileHover={{ scale: 1.05, y: -5 }}
                          className="w-48 h-24 ocd-card border-indigo-500/20 bg-indigo-500/5 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-indigo-500/50 transition-all"
                        >
                          <span className="text-[10px] font-black text-indigo-400 mb-1 opacity-60">PHASE 0{idx+1}</span>
                          <span className="text-sm font-black text-white uppercase tracking-widest">{step.label}</span>
                        </motion.div>
                        {idx < 2 && <ArrowRight size={20} className="text-indigo-500/30" />}
                      </React.Fragment>
                    ))}
                 </div>

                 {/* Arrow down from Complete */}
                 <div className="flex gap-40">
                    <div className="flex flex-col items-center gap-8">
                        <div className="w-[2px] h-12 bg-gradient-to-b from-indigo-500 to-transparent" />
                        <div className="flex items-center gap-12">
                             {/* Recheck Node (Left) */}
                            <div className="flex items-center gap-6">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    className="w-40 h-20 ocd-card border-rose-500/20 bg-rose-500/5 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-rose-500/50 transition-all"
                                >
                                    <span className="text-[10px] font-black text-rose-400 mb-1 opacity-60">ITERATION</span>
                                    <span className="text-xs font-black text-white uppercase tracking-widest">RECHECK</span>
                                </motion.div>
                                <div className="flex flex-col gap-4">
                                     <ArrowRight size={16} className="text-indigo-500/20 rotate-[225deg]" />
                                     <ArrowRight size={16} className="text-indigo-500/20 rotate-45" />
                                </div>
                            </div>

                            <ArrowRight size={24} className="text-indigo-500 rotate-90" />

                             {/* Checked Node (Right) */}
                            <div className="flex items-center gap-6">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    className="w-48 h-24 ocd-card border-emerald-500/30 bg-emerald-500/5 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-emerald-500/50 transition-all shadow-[0_0_30px_rgba(16,185,129,0.1)]"
                                >
                                    <span className="text-[10px] font-black text-emerald-400 mb-1 opacity-60">FINAL APPROVAL</span>
                                    <span className="text-sm font-black text-white uppercase tracking-widest">CHECKED</span>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                 </div>
               </div>
            </div>
          )}

          {workflows[activeWorkflow].type === 'detailed' && (
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-[10px]">
              {/* Vertical Step Navigation */}
              <div className="lg:col-span-4 space-y-[10px]">
                {workflows[activeWorkflow].steps.map((step, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ x: 5 }}
                    onClick={() => setActiveStep(idx)}
                    className={`w-full text-left p-[10px] rounded-[8px] border transition-all flex items-center gap-[10px] ${
                      activeStep === idx 
                        ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_20px_50px_rgba(16,185,129,0.3)] scale-105' 
                        : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)] hover:border-emerald-500/30 hover:text-white'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-[8px] flex items-center justify-center shrink-0 ${
                      activeStep === idx ? 'bg-white/20' : 'bg-emerald-500/10 text-emerald-500'
                    }`}>
                      {React.createElement(step.icon, { size: 20 })}
                    </div>
                    <div className="flex-grow overflow-hidden">
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${activeStep === idx ? 'text-emerald-100' : 'text-emerald-500'}`}>{step.step}</p>
                      <h4 className="text-sm font-black uppercase tracking-tight truncate">{step.titleEn}</h4>
                    </div>
                    <ChevronRight size={16} className={activeStep === idx ? 'text-white' : 'opacity-20'} />
                  </motion.button>
                ))}
              </div>

              {/* Step Detail Content */}
              <div className="lg:col-span-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="ocd-card border-emerald-500/10 bg-emerald-500/5 h-full relative overflow-hidden"
                  >
                    {/* Background decoration */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full" />
                    
                    <div className="relative space-y-[10px]">
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-[8px] bg-emerald-500 flex items-center justify-center text-white shadow-2xl shadow-emerald-500/40">
                          {React.createElement(workflows[activeWorkflow].steps[activeStep].icon, { size: 36 })}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                             <span className="px-3 py-1 bg-emerald-500/20 text-emerald-500 rounded-lg text-[10px] font-black uppercase">{workflows[activeWorkflow].steps[activeStep].step}</span>
                             <div className="h-px w-12 bg-emerald-500/30" />
                          </div>
                          <h2 className="text-[24px] font-black text-white uppercase tracking-tight">{workflows[activeWorkflow].steps[activeStep].titleEn}</h2>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px] items-start">
                        {/* English Description */}
                        <div className="space-y-4">
                           <div className="flex items-center gap-2 text-[var(--text-muted)] font-black text-[10px] uppercase tracking-widest border-b border-[var(--border)] pb-2">
                             <img src="https://flagcdn.com/w20/au.png" width="16" alt="AU" className="opacity-60" /> English Instruction
                           </div>
                           <p className="text-lg font-bold text-white leading-relaxed">
                             {workflows[activeWorkflow].steps[activeStep].descEn.split(workflows[activeWorkflow].steps[activeStep].highlight).map((part, i, arr) => (
                               <React.Fragment key={i}>
                                 {part}
                                 {i < arr.length - 1 && (
                                   <span className="text-emerald-400 border-b-2 border-emerald-500/30 pb-0.5">{workflows[activeWorkflow].steps[activeStep].highlight}</span>
                                 )}
                               </React.Fragment>
                             ))}
                           </p>
                        </div>

                        {/* Vietnamese Description */}
                        <div className="space-y-4">
                           <div className="flex items-center gap-2 text-[var(--text-muted)] font-black text-[10px] uppercase tracking-widest border-b border-[var(--border)] pb-2">
                             <img src="https://flagcdn.com/w20/vn.png" width="16" alt="VN" className="opacity-60" /> Tiếng Việt (Vietnamese)
                           </div>
                           <p className="text-lg font-bold text-indigo-300 leading-relaxed italic">
                             {workflows[activeWorkflow].steps[activeStep].descVn.split(workflows[activeWorkflow].steps[activeStep].highlight.split(' ')[0]).map((part, i, arr) => (
                               <React.Fragment key={i}>
                                 {part}
                                 {i < arr.length - 1 && (
                                   <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">{workflows[activeWorkflow].steps[activeStep].highlight.split(' ')[0]}</span>
                                 )}
                               </React.Fragment>
                             ))}
                           </p>
                        </div>
                      </div>

                      {/* Visual Cue / Status */}
                      <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-emerald-400/60 font-black text-[10px] uppercase tracking-widest">
                          <CheckCircle2 size={16} /> Procedure Standard Verified
                        </div>
                        <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                          REV 01 / 2026
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}

          {workflows[activeWorkflow].type === 'placeholder' && (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-8">
              <div className={`w-32 h-32 rounded-[3rem] bg-${workflows[activeWorkflow].color}-500/10 border border-${workflows[activeWorkflow].color}-500/20 flex items-center justify-center text-${workflows[activeWorkflow].color}-400 shadow-2xl animate-pulse`}>
                {React.createElement(workflows[activeWorkflow].icon, { size: 64 })}
              </div>
              <div className="space-y-2">
                <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">Developing Module</h2>
                <p className="text-[var(--text-muted)] font-black uppercase tracking-[0.4em] text-xs">Standardized logic being mapped by engineering team</p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Workflows;
