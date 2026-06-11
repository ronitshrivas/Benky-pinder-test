import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number, currency: string = 'AUD'): string {
  return new Intl.NumberFormat(currency === 'AUD' ? 'en-AU' : 'en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Returns true if the user currently has active (non-expired) access to a course.
 * - If courseExpiry is missing for that course, the user is grandfathered in (lifetime access).
 * - If an expiry date exists and it is in the past, access is denied.
 */
export function hasCourseAccess(
  purchasedCourses: string[] | undefined,
  courseExpiry: Record<string, string> | undefined,
  courseId: string,
): boolean {
  if (!purchasedCourses?.includes(courseId)) return false;
  const expiry = courseExpiry?.[courseId];
  if (!expiry) return true; // grandfathered – no expiry recorded
  return new Date(expiry) > new Date();
}

/**
 * Returns a human-readable label for when course access expires.
 * Returns null if the user doesn't own the course or is grandfathered.
 */
export function getCourseExpiryLabel(
  purchasedCourses: string[] | undefined,
  courseExpiry: Record<string, string> | undefined,
  courseId: string,
): string | null {
  if (!purchasedCourses?.includes(courseId)) return null;
  const expiry = courseExpiry?.[courseId];
  if (!expiry) return null; // grandfathered
  return formatDate(expiry);
}
