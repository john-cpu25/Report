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
  ArrowLeft
} from 'lucide-react';
import libraryBg from '../assets/library.png';

const Workflows = () => {
  const [selectedRoom, setSelectedRoom] = useState(null); // 'str', 'pt_reo', 'mto', 'arch'
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);
  const [currentSpread, setCurrentSpread] = useState(0);
  const [pageDirection, setPageDirection] = useState(1);
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [prevSpread, setPrevSpread] = useState(0);
  const [flipHalf, setFlipHalf] = useState('front');

  const shelfRef = useRef(null);
  const bookRef = useRef(null);
  const pageFlipRef = useRef(null);

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
        });

        try {
          pageFlip.loadFromHTML(bookRef.current.querySelectorAll('.page-item'));
          pageFlipRef.current = pageFlip;

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
  }, [selectedWorkflowId]);

  const rooms = {
    str: {
      id: 'str',
      title: 'STR MODELING',
      subtitle: 'Structural Modeling Division',
      icon: Layers,
      color: '#10b981', // Emerald
      desc: 'Quy chuẩn kiểm soát chất lượng mô hình 3D kết cấu, QA/QC bản vẽ dầm cột sàn và thiết lập hệ tọa độ chia sẻ.',
      workflows: {
        str_qa: {
          id: 'str_qa',
          title: 'QA Check Process',
          subtitle: 'Quality Assurance Protocol (Quy trình QA)',
          icon: ShieldCheck,
          color: '#10b981',
          spreads: [
            {
              left: {
                type: 'cover',
                title: 'QA Check Process',
                subtitle: 'Quality Assurance Protocol (Quy trình QA)',
                volume: 'Vol. STR-I',
                classification: 'QUALITY AUDIT',
                stampColor: '#10b981'
              },
              right: {
                type: 'intro',
                desc: 'Quy trình 5 bước kiểm soát chất lượng tuyệt đối nhằm giảm thiểu tối đa sai sót trước khi xuất hồ sơ kỹ thuật kết cấu bê tông cốt thép tại Rincovitch.',
                meta: [
                  { label: 'Bộ phận', val: 'STR Modeling Team' },
                  { label: 'Quy chuẩn', val: 'QA-STR-2026' },
                  { label: 'Bảo mật', val: 'HIGH CONFIDENTIAL' }
                ]
              }
            },
            {
              left: {
                type: 'steps',
                title: 'Steps 01 & 02',
                steps: [
                  {
                    step: 'STEP 1',
                    titleEn: 'RECEIVE MARKUP & FILE SETUP',
                    titleVn: 'NHẬN MARKUP & TẠO FILE',
                    descEn: 'When you receive the markup from the Manager/Leader, create a new file with your name added. EX: MARKUP-LOADING PLAN -> MARKUP-LOADING PLAN_NHAN',
                    descVn: 'Khi nhận được bản markup từ cấp trên, sao chép và tạo file làm việc mới có hậu tố tên mình. EX: MARKUP-LOADING PLAN => MARKUP-LOADING PLAN_NHÂN',
                    highlight: 'NHAN',
                    icon: FileText
                  },
                  {
                    step: 'STEP 2',
                    titleEn: 'HIGHLIGHT COMPLETED AREAS',
                    titleVn: 'TÔ MÀU VỊ TRÍ HOÀN THÀNH',
                    descEn: 'HIGHLIGHT the areas on the markup drawing that you have completed to keep precise track.',
                    descVn: 'Sử dụng bút màu TÔ MÀU trực tiếp lên các vị trí đã xử lý xong trên bản vẽ markup để kiểm soát.',
                    highlight: 'HIGHLIGHT',
                    icon: Search
                  }
                ]
              },
              right: {
                type: 'steps',
                title: 'Steps 03 & 04',
                steps: [
                  {
                    step: 'STEP 3',
                    titleEn: 'PRINT & SECOND HIGHLIGHT',
                    titleVn: 'IN RA VÀ TÔ MÀU LẦN 2',
                    descEn: 'After finishing, print out the drawing and HIGHLIGHT again on the physical drawing for absolute verification.',
                    descVn: 'Sau khi hoàn thành, in bản vẽ ra giấy và TÔ MÀU kiểm tra lần 2 lên bản cứng để soát lỗi.',
                    highlight: 'HIGHLIGHT AGAIN',
                    icon: MousePointer2
                  },
                  {
                    step: 'STEP 4',
                    titleEn: 'CROSS-CHECK & STAMPING',
                    titleVn: 'CHECK CHÉO & ĐÓNG DẤU',
                    descEn: 'Cross-check with other member. Checker must add a STAMP and save with name. EX: MARKUP-LOADING PLAN_Checked By NN',
                    descVn: 'Bàn giao cho đồng nghiệp check chéo. Người check thực hiện ĐÓNG DẤU (STAMP) xác nhận và lưu file kèm tên mình. EX: MARKUP-LOADING PLAN_Checked By NN',
                    highlight: 'STAMP',
                    icon: CheckCircle2
                  }
                ]
              }
            },
            {
              left: {
                type: 'steps',
                title: 'Step 05',
                steps: [
                  {
                    step: 'STEP 5',
                    titleEn: 'FINAL MANAGER REVIEW',
                    titleVn: 'LEADER CHECK LẦN CUỐI',
                    descEn: 'Manager/Leader performs the absolute final review before formal issuance.',
                    descVn: 'Manager/Leader duyệt kỹ thuật tổng thể lần cuối trước khi chính thức phát hành bản vẽ.',
                    highlight: 'FINAL CHECK',
                    icon: Clock
                  }
                ]
              },
              right: {
                type: 'signoff',
                title: 'Quality Verification',
                checklist: [
                  'Tên file tuân thủ quy định đặt tên',
                  'Bản vẽ in giấy được tô màu đầy đủ',
                  'Có chữ ký check chéo và đóng dấu',
                  'Leader phê duyệt cuối cùng'
                ],
                notes: 'Tuyệt đối không bỏ qua các bước tô màu kiểm tra. Đây là quy tắc vàng để bảo đảm bản vẽ không sót lỗi kỹ thuật.'
              }
            }
          ]
        },
        str_standards: {
          id: 'str_standards',
          title: 'STR Modeling Standards',
          subtitle: 'Modeling Rules & Shared Coordinates (Quy chuẩn dựng hình)',
          icon: Layers,
          color: '#047857',
          spreads: [
            {
              left: {
                type: 'cover',
                title: 'Modeling Standards',
                subtitle: 'Level & Coordinates Rules (Tiêu chuẩn Kết cấu)',
                volume: 'Vol. STR-II',
                classification: 'ENGINEERING GUIDELINE',
                stampColor: '#047857'
              },
              right: {
                type: 'intro',
                desc: 'Quy chuẩn thiết lập ban đầu cho dự án, kiểm soát cốt cao độ dầm sàn kết cấu và hệ thống lưới tọa độ chia sẻ đồng nhất.',
                meta: [
                  { label: 'Lĩnh vực', val: 'Revit STR Modeling' },
                  { label: 'Quy chuẩn', val: 'RINCO-STR-COOR' },
                  { label: 'Tọa độ', val: 'Shared Coordinates' }
                ]
              }
            },
            {
              left: {
                type: 'steps',
                title: 'Standards 01 & 02',
                steps: [
                  {
                    step: 'STD 01',
                    titleEn: 'SHARED COORDINATES SETUP',
                    titleVn: 'THIẾT LẬP TỌA ĐỘ CHIA SẺ',
                    descEn: 'Acquire coordinates from the master site layout. Never manually move the project base point.',
                    descVn: 'Nhận tọa độ trực tiếp từ bản vẽ quy hoạch tổng mặt bằng. Tuyệt đối không di dời Project Base Point thủ công.',
                    highlight: 'SHARED COORDINATES',
                    icon: Compass
                  },
                  {
                    step: 'STD 02',
                    titleEn: 'LEVELS & GRIDS ALIGNMENT',
                    titleVn: 'ĐỒNG BỘ LƯỚI VÀ CAO ĐỘ',
                    descEn: 'Align all level planes with structural slab levels, not finished architectural floors.',
                    descVn: 'Định vị cốt cao độ chuẩn xác theo cao độ kết cấu bê tông, không nhầm lẫn với cốt hoàn thiện kiến trúc.',
                    highlight: 'LEVEL PLANS',
                    icon: Layers
                  }
                ]
              },
              right: {
                type: 'signoff',
                title: 'Verification Roster',
                checklist: [
                  'Tọa độ trùng khớp Master Site',
                  'Lưới trục định vị được khóa PIN',
                  'Cao độ kết cấu bê tông chuẩn xác',
                  'Đã dọn dẹp các đường CAD rác'
                ],
                notes: 'Việc sai lệch tọa độ dầm cột ban đầu sẽ kéo theo sai lệch toàn bộ bản vẽ cốt thép và khối lượng bê tông.'
              }
            }
          ]
        }
      }
    },
    pt_reo: {
      id: 'pt_reo',
      title: 'PT & REO',
      subtitle: 'Post-Tension & Reinforcement Division',
      icon: Zap,
      color: '#f59e0b', // Amber
      desc: 'Quản lý đường cáp dự ứng lực, cốt thép xoắn kháng nứt anchorage và bố trí cốt thép đai chịu lực cắt lớn beam-column joints.',
      workflows: {
        pt_complexity: {
          id: 'pt_complexity',
          title: 'PT & REO Complexity',
          subtitle: 'Heavy Shear Detailing (Cáp DƯL & Thép Đai)',
          icon: Zap,
          color: '#f59e0b',
          spreads: [
            {
              left: {
                type: 'cover',
                title: 'PT & REO Complexity',
                subtitle: 'Tendon Profiles & Reinforcement (Thép & Cáp)',
                volume: 'Vol. PT-I',
                classification: 'TECHNICAL VAULT',
                stampColor: '#f59e0b'
              },
              right: {
                type: 'intro',
                desc: 'Tổng hợp quy chuẩn kỹ thuật đặc thù bậc cao cho phần dựng hình cáp dự ứng lực (PT), thép kháng nứt đầu neo (bursting) và các vùng chịu cắt lớn.',
                meta: [
                  { label: 'Bộ phận', val: 'PT Detailing Team' },
                  { label: 'Quy chuẩn', val: 'RINCO-PT-03' },
                  { label: 'Cốt thép', val: 'PT & Heavy Rebar' }
                ]
              }
            },
            {
              left: {
                type: 'steps',
                title: 'Steps 01 & 02',
                steps: [
                  {
                    step: 'TECH 01',
                    titleEn: 'TENDON PROFILE SETUP',
                    titleVn: 'THIẾT LẬP ĐƯỜNG CÁP DƯL',
                    descEn: 'Correctly map tendon high points over columns and low points at midspan based on calculations.',
                    descVn: 'Định vị chính xác điểm uốn cáp cao nhất trên đầu cột và điểm võng thấp nhất tại giữa nhịp dầm sàn.',
                    highlight: 'TENDON PROFILE',
                    icon: Zap
                  },
                  {
                    step: 'TECH 02',
                    titleEn: 'BURSTING REBAR ALIGNMENT',
                    titleVn: 'CỐT THÉP KHÁNG NỨT ĐẦU NEO',
                    descEn: 'Position heavy spiral and orthogonal rebars directly around the anchorage zone to resist bursting forces.',
                    descVn: 'Bố trí thép xoắn đai dày kháng lực kéo nở hông trực tiếp tại vùng nén ép cục bộ đầu neo cáp.',
                    highlight: 'BURSTING FORCE',
                    icon: Compass
                  }
                ]
              },
              right: {
                type: 'steps',
                title: 'Step 03',
                steps: [
                  {
                    step: 'TECH 03',
                    titleEn: 'CONGESTED ZONE INSPECTION',
                    titleVn: 'KIỂM SOÁT VÙNG XUNG ĐỘT THÉP',
                    descEn: 'Inspect congested beam-column joints in 3D to ensure rebars do not clash and concrete can be poured.',
                    descVn: 'Kiểm tra mô hình 3D nút khung dầm cột để bảo đảm cốt thép không xung đột chật ních, tạo không gian đổ bê tông.',
                    highlight: 'CONGESTED ZONE',
                    icon: Search
                  }
                ]
              }
            },
            {
              left: {
                type: 'signoff',
                title: 'PT Verification Roster',
                checklist: [
                  'Cao độ đầu neo cáp chuẩn xác',
                  'Đủ thép spiral kháng nứt đầu neo',
                  'Khoảng cách cốt thép đai dầm đạt chuẩn',
                  'Đã kiểm tra va chạm 3D rebar'
                ],
                notes: 'Các nút khung dầm cột bị xung đột cốt thép dày đặc là lỗi thường gặp trên công trường, cần được giải quyết trên mô hình BIM.'
              },
              right: {
                type: 'cover',
                title: 'Security Clearance',
                subtitle: 'Standardized by PT Committee',
                volume: 'SECURE',
                classification: 'CONFIDENTIAL DOCUMENT',
                stampColor: '#d97706'
              }
            }
          ]
        }
      }
    },
    mto: {
      id: 'mto',
      title: 'MTO',
      subtitle: 'Maker to order',
      icon: FileText,
      color: '#8b5cf6', // Violet
      desc: 'Thiết lập bảng thống kê khối lượng bê tông, diện tích ván khuôn dầm cột sàn và khối lượng cốt thép tự động từ mô hình Revit.',
      workflows: {
        mto_flow: {
          id: 'mto_flow',
          title: 'Maker to order Flow',
          subtitle: 'Concrete & Formwork Schedules (Bảng Thống Kê)',
          icon: FileText,
          color: '#8b5cf6',
          spreads: [
            {
              left: {
                type: 'cover',
                title: 'Maker to order Flow',
                subtitle: 'Automatic Schedules & Export (Quy trình Đo Bóc)',
                volume: 'Vol. MTO-I',
                classification: 'VALUATION PROTOCOL',
                stampColor: '#8b5cf6'
              },
              right: {
                type: 'intro',
                desc: 'Quy trình tạo bảng thống kê khối lượng tự động từ mô hình 3D Revit, áp dụng tham số NMK chuẩn hóa dữ liệu đầu ra xuất sang Excel.',
                meta: [
                  { label: 'Lớp đối tượng', val: 'Concrete / Formwork' },
                  { label: 'Plugin', val: 'Rinco NMK Export' },
                  { label: 'Độ chính xác', val: 'Tỷ lệ sai lệch < 2%' }
                ]
              }
            },
            {
              left: {
                type: 'steps',
                title: 'Steps 01 & 02',
                steps: [
                  {
                    step: 'MTO 01',
                    titleEn: 'REVIT SCHEDULE CREATION',
                    titleVn: 'TẠO BẢNG THỐNG KÊ TRÊN REVIT',
                    descEn: 'Create specific schedules grouped by elements and levels. Apply correct formulas for concrete volume.',
                    descVn: 'Thiết lập bảng khối lượng chi tiết phân theo cấu kiện và tầng. Áp dụng đúng công thức tính toán thể tích.',
                    highlight: 'REVIT SCHEDULE',
                    icon: FileText
                  },
                  {
                    step: 'MTO 02',
                    titleEn: 'PARAMETER MAPPING',
                    titleVn: 'GÁN THAM SỐ KHỐI LƯỢNG',
                    descEn: 'Assign custom Rincovitch parameters to group concrete grades and pouring phases.',
                    descVn: 'Gán các tham số quản lý đặc thù của Rincovitch để phân loại mác bê tông và phân đợt đổ bê tông.',
                    highlight: 'PARAMETER',
                    icon: Compass
                  }
                ]
              },
              right: {
                type: 'steps',
                title: 'Step 03',
                steps: [
                  {
                    step: 'MTO 03',
                    titleEn: 'EXCEL EXPORT & AUDIT',
                    titleVn: 'XUẤT FILE EXCEL & ĐỐI CHIẾU',
                    descEn: 'Export schedules to standard Excel templates. Audit quantities with historical project databases.',
                    descVn: 'Xuất bảng thống kê ra tệp Excel mẫu tiêu chuẩn. Tiến hành đối chiếu với cơ sở dữ liệu dự án mẫu.',
                    highlight: 'EXCEL EXPORT',
                    icon: ShieldCheck
                  }
                ]
              }
            },
            {
              left: {
                type: 'signoff',
                title: 'Quantity Validation Roster',
                checklist: [
                  'Đúng mác bê tông theo thiết kế',
                  'Khối lượng tính đúng trừ hao thể tích giao',
                  'Diện tích ván khuôn dầm sàn chuẩn xác',
                  'Đã đối chiếu chéo số liệu 2D'
                ],
                notes: 'Bảng thống kê khối lượng chính xác là cơ sở pháp lý cực kỳ quan trọng để bảo đảm dự toán thầu và thanh quyết toán dự án.'
              },
              right: {
                type: 'cover',
                title: 'SECURE ARCHIVE',
                subtitle: 'Verified by Quantity Committee',
                volume: 'APPROVED',
                classification: 'ESTIMATE STANDARDS',
                stampColor: '#7c3aed'
              }
            }
          ]
        }
      }
    },
    arch: {
      id: 'arch',
      title: 'ARCH',
      subtitle: 'Architectural Coordination Division',
      icon: Home,
      color: '#3b82f6', // Blue
      desc: 'Phối hợp xử lý lỗ mở hộp kỹ thuật (MEP), kiểm soát vị trí mép dầm vách kết cấu trùng khớp với vách ngăn kiến trúc.',
      workflows: {
        arch_coor: {
          id: 'arch_coor',
          title: 'ARCH-STR Coordination',
          subtitle: 'Slab Openings & Alignment (Phối Hợp Kiến Trúc)',
          icon: Compass,
          color: '#3b82f6',
          spreads: [
            {
              left: {
                type: 'cover',
                title: 'ARCH-STR Coordination',
                subtitle: 'Interface & Level Alignment (Phối hợp)',
                volume: 'Vol. ARC-I',
                classification: 'COORDINATION GUIDE',
                stampColor: '#3b82f6'
              },
              right: {
                type: 'intro',
                desc: 'Hướng dẫn kiểm soát giao diện thiết kế giữa mô hình kết cấu bê tông và mô hình kiến trúc hoàn thiện, xử lý lỗ mở hộp gen kỹ thuật.',
                meta: [
                  { label: 'Mô hình liên kết', val: 'STR Linked into ARCH' },
                  { label: 'Xung đột', val: 'Lỗ mở & Cao độ sàn' },
                  { label: 'Phần mềm', val: 'Revit 2024 / Navisworks' }
                ]
              }
            },
            {
              left: {
                type: 'steps',
                title: 'Steps 01 & 02',
                steps: [
                  {
                    step: 'COOR 01',
                    titleEn: 'LINK MODEL ALIGNMENT',
                    titleVn: 'ĐỒNG BỘ BẢN VẼ LIÊN KẾT',
                    descEn: 'Link structural model into architectural master file. Always check internal grid offsets first.',
                    descVn: 'Tham chiếu mô hình kết cấu vào tệp kiến trúc chính. Kiểm soát triệt để độ lệch lưới trục định vị.',
                    highlight: 'LINK MODEL',
                    icon: Compass
                  },
                  {
                    step: 'COOR 02',
                    titleEn: 'STRUCTURAL SLAB OPENINGS',
                    titleVn: 'LỖ MỞ HỘP KỸ THUẬT SÀN VÁCH',
                    descEn: 'Check structural slab openings against architectural shaft lines and MEP risers.',
                    descVn: 'Soát lỗ mở trên sàn bê tông cốt thép khớp với trục hộp gen kiến trúc và đường ống kỹ thuật MEP.',
                    highlight: 'SLAB OPENINGS',
                    icon: Layers
                  }
                ]
              },
              right: {
                type: 'signoff',
                title: 'Coordination Verification',
                checklist: [
                  'Lưới trục định vị khớp 100%',
                  'Đã mở đủ lỗ kỹ thuật hộp gen',
                  'Độ lệch cao độ sàn hoàn thiện đạt chuẩn',
                  'Mép vách kết cấu trùng mép kiến trúc'
                ],
                notes: 'Các xung đột mép dầm bê tông thò ra khỏi tường hoàn thiện kiến trúc cần được phát hiện sớm trên mô hình 3D.'
              }
            }
          ]
        }
      }
    }
  };

  const handleBookClick = (id) => {
    setPageDirection(1);
    setSelectedWorkflowId(id);
    setCurrentSpread(0);
  };

  const currentRoomData = rooms[selectedRoom];
  const activeWorkflowsList = currentRoomData ? Object.values(currentRoomData.workflows) : [];

  const selectedWorkflow = currentRoomData?.workflows[selectedWorkflowId];
  const maxSpreads = selectedWorkflow?.spreads?.length || 0;
  const leftThickness = maxSpreads > 1 ? (currentSpread / (maxSpreads - 1)) * 10 + 2 : 2;
  const rightThickness = maxSpreads > 1 ? ((maxSpreads - 1 - currentSpread) / (maxSpreads - 1)) * 10 + 2 : 2;

  const handlePageTurn = (direction) => {
    if (isFlipping) return;
    const next = currentSpread + direction;
    if (next < 0 || next >= maxSpreads) return;

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
        <div className="flex-grow flex flex-col justify-center my-6">
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

              <h3 className="text-[10px] font-black text-stone-400 tracking-[0.3em] uppercase mb-1">{leftData.classification}</h3>
              <h2 className="text-[28px] font-black text-stone-800 leading-tight uppercase tracking-wide mb-3 font-serif" style={{ fontFamily: 'Georgia, serif' }}>
                {leftData.title}
              </h2>
              <div className="w-12 h-[1.5px] bg-stone-300 my-2" />
              <p className="text-[13px] text-stone-500 font-bold max-w-[260px] leading-relaxed italic">
                {leftData.subtitle}
              </p>
              <span className="mt-8 px-3 py-1 bg-stone-200/50 text-stone-600 text-[9px] font-black uppercase rounded tracking-wider border border-stone-300/40">{leftData.volume}</span>
            </div>
          )}

          {leftData.type === 'steps' && (
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-stone-400 tracking-[0.25em] uppercase border-b border-stone-200 pb-2">{leftData.title}</h3>
              <div className="space-y-6 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                {leftData.steps.map((step, sIdx) => (
                  <div key={sIdx} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-md shrink-0"
                        style={{ backgroundColor: selectedWorkflow.color }}
                      >
                        {React.createElement(step.icon, { size: 16 })}
                      </div>
                      <div>
                        <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: selectedWorkflow.color }}>{step.step}</span>
                        <h4 className="text-[13px] font-black text-stone-800 uppercase tracking-tight leading-none mt-0.5">{step.titleEn}</h4>
                      </div>
                    </div>
                    <div className="pl-12 space-y-1.5 border-l-2 border-stone-200 ml-4.5">
                      <p className="text-[11px] text-stone-600 font-bold leading-relaxed">{formatContent(step.descEn, step.highlight)}</p>
                      <p className="text-[11px] text-indigo-900 font-semibold leading-relaxed italic pr-2">{step.descVn}</p>
                    </div>
                  </div>
                ))}
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
        <div className="flex-grow flex flex-col justify-center my-6">
          {rightData.type === 'intro' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h4 className="text-[9px] font-black text-stone-400 tracking-[0.2em] uppercase flex items-center gap-2">
                  <Sparkles size={12} className="text-yellow-600" /> Executive Overview
                </h4>
                <p className="text-[13px] text-stone-700 leading-relaxed text-justify first-letter:text-[36px] first-letter:font-black first-letter:text-stone-800 first-letter:mr-2 first-letter:float-left first-letter:leading-[0.8] first-letter:font-serif">
                  {rightData.desc}
                </p>
              </div>

              <div className="pt-6 border-t border-stone-200 space-y-4">
                <h5 className="text-[9px] font-black text-stone-400 tracking-[0.2em] uppercase">Volume Index</h5>
                <div className="space-y-2">
                  {rightData.meta.map((m, mIdx) => (
                    <div key={mIdx} className="flex justify-between text-[11px] text-stone-600 border-b border-stone-100 pb-1.5 last:border-0">
                      <span className="font-bold text-stone-400 uppercase tracking-widest text-[8px]">{m.label}</span>
                      <span className="font-black text-stone-800">{m.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {rightData.type === 'steps' && (
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-stone-400 tracking-[0.25em] uppercase border-b border-stone-200 pb-2">{rightData.title}</h3>
              <div className="space-y-6 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                {rightData.steps.map((step, sIdx) => (
                  <div key={sIdx} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-md shrink-0"
                        style={{ backgroundColor: selectedWorkflow.color }}
                      >
                        {React.createElement(step.icon, { size: 16 })}
                      </div>
                      <div>
                        <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: selectedWorkflow.color }}>{step.step}</span>
                        <h4 className="text-[13px] font-black text-stone-800 uppercase tracking-tight leading-none mt-0.5">{step.titleEn}</h4>
                      </div>
                    </div>
                    <div className="pl-12 space-y-1.5 border-l-2 border-stone-200 ml-4.5">
                      <p className="text-[11px] text-stone-600 font-bold leading-relaxed">{formatContent(step.descEn, step.highlight)}</p>
                      <p className="text-[11px] text-indigo-900 font-semibold leading-relaxed italic pr-2">{step.descVn}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rightData.type === 'signoff' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-[9px] font-black text-stone-400 tracking-[0.2em] uppercase">{rightData.title}</h4>
                <div className="grid grid-cols-1 gap-2">
                  {rightData.checklist.map((c, cIdx) => (
                    <div key={cIdx} className="flex items-center gap-2.5 p-2 bg-stone-100/50 rounded border border-stone-200/40">
                      <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                      <span className="text-[10px] font-bold text-stone-700 leading-tight">{c}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-200">
                <span className="text-[8px] font-bold text-stone-400 uppercase tracking-widest leading-none mb-1 block">Authoritative Note</span>
                <p className="text-[11px] font-medium text-stone-600 italic leading-relaxed bg-amber-500/5 p-3 border-l-2 border-amber-500/50 rounded-r">{rightData.notes}</p>
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
                  onClick={() => handlePageTurn(-1)}
                  className={`p-2.5 rounded-full bg-gradient-to-b from-[#f3dfa2] via-[#cfa043] to-[#8d6a1f] text-[#2c1e03] hover:from-[#fbecc0] hover:to-[#ae8129] transition-all border border-[#ffe9b3]/30 shadow-[0_4px_10px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.4)] ${currentSpread === 0 ? 'opacity-35 cursor-not-allowed' : 'active:scale-90 active:shadow-inner cursor-pointer'}`}
                  title="Turn Back"
                >
                  <ChevronLeft size={15} className="stroke-[2.5]" />
                </button>
                
                <button
                  disabled={currentSpread === maxSpreads - 1 || isFlipping}
                  onClick={() => handlePageTurn(1)}
                  className={`p-2.5 rounded-full bg-gradient-to-b from-[#f3dfa2] via-[#cfa043] to-[#8d6a1f] text-[#2c1e03] hover:from-[#fbecc0] hover:to-[#ae8129] transition-all border border-[#ffe9b3]/30 shadow-[0_4px_10px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.4)] ${currentSpread === maxSpreads - 1 || isFlipping ? 'opacity-35 cursor-not-allowed' : 'active:scale-90 active:shadow-inner cursor-pointer'}`}
                  title="Turn Page"
                >
                  <ChevronRight size={15} className="stroke-[2.5]" />
                </button>

                <div className="h-6 w-px bg-stone-300 mx-2" />

                <button 
                  onClick={() => setSelectedWorkflowId(null)}
                  className="px-5 py-2.5 bg-stone-800 text-stone-200 hover:bg-rose-600 hover:text-white rounded-md text-[12px] font-black uppercase tracking-widest transition-all shadow active:translate-y-0.5 cursor-pointer"
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
      className="w-full mx-auto pb-12 relative min-h-screen rounded-2xl overflow-hidden"
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
            /* ROOM SELECTION SCREEN (Clean Vertical Icons Sidebar on Right Edge) */
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
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/5 shadow-md">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: `${currentRoomData.color}20`, color: currentRoomData.color }}
                  >
                    {React.createElement(currentRoomData.icon, { size: 22 })}
                  </div>
                  <div>
                    <h2 className="text-[24px] font-black text-white uppercase tracking-tight leading-none">{currentRoomData.title}</h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{currentRoomData.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3 md:mt-0">
                  <div className="px-5 py-3 rounded-lg border border-white/5 text-[11px] font-black text-slate-500 tracking-wider uppercase flex items-center justify-center">
                    Division Active
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    onClick={() => { setSelectedRoom(null); setSelectedWorkflowId(null); }}
                    className="flex items-center gap-2.5 px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[13px] font-black uppercase tracking-widest rounded-lg border border-white/10 transition-colors shadow-md cursor-pointer"
                  >
                    <ArrowLeft size={16} /> Back to Divisions
                  </motion.button>
                </div>
              </div>

              {/* Bookshelf block */}
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-10 min-h-[520px] flex flex-col justify-end shadow-2xl relative group/shelf">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent pointer-events-none rounded-2xl" />

                {/* Left/Right scroll controls */}
                {activeWorkflowsList.length > 5 && (
                  <>
                    <button
                      onClick={() => scrollShelf('left')}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gradient-to-b from-[#78350f] to-[#451a03] hover:from-[#92400e] hover:to-[#78350f] text-amber-400 border border-[#b45309]/50 shadow-lg flex items-center justify-center z-30 transition-all active:scale-95 group/btn"
                      title="Scroll Left"
                    >
                      <ArrowRight size={18} className="rotate-180 group-hover/btn:-translate-x-0.5 transition-transform" />
                    </button>

                    <button
                      onClick={() => scrollShelf('right')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gradient-to-b from-[#78350f] to-[#451a03] hover:from-[#92400e] hover:to-[#78350f] text-amber-400 border border-[#b45309]/50 shadow-lg flex items-center justify-center z-30 transition-all active:scale-95 group/btn"
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
                            {wf.id.substring(0, 4).toUpperCase()}
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
              onClick={() => setSelectedWorkflowId(null)}
              className="absolute inset-0 bg-[#070b13]/90 backdrop-blur-2xl z-10"
            />
            
            {/* Hardcover Outer wrap */}
            <motion.div
              initial={{ rotateY: 20, scale: 0.85, opacity: 0 }}
              animate={{ rotateY: 0, scale: 1, opacity: 1 }}
              exit={{ rotateY: -20, scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 180, damping: 22 }}
              className="relative w-full max-w-5xl rounded-[12px] p-[10px] flex flex-col z-20 transition-all"
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
              <div className="relative bg-[#faf8f5] rounded-[6px] min-h-[580px] md:h-[600px] shadow-[inset_0_0_40px_rgba(0,0,0,0.08)] border border-stone-300/50 z-20 flex justify-center items-center">
                
                {/* Vintage Left/Right paper page creases & gradients (overlay decoration) */}
                <div className="absolute inset-y-0 left-0 w-[15px] bg-gradient-to-r from-black/[0.08] to-transparent pointer-events-none z-30" />
                <div className="absolute inset-y-0 right-1/2 w-[40px] bg-gradient-to-r from-transparent via-black/[0.015] to-black/[0.15] pointer-events-none z-30 hidden md:block" />
                
                <div className="absolute inset-y-0 left-1/2 w-[40px] bg-gradient-to-l from-transparent via-black/[0.015] to-black/[0.15] pointer-events-none z-30 hidden md:block" />
                <div className="absolute inset-y-0 right-0 w-[15px] bg-gradient-to-l from-black/[0.08] to-transparent pointer-events-none z-30" />

                {/* Book Spine Crease Line & Deep Cleft Shadow */}
                <div className="absolute top-0 bottom-0 left-1/2 w-[1px] -translate-x-1/2 bg-black/25 z-35 pointer-events-none hidden md:block" />
                <div className="absolute top-0 bottom-0 left-1/2 w-[12px] -translate-x-1/2 bg-gradient-to-r from-black/15 via-transparent to-black/15 z-30 pointer-events-none hidden md:block" />
                <div className="absolute top-0 bottom-0 left-1/2 w-[28px] -translate-x-1/2 bg-gradient-to-r from-black/10 via-transparent to-black/10 z-25 pointer-events-none hidden md:block" />

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
