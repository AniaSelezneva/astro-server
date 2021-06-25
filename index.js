const express = require("express");
const path = require("path");
const PORT = process.env.PORT || 5000;
const cors = require("cors");
const webpush = require("web-push");

const app = express();

app.use(cors());
// get access to req.body
app.use(express.json());

app.post("/endpoint", async (req, res) => {
  try {
    console.log(req.body);

    // You have to specify that for localhost
    res.set("Access-Control-Allow-Origin", "http://localhost:9001");
    res.send("hello world");
  } catch (error) {
    console.error(err);
  }
});

app.post("/push", async (req, res) => {
  const { message, title } = req.body;

  const subscription = {
    endpoint:
      "https://fcm.googleapis.com/fcm/send/eZBKSof7hP4:APA91bETgxm3QuKfCcXWGZERtKhMCPVFcLROmxtLZ3BML9pc3XsBwmap62ZKodbK_adaHSS1BvPwcZZTJpq2hedZef_fsrMgdUuuNwZqrDDc32BTmLK42OIHYZuRZevItFRgUzl-t7Ax",
    expirationTime: null,
    keys: {
      p256dh:
        "BPK7qiBV0AzgjQZn4x5qPEuDyqdYXGAWx6AHzkHt_DER0KHdlre6GYLGOI6rGOgNvGPm_wqfaHtLLSgIfsUAsUw",
      auth: "EsfzWCPuf3_skbCulnkFhw",
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

  await webpush.sendNotification(subscription, JSON.stringify(data));
});

app.listen(5000, () => {
  console.log("server has started on port 5000");
});
