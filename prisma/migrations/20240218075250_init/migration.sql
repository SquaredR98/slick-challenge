-- CreateTable
CREATE TABLE "Transactions" (
    "TransactionId" SERIAL NOT NULL,
    "UserId" TEXT NOT NULL,
    "Amount" DOUBLE PRECISION NOT NULL,
    "Timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transactions_pkey" PRIMARY KEY ("TransactionId")
);
