/**
 * Landing Page Content Data
 */

export interface NavItem {
  label: string;
  sectionId: string;
}

export interface ProcessStep {
  id: string;
  number: string;
  title: string;
  description: string;
  icon: string;
  imageUrl: string;
}

export interface FacilityItem {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  size: 'large' | 'small';
}

export interface SystemFeature {
  title: string;
  description: string;
  icon: string;
}

export const LANDING_DATA = {
  navItems: [
    { label: 'Trang chủ', sectionId: 'hero' },
    { label: 'Giới thiệu', sectionId: 'about' },
    { label: 'Quy trình', sectionId: 'process' },
    { label: 'Cơ sở vật chất', sectionId: 'facilities' },
    { label: 'Hệ thống', sectionId: 'system' }
  ],

  hero: {
    eyebrow: 'TRUNG TÂM LỌC MÁU',
    title: 'Chăm sóc an toàn trong từng phiên lọc máu',
    description: 'Giải pháp quản lý và hỗ trợ theo dõi quá trình điều trị tại Trung tâm Lọc máu.',
    ctaPrimary: 'Đăng nhập hệ thống',
    ctaSecondary: 'Tìm hiểu quy trình',
    // Medical abstract or professional monitoring patient
    imageUrl: 'https://images.unsplash.com/photo-1551076805-e1869033e561?q=80&w=1200&auto=format&fit=crop',
    imageCaption: 'Ảnh minh họa: Hoạt động theo dõi y tế'
  },

  about: {
    title: 'Về Trung tâm Lọc máu',
    paragraphs: [
      'Trung tâm Lọc máu chuyên cung cấp dịch vụ điều trị thay thế thận bằng phương pháp chạy thận nhân tạo (hemodialysis) cho người bệnh suy thận mạn giai đoạn cuối.',
      'Đội ngũ y tế tại Trung tâm bao gồm bác sĩ chuyên khoa, điều dưỡng và kỹ thuật viên được đào tạo chuyên sâu, đảm bảo theo dõi sát sao tình trạng người bệnh trong suốt quá trình điều trị.',
      'Trung tâm hướng đến việc xây dựng môi trường điều trị an toàn, đảm bảo chất lượng chăm sóc và hỗ trợ người bệnh trong hành trình điều trị lâu dài.'
    ],
    imageUrl1: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800&auto=format&fit=crop',
    imageUrl2: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=800&auto=format&fit=crop',
    caption: 'Ảnh minh họa: Không gian y tế và trang thiết bị'
  },

  processTitle: 'Quy trình lọc máu',
  processSubtitle: 'Tổng quan các bước trong một phiên chạy thận nhân tạo.',

  processSteps: [
    {
      id: 'step1',
      number: '01',
      title: 'Tiếp nhận và chuẩn bị',
      description: 'Kiểm tra thông tin hồ sơ bệnh án, xác nhận chỉ định và chuẩn bị vị trí lọc máu cho người bệnh.',
      icon: 'pi pi-id-card',
      imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1000&auto=format&fit=crop'
    },
    {
      id: 'step2',
      number: '02',
      title: 'Đánh giá trước phiên lọc',
      description: 'Đo lường và ghi nhận các chỉ số sinh tồn ban đầu như huyết áp, cân nặng, nhịp tim trước khi tiến hành.',
      icon: 'pi pi-chart-bar',
      imageUrl: 'https://images.unsplash.com/photo-1551076805-e1869033e561?q=80&w=1000&auto=format&fit=crop'
    },
    {
      id: 'step3',
      number: '03',
      title: 'Chuẩn bị đường vào mạch máu',
      description: 'Điều dưỡng tiến hành các thao tác chuyên môn để thiết lập kết nối an toàn với vòng tuần hoàn ngoài cơ thể.',
      icon: 'pi pi-link',
      imageUrl: 'https://images.unsplash.com/photo-1581056771107-24ca5f033842?q=80&w=1000&auto=format&fit=crop'
    },
    {
      id: 'step4',
      number: '04',
      title: 'Kết nối với hệ thống',
      description: 'Máu được dẫn qua hệ thống vòng tuần hoàn ngoài cơ thể và màng lọc nhân tạo (Dialyzer).',
      icon: 'pi pi-cog',
      imageUrl: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?q=80&w=1000&auto=format&fit=crop'
    },
    {
      id: 'step5',
      number: '05',
      title: 'Tiến hành và theo dõi',
      description: 'Trong suốt quá trình lọc (3-4 giờ), nhân viên y tế liên tục theo dõi các thông số trên máy và sinh hiệu của người bệnh.',
      icon: 'pi pi-heart-fill',
      imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1000&auto=format&fit=crop'
    },
    {
      id: 'step6',
      number: '06',
      title: 'Kết thúc và đánh giá',
      description: 'Hoàn tất vòng tuần hoàn, cầm máu, đánh giá lại các chỉ số sinh tồn và ghi nhận kết quả phiên điều trị.',
      icon: 'pi pi-check-circle',
      imageUrl: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?q=80&w=1000&auto=format&fit=crop'
    }
  ],
  processDisclaimer: 'Lưu ý: Quy trình thực tế có thể được điều chỉnh linh hoạt bởi bác sĩ điều trị tùy thuộc vào tình trạng lâm sàng cụ thể của từng người bệnh.',

  video: {
    title: 'Tìm hiểu về quá trình lọc máu',
    description: 'Quy trình chạy thận nhân tạo và vai trò của hệ thống theo dõi điều trị.',
    youtubeUrl: 'https://www.youtube.com/watch?v=pAdtb1ui8YU',
    thumbnailUrl: 'https://img.youtube.com/vi/pAdtb1ui8YU/maxresdefault.jpg',
    caption: 'Dữ liệu giới thiệu phục vụ mục đích minh họa'
  },

  facilitiesTitle: 'Không gian điều trị',
  facilities: [
    {
      id: 'fac1',
      title: 'Phòng lọc máu',
      caption: 'Thông tin minh họa',
      imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1200&auto=format&fit=crop',
      size: 'large'
    },
    {
      id: 'fac2',
      title: 'Thiết bị lọc máu',
      caption: 'Thông tin minh họa',
      imageUrl: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?q=80&w=600&auto=format&fit=crop',
      size: 'small'
    },
    {
      id: 'fac3',
      title: 'Khu vực theo dõi',
      caption: 'Thông tin minh họa',
      imageUrl: 'https://images.unsplash.com/photo-1581056771107-24ca5f033842?q=80&w=600&auto=format&fit=crop',
      size: 'small'
    }
  ],

  systemTitle: 'Hệ thống quản lý và hỗ trợ ra quyết định',
  systemDescription: 'Hệ thống hỗ trợ nhân viên y tế quản lý và theo dõi thông tin liên quan đến quá trình điều trị.',
  systemNote: 'Giao diện mô phỏng - Dữ liệu minh họa',
  
  supportTitle: 'Hỗ trợ ra quyết định',
  supportFeatures: [
    {
      title: 'Tổng hợp thông tin người bệnh',
      description: 'Lưu trữ hồ sơ điện tử, tiền sử bệnh lý và phác đồ điều trị của từng người bệnh.',
      icon: 'pi pi-folder-open'
    },
    {
      title: 'Theo dõi diễn biến trong phiên lọc',
      description: 'Biểu diễn trực quan xu hướng thay đổi của các chỉ số sinh tồn và thông số phiên lọc.',
      icon: 'pi pi-chart-line'
    },
    {
      title: 'Hỗ trợ nhân viên y tế',
      description: 'Cung cấp các công cụ cảnh báo sớm và tổng hợp dữ liệu giúp nhân viên y tế quản lý hiệu quả hơn.',
      icon: 'pi pi-shield'
    }
  ],
  supportDisclaimer: 'Hệ thống cung cấp thông tin hỗ trợ quản lý và theo dõi; quyết định chuyên môn thuộc về nhân viên y tế có thẩm quyền.',

  cta: {
    title: 'Sẵn sàng truy cập hệ thống',
    description: 'Dành cho nhân viên y tế được cấp quyền truy cập.',
    button: 'Đăng nhập hệ thống'
  },

  footer: {
    brand: 'LocMau Center',
    tagline: 'Hệ thống quản lý và hỗ trợ ra quyết định phục vụ Trung tâm Lọc máu.',
    copyright: 'Đồ án tốt nghiệp 2026. Thông tin trên website mang tính minh họa.',
    contact: {
      address: 'Thông tin minh họa - TP.HCM',
      phone: '(028) 000 0000',
      email: 'demo@locmau.edu.vn'
    }
  }
};
