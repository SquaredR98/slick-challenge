const fs = require('fs');
const { faker } = require('@faker-js/faker');

const numTransactions = 10000000;
const uniqueUserProbability = 0.4;

const existingUsers = new Array(Math.ceil(numTransactions * (1 - uniqueUserProbability)))
  .fill(null)
  .map(() => faker.string.uuid());

const outputStream = fs.createWriteStream('seed-data.csv');


for (let index = 0; index < numTransactions; index++) {
  const transaction = {
    TransactionId: index,
    UserId: Math.random() < uniqueUserProbability ? faker.string.uuid() : existingUsers[Math.floor(Math.random() * existingUsers.length)],
    Amount: faker.finance.amount(),
    Timestamp: faker.date.past().toISOString(),
  }
  // const insertStatement = `INSERT INTO transactions (TransactionId, UserId, Amount, TimeStamp) VALUES (${transaction.TransactionId}, ${transaction.UserId}, ${transaction.Amount}, ${transaction.Timestamp})\n`;
  const insertStatement = `${transaction.TransactionId},${transaction.UserId},${transaction.Amount},${transaction.Timestamp}${index !== numTransactions ? '\n' : ''}`;
  outputStream.write(insertStatement)
  // console.log(JSON.stringify(transaction));
}

outputStream.end();

outputStream.on('finish', () => {
  console.log('SQL DUMP GENERATION COMPLETED');
})