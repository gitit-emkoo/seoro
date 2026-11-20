-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'WITHDRAWN', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CoupleRoomStatus" AS ENUM ('WAITING_PARTNER', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CoupleMemberRole" AS ENUM ('CREATOR', 'PARTNER');

-- CreateEnum
CREATE TYPE "CoupleMemberStatus" AS ENUM ('ACTIVE', 'LEFT');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'USED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "VerificationAvailability" AS ENUM ('AVAILABLE', 'LIMITED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "ScopeSelectionStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "ScopeAgreementStatus" AS ENUM ('PENDING', 'AGREED', 'INVALIDATED');

-- CreateEnum
CREATE TYPE "ProductCode" AS ENUM ('BASIC', 'EXTENDED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('AWAITING_PAYMENT', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('NOT_SUBMITTED', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_REVISION', 'RESUBMITTED', 'VERIFIED', 'UNVERIFIABLE');

-- CreateEnum
CREATE TYPE "DisclosureStatus" AS ENUM ('PENDING', 'CONSENTED', 'REVOKED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "identityVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoupleRoom" (
    "id" TEXT NOT NULL,
    "status" "CoupleRoomStatus" NOT NULL DEFAULT 'WAITING_PARTNER',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connectedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoupleRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoupleMember" (
    "id" TEXT NOT NULL,
    "coupleRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CoupleMemberRole" NOT NULL,
    "status" "CoupleMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoupleMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "coupleRoomId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "invitationCode" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationItem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "requiredDocumentType" TEXT,
    "verificationMethod" TEXT,
    "legalAvailabilityStatus" "VerificationAvailability" NOT NULL DEFAULT 'LIMITED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPlan" (
    "id" TEXT NOT NULL,
    "code" "ProductCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "perPersonAmount" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPlanItem" (
    "id" TEXT NOT NULL,
    "productPlanId" TEXT NOT NULL,
    "verificationItemId" TEXT NOT NULL,

    CONSTRAINT "ProductPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScopeSelection" (
    "id" TEXT NOT NULL,
    "coupleRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemIds" TEXT[],
    "planCode" "ProductCode",
    "status" "ScopeSelectionStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScopeSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScopeAgreement" (
    "id" TEXT NOT NULL,
    "coupleRoomId" TEXT NOT NULL,
    "agreedItemIds" TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ScopeAgreementStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agreedAt" TIMESTAMP(3),

    CONSTRAINT "ScopeAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScopeAgreementApproval" (
    "id" TEXT NOT NULL,
    "scopeAgreementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "approvedItemIds" TEXT[],
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScopeAgreementApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "coupleRoomId" TEXT NOT NULL,
    "productPlanId" TEXT NOT NULL,
    "scopeAgreementId" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "perPersonAmount" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentProvider" TEXT NOT NULL DEFAULT 'MOCK',
    "providerTransactionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "coupleRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verificationItemId" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "originalFileName" TEXT,
    "storedFileKey" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "note" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRecord" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'MANUAL_REVIEW',
    "officialCheckStatus" TEXT NOT NULL DEFAULT 'NONE',
    "adminReviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "resultSummary" TEXT,
    "revisionRequest" TEXT,
    "unverifiableReason" TEXT,
    "reviewerId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisclosureConsent" (
    "id" TEXT NOT NULL,
    "coupleRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "DisclosureStatus" NOT NULL DEFAULT 'PENDING',
    "consentedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisclosureConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "CoupleRoom_createdById_idx" ON "CoupleRoom"("createdById");

-- CreateIndex
CREATE INDEX "CoupleRoom_status_idx" ON "CoupleRoom"("status");

-- CreateIndex
CREATE INDEX "CoupleMember_coupleRoomId_idx" ON "CoupleMember"("coupleRoomId");

-- CreateIndex
CREATE INDEX "CoupleMember_userId_status_idx" ON "CoupleMember"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CoupleMember_coupleRoomId_userId_key" ON "CoupleMember"("coupleRoomId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_invitationCode_key" ON "Invitation"("invitationCode");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_coupleRoomId_idx" ON "Invitation"("coupleRoomId");

-- CreateIndex
CREATE INDEX "Invitation_createdById_idx" ON "Invitation"("createdById");

-- CreateIndex
CREATE INDEX "Invitation_status_expiresAt_idx" ON "Invitation"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationItem_code_key" ON "VerificationItem"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPlan_code_key" ON "ProductPlan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPlanItem_productPlanId_verificationItemId_key" ON "ProductPlanItem"("productPlanId", "verificationItemId");

-- CreateIndex
CREATE INDEX "ScopeSelection_coupleRoomId_idx" ON "ScopeSelection"("coupleRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "ScopeSelection_coupleRoomId_userId_key" ON "ScopeSelection"("coupleRoomId", "userId");

-- CreateIndex
CREATE INDEX "ScopeAgreement_coupleRoomId_status_idx" ON "ScopeAgreement"("coupleRoomId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ScopeAgreement_coupleRoomId_version_key" ON "ScopeAgreement"("coupleRoomId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ScopeAgreementApproval_scopeAgreementId_userId_key" ON "ScopeAgreementApproval"("scopeAgreementId", "userId");

-- CreateIndex
CREATE INDEX "Order_coupleRoomId_idx" ON "Order"("coupleRoomId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_userId_key" ON "Payment"("orderId", "userId");

-- CreateIndex
CREATE INDEX "Submission_userId_idx" ON "Submission"("userId");

-- CreateIndex
CREATE INDEX "Submission_coupleRoomId_idx" ON "Submission"("coupleRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_coupleRoomId_userId_verificationItemId_key" ON "Submission"("coupleRoomId", "userId", "verificationItemId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationRecord_submissionId_key" ON "VerificationRecord"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "DisclosureConsent_coupleRoomId_userId_key" ON "DisclosureConsent"("coupleRoomId", "userId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_actorId_idx" ON "AdminAuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "CoupleRoom" ADD CONSTRAINT "CoupleRoom_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoupleMember" ADD CONSTRAINT "CoupleMember_coupleRoomId_fkey" FOREIGN KEY ("coupleRoomId") REFERENCES "CoupleRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoupleMember" ADD CONSTRAINT "CoupleMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_coupleRoomId_fkey" FOREIGN KEY ("coupleRoomId") REFERENCES "CoupleRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPlanItem" ADD CONSTRAINT "ProductPlanItem_productPlanId_fkey" FOREIGN KEY ("productPlanId") REFERENCES "ProductPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPlanItem" ADD CONSTRAINT "ProductPlanItem_verificationItemId_fkey" FOREIGN KEY ("verificationItemId") REFERENCES "VerificationItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeSelection" ADD CONSTRAINT "ScopeSelection_coupleRoomId_fkey" FOREIGN KEY ("coupleRoomId") REFERENCES "CoupleRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeSelection" ADD CONSTRAINT "ScopeSelection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeAgreement" ADD CONSTRAINT "ScopeAgreement_coupleRoomId_fkey" FOREIGN KEY ("coupleRoomId") REFERENCES "CoupleRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeAgreementApproval" ADD CONSTRAINT "ScopeAgreementApproval_scopeAgreementId_fkey" FOREIGN KEY ("scopeAgreementId") REFERENCES "ScopeAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeAgreementApproval" ADD CONSTRAINT "ScopeAgreementApproval_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_coupleRoomId_fkey" FOREIGN KEY ("coupleRoomId") REFERENCES "CoupleRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_productPlanId_fkey" FOREIGN KEY ("productPlanId") REFERENCES "ProductPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_scopeAgreementId_fkey" FOREIGN KEY ("scopeAgreementId") REFERENCES "ScopeAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_coupleRoomId_fkey" FOREIGN KEY ("coupleRoomId") REFERENCES "CoupleRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_verificationItemId_fkey" FOREIGN KEY ("verificationItemId") REFERENCES "VerificationItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRecord" ADD CONSTRAINT "VerificationRecord_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRecord" ADD CONSTRAINT "VerificationRecord_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisclosureConsent" ADD CONSTRAINT "DisclosureConsent_coupleRoomId_fkey" FOREIGN KEY ("coupleRoomId") REFERENCES "CoupleRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisclosureConsent" ADD CONSTRAINT "DisclosureConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

