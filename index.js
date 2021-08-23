require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const cors = require("cors");
const webpush = require("web-push");
const { Client } = require("pg");

const app = express();

app.use(cors({ origin: `${process.env.ALLOWED_ORIGIN}` }));
// get access to req.body
app.use(express.json());

const client = new Client({
  connectionString: `${process.env.DATABASE_URL}`,
  ssl: {
    rejectUnauthorized: false,
  },
});

// client.query(
//   `   CREATE TABLE questions (
//     id             serial PRIMARY KEY,
//     question           text
// );`,
//   (err, res) => {
//     if (err) throw err;
//   }
// );

client
  .connect()
  .then(() => console.log("connected"))
  .catch((err) => console.error("connection error", err.stack));

app.post("/ask", async (req, res) => {
  const { question } = req.body;

  // Add an entry to a db
  client.query(
    `INSERT INTO questions (id, question) VALUES (DEFAULT, '${question}');`,
    (err, res) => {
      if (err) {
        res.status(500).send("Error occured");
        throw err;
      }
    }
  );

  res.status(200).send("Success");
});

// Subscribe user to notifications (send info to the db).
app.post("/subscribe", async (req, res) => {
  const { endpoint, p256dh, auth } = req.body;

  // Add an entry to a db
  client.query(
    `INSERT INTO subscriptions (id, endpoint, p256dh, auth) VALUES (DEFAULT, '${endpoint}', '${p256dh}', '${auth}');`,
    (err, res) => {
      if (err) throw err;
    }
  );

  res.set({
    "Access-Control-Allow-Origin": `${process.env.ALLOWED_ORIGIN}`,
  });
  res.status(200).send("Success");

  //   CREATE TABLE subscriptions (
  //     id             serial PRIMARY KEY,
  //     endpoint       text UNIQUE,
  //     p256dh         text,
  //     auth           text
  // );
});

// Send push notifications to subscribed users.
app.post("/push", async (req, res) => {
  const { message, title, action } = req.body;

  client.query(`SELECT * FROM subscriptions;`, async (err, res) => {
    // If can't query the db.
    if (err) throw err;

    (async function loop() {
      for (let row of res.rows) {
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
          action,
        };

        try {
          await webpush.sendNotification(subscription, JSON.stringify(data));
        } catch (error) {
          // If can't send push notification to a user.
          console.log(
            "******* Something went wrong, couldn't sent a push notification to user ",
            row.endpoint
          );
        }
      }
    })();
  });

  res.set({
    "Access-Control-Allow-Origin": `${process.env.ALLOWED_ORIGIN}`,
  });
  res.status(200).send("Success");
});

app.listen(process.env.PORT || 5000, () => {
  console.log("server has started on port 5000");
});
