const { PrismaClient } = require('@prisma/client');
const express = require('express');
const { createClient } = require('redis');

const PORT = 8000;
const app = express();
const prisma = new PrismaClient();
let client;

// Function to connect to redis
async function connectRedis() {
  client = await createClient().on('error', err => console.err('Redis failed to connect')).connect()
}
connectRedis();


// Paginated data returns
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

// Returns the top users as per the requirement provided
// req.query expects month, year and responseType
app.get('/top-users', async (req, res) => {
  let { month, year, responseType } = req.query;
  let firstDay, lastDay, data;
  if (month && year) {
    const date = new Date(`${year}-${month ? month : ''}`);
    firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  } else {
    firstDay = new Date(`${year}-01-01`);
    lastDay = new Date(`${year}-12-31`);
  }

  let redisData = await client.get(`top-users-${responseType}:${month ? month + '-' : ''}${year}`);

  // If data present in redis then return that otherwise query database
  if (redisData) {
    res.send(redisData)
  } else {
    data = await prisma.transactions.groupBy({
      by: ['UserId'],
      where: {
        Timestamp: {
          gt: firstDay,
          lt: lastDay,
        }
      },
      _sum: {
        Amount: true,
      },
      orderBy: {
        _sum: {
          Amount: 'desc'
        }
      },
      take: 100
    })

    // Formatting the response before submitting.
    if(responseType === 'csv') {
      let formattedData = '';
      data.forEach((el) => {
        formattedData += `${el.UserId},${el._sum.Amount}\n`;
      })
      data = formattedData;
    } else if (responseType === 'html') {
      let formattedData = '<table><tr><th>UserId</th><th>Sum of Transactions</th></tr>' 
      data.forEach((el) => {
        formattedData += `<tr><td>${el.UserId}</td><td>${el._sum.Amount}</td></tr>`
      })
      formattedData += '</table>';
      data = formattedData;
    } else {
      data = JSON.stringify(data);
    }

    await client.set(`top-users-${responseType}:${month ? month + '-' : ''}${year}`, data);
    res.send(data);
  }

})

app.get('/potential-users', async (req, res) => {
  let { month, year } = req.query;

  const date = new Date(`${year}-${month}-01`);
  const lastMonth = date.setMonth(date.getMonth() - 1);
  const secondLastMonth = date.setMonth(date.getMonth() - 2);

  const lastMonthFirstDay = new Date(new Date(lastMonth).getFullYear(), new Date(lastMonth).getMonth(), 1);
  const lastMonthLastDay = new Date(new Date(lastMonth).getFullYear(), new Date(lastMonth).getMonth() + 1, 0);

  const secondLastMonthFirstDay = new Date(new Date(secondLastMonth).getFullYear(), new Date(secondLastMonth).getMonth(), 1);
  const secondLastMonthLastDay = new Date(new Date(secondLastMonth).getFullYear(), new Date(secondLastMonth).getMonth() + 1, 0);

  let finalResult = [];

  let redisData = await client.get(`potential-users:${month ? month + '-' : ''}${year}`)
  if (redisData) {
    res.send(JSON.parse(redisData));
  } else {
    const dataLastMonth = await prisma.transactions.groupBy({
      by: ['UserId'],
      where: {
        OR: [{
          Timestamp: {
            gt: lastMonthFirstDay,
            lt: lastMonthLastDay
          },
          Timestamp: {
            gt: secondLastMonthFirstDay,
            lt: secondLastMonthLastDay
          },
        }]
      },
      _sum: {
        Amount: true
      },
      _count: true
    })
    const dataSecondLastMonth = await prisma.transactions.groupBy({
      by: ['UserId'],
      where: {
        Timestamp: {
          gt: secondLastMonthFirstDay,
          lt: secondLastMonthLastDay
        },
      },
      _sum: {
        Amount: true
      },
      _count: true
    })

    dataLastMonth.forEach((el) => {
      dataSecondLastMonth.forEach((ele) => {
        if (el._sum > ele._sum || el._count > ele._count) {
          finalResult.push({
            userId: el.UserId,
            lastMonthTransactions: el._sum,
            lastMonthTxnCount: el._count,
            secondLastMonthTransactions: ele._sum,
            secondLastMonthTxnCount: ele._count,
          })
        }
      })
    })

    await client.set(`potential-users:${month ? month + '-' : ''}${year}`, JSON.stringify(finalResult));

    res.send(dataLastMonth.slice(0, 10))
  }
})

app.listen(PORT, () => {

  console.info('Server Listening on port ', PORT);
})