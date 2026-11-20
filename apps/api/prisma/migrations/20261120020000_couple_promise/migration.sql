-- CreateEnum
CREATE TYPE "CouplePromiseStatus" AS ENUM ('AWAITING_PARTNER', 'AWAITING_AUTHOR', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PromiseCategory" AS ENUM ('MONEY', 'CHORES', 'CONFLICT', 'FAMILY', 'FUTURE', 'FREE');

-- CreateTable
CREATE TABLE "CouplePromise" (
    "id" TEXT NOT NULL,
    "coupleRoomId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "category" "PromiseCategory" NOT NULL DEFAULT 'FREE',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "condition" TEXT NOT NULL DEFAULT '',
    "status" "CouplePromiseStatus" NOT NULL DEFAULT 'AWAITING_PARTNER',
    "authorSignature" TEXT,
    "partnerSignature" TEXT,
    "authorSignedAt" TIMESTAMP(3),
    "partnerSignedAt" TIMESTAMP(3),
    "documentCode" TEXT,
    "contentHash" TEXT,
    "completedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CouplePromise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CouplePromise_documentCode_key" ON "CouplePromise"("documentCode");

-- CreateIndex
CREATE INDEX "CouplePromise_coupleRoomId_status_idx" ON "CouplePromise"("coupleRoomId", "status");

-- CreateIndex
CREATE INDEX "CouplePromise_authorId_idx" ON "CouplePromise"("authorId");

-- CreateIndex
CREATE INDEX "CouplePromise_partnerId_idx" ON "CouplePromise"("partnerId");

-- AddForeignKey
ALTER TABLE "CouplePromise" ADD CONSTRAINT "CouplePromise_coupleRoomId_fkey" FOREIGN KEY ("coupleRoomId") REFERENCES "CoupleRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouplePromise" ADD CONSTRAINT "CouplePromise_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouplePromise" ADD CONSTRAINT "CouplePromise_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
