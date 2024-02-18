const { PrismaClient } = require('@prisma/client');
const express = require('express');

const PORT = 8000;
const app = express();
const prisma = new PrismaClient();

app.get("/", async (req, res) => {
  let { page, limit } = req.query;
  page = Number(page);
  limit = Number(limit);
  const data = await prisma.transactions.findMany({
    skip: page && limit ? page * limit : 0,
    take: limit ? limit : 20,
  })
  res.send(data);
})

app.listen(PORT, () => {
  console.info('Server Listening on port ', PORT);
})