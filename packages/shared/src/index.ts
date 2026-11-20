export const APP_NAME = '서로';
export const APP_NAME_EN = 'SEORO';

export type CoupleRoomStatus = 'WAITING_PARTNER' | 'ACTIVE' | 'INACTIVE';
export type ProductCode = 'BASIC' | 'EXTENDED';

export type ScopeSelectionStatus = 'DRAFT' | 'SUBMITTED';
export type ScopeAgreementStatus = 'PENDING' | 'AGREED' | 'INVALIDATED';

export type OrderStatus =
  | 'AWAITING_PAYMENT'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentStatus = 'UNPAID' | 'PAID' | 'CANCELLED' | 'REFUNDED';

export type SubmissionStatus =
  | 'NOT_SUBMITTED'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'NEEDS_REVISION'
  | 'RESUBMITTED'
  | 'VERIFIED'
  | 'UNVERIFIABLE';

export type DisclosureStatus = 'PENDING' | 'CONSENTED' | 'REVOKED';

export type VerificationAvailability = 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE';

export const API_PATHS = {
  health: '/api/health',
  register: '/api/auth/register',
  login: '/api/auth/login',
  me: '/api/auth/me',
  onboardingCards: '/api/onboarding/cards',
  onboardingComplete: '/api/onboarding/complete',
  onboardingNext: '/api/onboarding/next',
  coupleMe: '/api/couples/me',
  coupleCreate: '/api/couples',
  coupleJoin: '/api/couples/join',
  coupleRegenerateInvite: '/api/couples/invites/regenerate',
  verificationItems: '/api/verification-items',
  productPlans: '/api/product-plans',
  productPlansEligible: '/api/product-plans/eligible',
  scopeMe: '/api/scope/me',
  scopeSave: '/api/scope',
  scopeReset: '/api/scope/reset',
  scopeCompare: '/api/scope/compare',
  scopeApprove: '/api/scope/approve',
  ordersCurrent: '/api/orders/current',
  ordersCreate: '/api/orders',
  paymentsMockPay: '/api/payments/mock-pay',
  submissionsMe: '/api/submissions/me',
  submissionsUpload: '/api/submissions/upload',
  reportsMe: '/api/reports/me',
  reportsMutual: '/api/reports/mutual',
  disclosureConsent: '/api/disclosure/consent',
  disclosureMe: '/api/disclosure/me',
  promises: '/api/promises',
  promisesVerify: '/api/promises/verify',
} as const;

export const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = {
  NOT_SUBMITTED: '미제출',
  SUBMITTED: '제출 완료',
  UNDER_REVIEW: '검토 대기',
  NEEDS_REVISION: '보완 요청',
  RESUBMITTED: '재제출 완료',
  VERIFIED: '확인 완료',
  UNVERIFIABLE: '확인 불가',
};
