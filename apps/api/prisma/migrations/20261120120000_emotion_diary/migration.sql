-- CreateTable
CREATE TABLE "EmotionDiary" (
    "id" TEXT NOT NULL,
    "coupleRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryDate" TEXT NOT NULL,
    "emotionCode" TEXT NOT NULL,
    "triggerCodes" TEXT[],
    "comment" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmotionDiary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmotionDiary_coupleRoomId_entryDate_idx" ON "EmotionDiary"("coupleRoomId", "entryDate");

-- CreateIndex
CREATE INDEX "EmotionDiary_userId_idx" ON "EmotionDiary"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmotionDiary_coupleRoomId_userId_entryDate_key" ON "EmotionDiary"("coupleRoomId", "userId", "entryDate");

-- AddForeignKey
ALTER TABLE "EmotionDiary" ADD CONSTRAINT "EmotionDiary_coupleRoomId_fkey" FOREIGN KEY ("coupleRoomId") REFERENCES "CoupleRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmotionDiary" ADD CONSTRAINT "EmotionDiary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
