// ═══════════════════════════════════════════════════════════
// BECKY PINDER YOGA — TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phone?: string;
  bio?: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  purchasedCourses: string[];
  registeredRetreats: string[];
}

export type UserData = User;

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  longDescription: string;
  price: number;
  currency: string;
  thumbnailUrl: string;
  thumbnail: string;
  previewVideoUrl?: string;
  category: 'yoga' | 'meditation' | 'wellness' | 'breathwork';
  level: 'beginner' | 'intermediate' | 'advanced' | 'all-levels';
  duration: string;
  totalDuration: string;
  lessons: Lesson[];
  totalLessons: number;
  published: boolean;
  status: 'published' | 'draft';
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  enrolledCount: number;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  duration: string;
  order: number;
  isFree: boolean;
}

export interface RetreatExperience {
  title: string;
  description: string;
}

export interface Retreat {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  longDescription: string;
  location: string;
  startDate: string;
  endDate: string;
  price: number;
  currency: string;
  thumbnailUrl: string;
  thumbnail: string;
  galleryImages: string[];
  images: string[];
  inclusions: string[];
  exclusions: string[];
  highlights: string[];
  experiences: RetreatExperience[];
  schedule: ScheduleDay[];
  earlyBirdOffer: string;
  paymentNote: string;
  depositNote: string;
  depositAmount: number;
  depositDueDate: string;
  balanceDueDate: string;
  published: boolean;
  status: 'published' | 'draft';
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleDay {
  day: number;
  title: string;
  activities: string[];
}

export interface GalleryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl: string;
  thumbnail: string;
  title: string;
  description?: string;
  location?: string;
  category: string;
  order: number;
  published: boolean;
  createdAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  thumbnail: string;
  category: string;
  tags: string[];
  published: boolean;
  status: 'published' | 'draft';
  author?: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  type: 'course' | 'retreat';
  itemId: string;
  itemTitle: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  squarePaymentId: string;
  squareOrderId?: string;
  invoiceSent: boolean;
  invoiceUrl?: string;
  paymentLabel?: string;
  createdAt: string;
}

export interface Order extends Payment {
  invoiceUrl?: string;
  squareReceiptUrl?: string;
  itemThumbnail?: string;
  itemVideoUrl?: string;
  progress?: number;
}

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied';
  createdAt: string;
}

export interface Subscriber {
  id: string;
  email: string;
  subscribedAt: string;
  active: boolean;
  accessToken: string;       // magic-link token — never expires
  hasWatched: boolean;       // true once the guest opens the watch page
}

export interface ComplimentaryVideo {
  videoUrl: string;          // YouTube/Vimeo embed or direct URL
  title: string;
  description: string;
  published: boolean;
  updatedAt: string;
}

export interface OTPRecord {
  email: string;
  otp: string;
  expiresAt: string;
  verified: boolean;
}

export interface DashboardStats {
  totalUsers: number;
  totalRevenue: number;
  totalCourses: number;
  totalRetreats: number;
  totalPayments: number;
  recentPayments: Payment[];
  monthlyRevenue: { month: string; amount: number }[];
}

export interface BeckyPageContent {
  bioContent: string;
}
