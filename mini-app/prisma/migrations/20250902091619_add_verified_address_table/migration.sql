-- CreateTable
CREATE TABLE "VerifiedAddress" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "VerifiedAddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerifiedAddress_address_key" ON "VerifiedAddress"("address");

-- AddForeignKey
ALTER TABLE "VerifiedAddress" ADD CONSTRAINT "VerifiedAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
