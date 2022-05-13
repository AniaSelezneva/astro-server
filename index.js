require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const cors = require("cors");
const webpush = require("web-push");
const { Client } = require("pg");
const axios = require("axios");
const jsdom = require("jsdom");
const iconv = require("iconv-lite");

const app = express();
const { JSDOM } = jsdom;

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

  console.log(question);

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

// Scraping for weekly horoscope
app.get("/week", async (req, res) => {
  const url = process.env.URL;
  const headers = { nodeList: [], textContent: [] };
  const texts = { nodeList: [], textContent: [] };
  const content = []; //{header: string, text: string}

  axios
    .get(url)
    .then(function ({ data }) {
      const dom = new JSDOM(data);
      const headersNodeList = dom.window.document.querySelectorAll("h2");
      // Get headers nodelist
      for (let i = 0; i < 12; i++) {
        headers.nodeList.push(headersNodeList[i]);
      }
      // Get paragraphs nodelist
      for (let i = 0; i < headers.nodeList.length; i++) {
        texts.nodeList.push(headers.nodeList[i].nextElementSibling);
      }
      // Extract headers text
      for (let i = 0; i < headers.nodeList.length; i++) {
        headers.textContent.push(
          headers.nodeList[i].textContent.trim().replace(/ .*/, "")
        );
      }
      // Extract paragraphs text
      for (let i = 0; i < texts.nodeList.length; i++) {
        console.log(texts.nodeList[i].textContent);
        texts.textContent.push(texts.nodeList[i].textContent);
      }
      // Combine header with text
      for (let i = 0; i < headers.nodeList.length; i++) {
        const headerPlusText = {
          header: headers.textContent[i],
          text: texts.textContent[i],
        };
        content.push(headerPlusText);
      }

      res.status(200).send(content);
    })
    .catch(function (error) {
      // handle error
      console.log(error);
    })
    .then(function () {
      // always executed
    });
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
