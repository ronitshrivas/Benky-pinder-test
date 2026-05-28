import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from './firebase';
import { slugify } from './utils';
import { Course, Retreat, GalleryItem, BlogPost, Payment, Inquiry, User, Order, BeckyPageContent } from '@/types';

type FirestoreRecord = Record<string, any>;

function normalizeUrl(url?: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (/^(mailto:|tel:|\/)/i.test(url)) return url;
  return `https://${url}`;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function normalizeLessons(value: unknown, courseId: string): Course['lessons'] {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    if (typeof item === 'string') {
      const url = item.trim();
      return {
        id: `${courseId}-lesson-${index + 1}`,
        title: `Lesson ${index + 1}`,
        description: '',
        videoUrl: url,
        duration: '',
        order: index + 1,
        isFree: false,
      };
    }

    const record = item && typeof item === 'object' ? (item as FirestoreRecord) : {};
    const videoSource =
      record.videoUrl ||
      record.videoURL ||
      record.videoLink ||
      record.lessonVideoUrl ||
      record.lessonUrl ||
      record.mediaUrl ||
      record.fileUrl ||
      record.url ||
      record.src ||
      record.playbackUrl ||
      record.downloadUrl ||
      (record.video && typeof record.video === 'object' ? record.video.url : record.video);
    const title = String(record.title || record.name || '').trim();
    const generatedId =
      String(record.id || record.lessonId || '').trim() ||
      `${courseId}-lesson-${index + 1}`;

    return {
      id: generatedId,
      title,
      description: String(record.description || '').trim(),
      videoUrl: String(videoSource || '').trim(),
      duration: String(record.duration || '').trim(),
      order: Number(record.order || index + 1),
      isFree: Boolean(record.isFree),
    };
  });
}

function toRetreatExperiences(value: unknown): Retreat['experiences'] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as FirestoreRecord;
      const title = String(record.title || '').trim();
      const description = String(record.description || '').trim();
      if (!title && !description) return null;
      return { title, description };
    })
    .filter((item): item is { title: string; description: string } => Boolean(item));
}

function toCourse(docData: FirestoreRecord, id: string): Course {
  const thumbnail = docData.thumbnail || docData.thumbnailUrl || '';
  const lessons = normalizeLessons(docData.lessons, id);
  const published = typeof docData.published === 'boolean' ? docData.published : docData.status !== 'draft';
  return {
    id,
    title: docData.title || '',
    slug: docData.slug || slugify(docData.title || id),
    description: docData.description || '',
    longDescription: docData.longDescription || docData.description || '',
    price: Number(docData.price || 0),
    currency: 'AUD',
    thumbnailUrl: docData.thumbnailUrl || thumbnail,
    thumbnail,
    previewVideoUrl: docData.previewVideoUrl,
    category: docData.category || 'yoga',
    level: docData.level || 'all-levels',
    duration: docData.duration || docData.totalDuration || '',
    totalDuration: docData.totalDuration || docData.duration || '',
    lessons,
    totalLessons: Number(docData.totalLessons || lessons.length),
    published,
    status: published ? 'published' : 'draft',
    featured: Boolean(docData.featured),
    createdAt: docData.createdAt || new Date().toISOString(),
    updatedAt: docData.updatedAt || docData.createdAt || new Date().toISOString(),
    enrolledCount: Number(docData.enrolledCount || 0),
  };
}

function toRetreat(docData: FirestoreRecord, id: string): Retreat {
  const thumbnail = docData.thumbnail || docData.thumbnailUrl || '';
  const images = Array.isArray(docData.images) ? docData.images : Array.isArray(docData.galleryImages) ? docData.galleryImages : [];
  const published = typeof docData.published === 'boolean' ? docData.published : docData.status !== 'draft';
  return {
    id,
    title: docData.title || '',
    slug: docData.slug || slugify(docData.title || id),
    subtitle: docData.subtitle || '',
    description: docData.description || '',
    longDescription: docData.longDescription || docData.description || '',
    location: docData.location || '',
    startDate: docData.startDate || '',
    endDate: docData.endDate || '',
    price: Number(docData.price || 0),
    currency: 'AUD',
    thumbnailUrl: docData.thumbnailUrl || thumbnail,
    thumbnail,
    galleryImages: images,
    images,
    inclusions: toStringArray(docData.inclusions),
    exclusions: toStringArray(docData.exclusions || docData.notIncluded || docData.notInclusions),
    highlights: toStringArray(docData.highlights),
    experiences: toRetreatExperiences(docData.experiences || docData.curatedExperiences || docData.itinerary),
    schedule: Array.isArray(docData.schedule) ? docData.schedule : [],
    earlyBirdOffer: docData.earlyBirdOffer || '',
    paymentNote: docData.paymentNote || '',
    depositNote: docData.depositNote || '',
    depositAmount: Number(docData.depositAmount || 0),
    depositDueDate: docData.depositDueDate || '',
    balanceDueDate: docData.balanceDueDate || '',
    published,
    status: published ? 'published' : 'draft',
    featured: Boolean(docData.featured),
    createdAt: docData.createdAt || new Date().toISOString(),
    updatedAt: docData.updatedAt || docData.createdAt || new Date().toISOString(),
  };
}

function toGalleryItem(docData: FirestoreRecord, id: string): GalleryItem {
  const thumbnail = docData.thumbnail || docData.thumbnailUrl || '';
  return {
    id,
    type: docData.type || 'image',
    url: docData.url || thumbnail,
    thumbnailUrl: docData.thumbnailUrl || thumbnail,
    thumbnail,
    title: docData.title || '',
    description: docData.description,
    location: docData.location,
    category: docData.category || 'gallery',
    order: Number(docData.order || 0),
    published: docData.published !== false,
    createdAt: docData.createdAt || new Date().toISOString(),
  };
}

function toBlogPost(docData: FirestoreRecord, id: string): BlogPost {
  const thumbnail = docData.thumbnail || docData.coverImageUrl || '';
  const published = typeof docData.published === 'boolean' ? docData.published : docData.status !== 'draft';
  return {
    id,
    title: docData.title || '',
    slug: docData.slug || slugify(docData.title || id),
    excerpt: docData.excerpt || '',
    content: docData.content || '',
    coverImageUrl: docData.coverImageUrl || thumbnail,
    thumbnail,
    category: docData.category || 'yoga',
    tags: Array.isArray(docData.tags) ? docData.tags : [],
    published,
    status: published ? 'published' : 'draft',
    author: docData.author || 'Becky Pinder',
    publishedAt: docData.publishedAt || docData.createdAt || new Date().toISOString(),
    createdAt: docData.createdAt || new Date().toISOString(),
    updatedAt: docData.updatedAt || docData.createdAt || new Date().toISOString(),
  };
}

function toUser(docData: FirestoreRecord, id: string): User {
  return {
    uid: docData.uid || id,
    email: docData.email || '',
    displayName: docData.displayName || '',
    photoURL: docData.photoURL,
    phone: docData.phone,
    bio: docData.bio,
    role: docData.role || 'user',
    emailVerified: Boolean(docData.emailVerified),
    createdAt: docData.createdAt || new Date().toISOString(),
    updatedAt: docData.updatedAt || docData.createdAt || new Date().toISOString(),
    purchasedCourses: Array.isArray(docData.purchasedCourses) ? docData.purchasedCourses : [],
    registeredRetreats: Array.isArray(docData.registeredRetreats) ? docData.registeredRetreats : [],
  };
}

function normalizeOrder(docData: FirestoreRecord, docId: string): Order {
  const invoiceUrl = normalizeUrl(docData.invoiceUrl ?? docData.squareReceiptUrl);
  return {
    id: docId,
    ...docData,
    invoiceUrl,
  } as Order;
}

// ═══════════════════════════════════════════════════════════
// COURSES
// ═══════════════════════════════════════════════════════════
export async function getCourses(publishedOnly = true): Promise<Course[]> {
  const q = publishedOnly
    ? query(collection(db, 'courses'), where('published', '==', true), orderBy('createdAt', 'desc'))
    : query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => toCourse(doc.data() as FirestoreRecord, doc.id));
}

export async function getCourse(id: string): Promise<Course | null> {
  const docRef = doc(db, 'courses', id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? toCourse(docSnap.data() as FirestoreRecord, docSnap.id) : null;
}

export async function createCourse(data: FirestoreRecord): Promise<string> {
  const lessons = normalizeLessons(data.lessons, data.slug || slugify(data.title || 'course'));
  const docRef = await addDoc(collection(db, 'courses'), {
    slug: data.slug || slugify(data.title || 'course'),
    ...data,
    title: data.title || '',
    description: data.description || '',
    longDescription: data.longDescription || data.description || '',
    thumbnailUrl: data.thumbnailUrl || data.thumbnail || '',
    thumbnail: data.thumbnail || data.thumbnailUrl || '',
    duration: data.duration || data.totalDuration || '',
    totalDuration: data.totalDuration || data.duration || '',
    published: typeof data.published === 'boolean' ? data.published : data.status !== 'draft',
    status: data.status || (data.published === false ? 'draft' : 'published'),
    lessons,
    totalLessons: Number(data.totalLessons || lessons.length),
    enrolledCount: Number(data.enrolledCount || 0),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return docRef.id;
}

export async function updateCourse(id: string, data: FirestoreRecord): Promise<void> {
  const lessons = normalizeLessons(data.lessons, id);
  await updateDoc(doc(db, 'courses', id), {
    ...data,
    slug: data.slug || (data.title ? slugify(data.title) : undefined),
    thumbnailUrl: data.thumbnailUrl || data.thumbnail,
    thumbnail: data.thumbnail || data.thumbnailUrl,
    published: typeof data.published === 'boolean' ? data.published : data.status !== 'draft',
    status: data.status || (data.published === false ? 'draft' : 'published'),
    duration: data.duration || data.totalDuration,
    totalDuration: data.totalDuration || data.duration,
    lessons,
    totalLessons: Number(data.totalLessons || lessons.length),
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteCourse(id: string): Promise<void> {
  await deleteDoc(doc(db, 'courses', id));
}

export const addCourse = createCourse;

// ═══════════════════════════════════════════════════════════
// RETREATS
// ═══════════════════════════════════════════════════════════
export async function getRetreats(publishedOnly = true): Promise<Retreat[]> {
  const q = publishedOnly
    ? query(collection(db, 'retreats'), where('published', '==', true), orderBy('startDate', 'asc'))
    : query(collection(db, 'retreats'), orderBy('startDate', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => toRetreat(doc.data() as FirestoreRecord, doc.id));
}

export async function getRetreat(id: string): Promise<Retreat | null> {
  const docRef = doc(db, 'retreats', id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? toRetreat(docSnap.data() as FirestoreRecord, docSnap.id) : null;
}

export async function createRetreat(data: FirestoreRecord): Promise<string> {
  const docRef = await addDoc(collection(db, 'retreats'), {
    slug: data.slug || slugify(data.title || 'retreat'),
    ...data,
    title: data.title || '',
    subtitle: data.subtitle || '',
    description: data.description || '',
    longDescription: data.longDescription || data.description || '',
    thumbnailUrl: data.thumbnailUrl || data.thumbnail || '',
    thumbnail: data.thumbnail || data.thumbnailUrl || '',
    galleryImages: Array.isArray(data.galleryImages) ? data.galleryImages : Array.isArray(data.images) ? data.images : [],
    images: Array.isArray(data.images) ? data.images : Array.isArray(data.galleryImages) ? data.galleryImages : [],
    inclusions: toStringArray(data.inclusions),
    exclusions: toStringArray(data.exclusions || data.notIncluded || data.notInclusions),
    highlights: toStringArray(data.highlights),
    experiences: toRetreatExperiences(data.experiences || data.curatedExperiences || data.itinerary),
    earlyBirdOffer: data.earlyBirdOffer || '',
    paymentNote: data.paymentNote || '',
    depositNote: data.depositNote || '',
    depositAmount: Number(data.depositAmount || 0),
    depositDueDate: data.depositDueDate || '',
    balanceDueDate: data.balanceDueDate || '',
    published: typeof data.published === 'boolean' ? data.published : data.status !== 'draft',
    status: data.status || (data.published === false ? 'draft' : 'published'),
    featured: Boolean(data.featured),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return docRef.id;
}

export async function updateRetreat(id: string, data: FirestoreRecord): Promise<void> {
  await updateDoc(doc(db, 'retreats', id), {
    ...data,
    slug: data.slug || (data.title ? slugify(data.title) : undefined),
    subtitle: data.subtitle || '',
    thumbnailUrl: data.thumbnailUrl || data.thumbnail,
    thumbnail: data.thumbnail || data.thumbnailUrl,
    galleryImages: Array.isArray(data.galleryImages) ? data.galleryImages : Array.isArray(data.images) ? data.images : undefined,
    images: Array.isArray(data.images) ? data.images : Array.isArray(data.galleryImages) ? data.galleryImages : undefined,
    inclusions: toStringArray(data.inclusions),
    exclusions: toStringArray(data.exclusions || data.notIncluded || data.notInclusions),
    highlights: toStringArray(data.highlights),
    experiences: toRetreatExperiences(data.experiences || data.curatedExperiences || data.itinerary),
    earlyBirdOffer: data.earlyBirdOffer || '',
    paymentNote: data.paymentNote || '',
    depositNote: data.depositNote || '',
    depositAmount: Number(data.depositAmount || 0),
    depositDueDate: data.depositDueDate || '',
    balanceDueDate: data.balanceDueDate || '',
    published: typeof data.published === 'boolean' ? data.published : data.status !== 'draft',
    status: data.status || (data.published === false ? 'draft' : 'published'),
    featured: Boolean(data.featured),
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteRetreat(id: string): Promise<void> {
  await deleteDoc(doc(db, 'retreats', id));
}

export const addRetreat = createRetreat;

// ═══════════════════════════════════════════════════════════
// GALLERY
// ═══════════════════════════════════════════════════════════
export async function getGalleryItems(publishedOnly = true): Promise<GalleryItem[]> {
  const q = publishedOnly
    ? query(collection(db, 'gallery'), where('published', '==', true), orderBy('order', 'asc'))
    : query(collection(db, 'gallery'), orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => toGalleryItem(doc.data() as FirestoreRecord, doc.id));
}

export async function createGalleryItem(data: FirestoreRecord): Promise<string> {
  const docRef = await addDoc(collection(db, 'gallery'), {
    ...data,
    thumbnailUrl: data.thumbnailUrl || data.thumbnail || '',
    thumbnail: data.thumbnail || data.thumbnailUrl || '',
    published: data.published !== false,
    order: Number(data.order || 0),
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
}

export async function updateGalleryItem(id: string, data: FirestoreRecord): Promise<void> {
  await updateDoc(doc(db, 'gallery', id), {
    ...data,
    thumbnailUrl: data.thumbnailUrl || data.thumbnail,
    thumbnail: data.thumbnail || data.thumbnailUrl,
  });
}

export async function deleteGalleryItem(id: string): Promise<void> {
  await deleteDoc(doc(db, 'gallery', id));
}

export const addGalleryItem = createGalleryItem;

// ═══════════════════════════════════════════════════════════
// BLOG
// ═══════════════════════════════════════════════════════════
export async function getBlogPosts(publishedOnly = true): Promise<BlogPost[]> {
  const q = publishedOnly
    ? query(collection(db, 'blog'), where('published', '==', true), orderBy('publishedAt', 'desc'))
    : query(collection(db, 'blog'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => toBlogPost(doc.data() as FirestoreRecord, doc.id));
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const q = query(collection(db, 'blog'), where('slug', '==', slug), limit(1));
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : toBlogPost(snapshot.docs[0].data() as FirestoreRecord, snapshot.docs[0].id);
}

export async function createBlogPost(data: FirestoreRecord): Promise<string> {
  const docRef = await addDoc(collection(db, 'blog'), {
    slug: data.slug || slugify(data.title || 'post'),
    ...data,
    title: data.title || '',
    excerpt: data.excerpt || '',
    content: data.content || '',
    coverImageUrl: data.coverImageUrl || data.thumbnail || '',
    thumbnail: data.thumbnail || data.coverImageUrl || '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    published: typeof data.published === 'boolean' ? data.published : data.status !== 'draft',
    status: data.status || (data.published === false ? 'draft' : 'published'),
    author: data.author || 'Becky Pinder',
    publishedAt: data.publishedAt || new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return docRef.id;
}

export async function updateBlogPost(id: string, data: FirestoreRecord): Promise<void> {
  await updateDoc(doc(db, 'blog', id), {
    ...data,
    slug: data.slug || (data.title ? slugify(data.title) : undefined),
    coverImageUrl: data.coverImageUrl || data.thumbnail,
    thumbnail: data.thumbnail || data.coverImageUrl,
    published: typeof data.published === 'boolean' ? data.published : data.status !== 'draft',
    status: data.status || (data.published === false ? 'draft' : 'published'),
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteBlogPost(id: string): Promise<void> {
  await deleteDoc(doc(db, 'blog', id));
}

// ═══════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════
export async function getPayments(): Promise<Payment[]> {
  const q = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Payment));
}

export async function getUserPayments(userId: string): Promise<Payment[]> {
  const q = query(collection(db, 'payments'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Payment));
}

export async function createPayment(data: Omit<Payment, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'payments'), data);
  return docRef.id;
}

export async function getAllOrders(): Promise<Order[]> {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => normalizeOrder(doc.data(), doc.id));
}

export async function getUserPurchases(userId: string): Promise<Order[]> {
  const q = query(collection(db, 'orders'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => normalizeOrder(doc.data(), doc.id));
}

export async function getAdminStats(): Promise<{
  totalUsers: number;
  totalRevenue: number;
  totalCourses: number;
  totalRetreats: number;
  totalOrders: number;
  totalInquiries: number;
  recentOrders: Order[];
}> {
  const [usersSnap, coursesSnap, retreatsSnap, ordersSnap, inquiriesSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'courses')),
    getDocs(collection(db, 'retreats')),
    getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'))),
    getDocs(collection(db, 'inquiries')),
  ]);

  const recentOrders = ordersSnap.docs.slice(0, 5).map((doc) => normalizeOrder(doc.data(), doc.id));
  const totalRevenue = ordersSnap.docs
    .filter((doc) => doc.data().status === 'completed')
    .reduce((sum, doc) => sum + Number(doc.data().amount || 0), 0);

  return {
    totalUsers: usersSnap.size,
    totalRevenue,
    totalCourses: coursesSnap.size,
    totalRetreats: retreatsSnap.size,
    totalOrders: ordersSnap.size,
    totalInquiries: inquiriesSnap.size,
    recentOrders,
  };
}

// ═══════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════
export async function getUsers(): Promise<User[]> {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => toUser(doc.data() as FirestoreRecord, doc.id));
}

export async function grantCourseAccess(userId: string, courseId: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    purchasedCourses: arrayUnion(courseId),
    updatedAt: new Date().toISOString(),
  });
}

export const getAllUsers = getUsers;

export async function updateUserRole(uid: string, role: 'user' | 'admin'): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    role,
    updatedAt: new Date().toISOString(),
  });
}

export async function updateUserProfile(uid: string, data: Partial<Pick<User, 'displayName' | 'phone' | 'bio'>>): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

const DEFAULT_BECKY_CONTENT: BeckyPageContent = {
  bioContent: [
    'As a dedicated practitioner of Yoga for 35 years and a teacher of Yoga for 15 years I have come to experience first-hand the transformative potency of Yoga both in my own life and in the lives of others.',
    'The unique gift of Yoga is that the benefits trickle down through every layer of our being, physical, mental, emotional and spiritual.',
    'Over the decades I have been very fortunate to have practiced with many wonderful Yoga, meditation and movement teachers in extensive trainings both in Australia and internationally. My own approach to teaching is grounded in the simple aspiration to feel great in the body. I have come to understand that there is a strong connection between how we move and hold ourselves. I have come to understand that there is a strong connection between how we move and express in our bodies to the energy we broadcast out to the world.',
    'My professional life also includes decades of experience as a hair and makeup artist where I worked both in the commercial and event world as well as in some of Sydneys most prestigious salons. With a client list that includes women from all walks of life from working mums to CEOs and entrepreneurs to film and television personalities.',
    'Through both Yoga and my experience in the beauty world I have come to learn that true radiance is not something you apply or put on it is something you embody. My intention for the retreat and travel experiences I offer along with my online classes is to share distilled empowering practices in an environment where the qualities of self-acceptance and self-confidence can thrive. Whether in some far flung location or virtually.',
    'I flavour everything with the ethos that life is to be lived fully, abundantly and with as much joy as we can squeeze in!',
  ].join('\n\n'),
};

function normalizeBeckyContent(data: FirestoreRecord | null | undefined): BeckyPageContent {
  const input = data || {};
  return {
    bioContent: String(input.bioContent || DEFAULT_BECKY_CONTENT.bioContent).trim(),
  };
}

export const getCourseById = getCourse;

export async function getBeckyPageContent(): Promise<BeckyPageContent> {
  const snap = await getDoc(doc(db, 'siteContent', 'becky'));
  return normalizeBeckyContent(snap.exists() ? (snap.data() as FirestoreRecord) : null);
}

export async function updateBeckyPageContent(data: BeckyPageContent): Promise<void> {
  await setDoc(doc(db, 'siteContent', 'becky'), {
    ...data,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function updateLessonProgress(uid: string, courseId: string, lessonId: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    [`lessonProgress.${courseId}`]: arrayUnion(lessonId),
    updatedAt: new Date().toISOString(),
  } as any);
}

export const addBlogPost = createBlogPost;

// ═══════════════════════════════════════════════════════════
// INQUIRIES
// ═══════════════════════════════════════════════════════════
export async function getInquiries(): Promise<Inquiry[]> {
  const q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Inquiry));
}

export async function createInquiry(data: Omit<Inquiry, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'inquiries'), data);
  return docRef.id;
}

// ═══════════════════════════════════════════════════════════
// COMPLIMENTARY VIDEO  (Inner Circle)
// ═══════════════════════════════════════════════════════════
import { ComplimentaryVideo } from '@/types';

export async function getComplimentaryVideo(): Promise<ComplimentaryVideo | null> {
  const snap = await getDoc(doc(db, 'siteContent', 'complimentaryVideo'));
  if (!snap.exists()) return null;
  const d = snap.data() as FirestoreRecord;
  return {
    videoUrl: d.videoUrl || '',
    title: d.title || '',
    description: d.description || '',
    published: Boolean(d.published),
    updatedAt: d.updatedAt || new Date().toISOString(),
  };
}

// ─── Subscriber token helpers (client-side, used on the watch page) ───────────
export async function getSubscriberByToken(token: string) {
  const q = query(collection(db, 'subscribers'), where('accessToken', '==', token), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0].data() as FirestoreRecord;
  return { docId: snap.docs[0].id, ...d };
}

export async function markSubscriberWatched(docId: string): Promise<void> {
  await updateDoc(doc(db, 'subscribers', docId), { hasWatched: true });
}
