require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const cors = require("cors");
const webpush = require("web-push");
const { Client } = require("pg");

const app = express();

app.use(cors());
// get access to req.body
app.use(express.json());

// Subscribe user to notifications (send info to the db)
app.post("/subscribe", async (req, res) => {
  const { endpoint, p256dh, auth } = req.body;

  const client = new Client({
    connectionString: `${process.env.DATABASE_URL}`,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  client.connect();

  // Add an entry to a db
  client.query(
    `INSERT INTO subscriptions (id, endpoint, p256dh, auth) VALUES (DEFAULT, '${endpoint}', '${p256dh}', '${auth}');`,
    (err, res) => {
      if (err) throw err;
      for (let row of res.rows) {
        console.log(JSON.stringify(row));
      }
      client.end();
    }
  );

  //   CREATE TABLE subscriptions (
  //     id             serial PRIMARY KEY,
  //     endpoint       text UNIQUE,
  //     p256dh         text,
  //     auth           text
  // );
});

app.post("/push", async (req, res) => {
  const { message, title } = req.body;

  client.query(`SELECT * FROM subscriptions;`, async (err, res) => {
    if (err) throw err;
    for await (let row of res.rows) {
      const client = new Client({
        connectionString: `${process.env.DATABASE_URL}`,
        ssl: {
          rejectUnauthorized: false,
        },
      });

      client.connect();

      const subscription = {
        endpoint: row.endpoint,
        expirationTime: null,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth,
        },
      };

      const vapidKeys = {
        publicKey:
          "BK_dbgH7sTI103CEQVfZ2S2-0Vc5MpmN8FWtJczcEKKvoyigf1DXOAZpM102ufbCaao8WZuT9dMXhJITAwTMbL4",
        privateKey: "NmwkWYhR8N8tMLIma3bsckLncq4RmQ0rgLw28obg6Zw",
      };

      webpush.setVapidDetails(
        "mailto:bamguanat@yandex.ru",
        vapidKeys.publicKey,
        vapidKeys.privateKey
      );

      const data = {
        message,
        title,
      };

      webpush.sendNotification(subscription, JSON.stringify(data));
    }
    client.end();
  });
});

app.listen(5000, () => {
  console.log("server has started on port 5000");
});
