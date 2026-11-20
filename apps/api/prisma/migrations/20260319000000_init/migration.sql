-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'WITHDRAWN', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CoupleRoomStatus" AS ENUM ('WAITING_PARTNER', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CoupleMemberRole" AS ENUM ('CREATOR', 'PARTNER');

-- CreateEnum
CREATE TYPE "CoupleMemberStatus" AS ENUM ('ACTIVE', 'LEFT');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'USED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
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

