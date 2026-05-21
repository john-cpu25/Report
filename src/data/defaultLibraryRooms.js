import {
  FileText,
  Search,
  MousePointer2,
  CheckCircle2,
  Clock,
  Layers,
  Zap,
  Compass,
  Home,
  ShieldCheck,
} from 'lucide-react';

const defaultRooms = {
  str: {
    id: 'str',
    title: 'STR MODELING',
    subtitle: 'Structural Modeling Division',
    icon: Layers,
    color: '#10b981',
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
  pt: {
    id: 'pt_reo',
    title: 'PT & REO',
    subtitle: 'Post-Tension & Reinforcement Division',
    icon: Zap,
    color: '#f59e0b',
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
    color: '#8b5cf6',
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
    color: '#3b82f6',
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

export default defaultRooms;
