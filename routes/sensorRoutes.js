const express = require("express");
const router = express.Router();
const sensorData = require("../models/sensorData");

const THRESHOLDS = {
  temperature: { min: 30, max: 39 },
  heartRate: { min: 60, max: 100 },
  spo2: { min: 95, max: 100 },
};

const alertCooldownMap = new Map(); // Structure: { cowId_alertType: timestamp }
const ALERT_COOLDOWN_MS = 10 * 60 * 1000; // 5 minutes



function checkThresholds(data) {
  const alerts = [];

  if (data?.ds18b20?.temperature < THRESHOLDS.temperature.min || data?.ds18b20?.temperature > THRESHOLDS.temperature.max) {
    alerts.push("Abnormal Temperature");
  }

  if (data?.max30100?.heartRate < THRESHOLDS.heartRate.min || data?.max30100?.heartRate > THRESHOLDS.heartRate.max) {
    alerts.push("Abnormal Heart Rate");
  }

  if (data?.max30100?.spo2 < THRESHOLDS.spo2.min) {
    alerts.push("Low SpO2 Level");
  }

  return alerts;
}

async function sendCowNotification(tagNumber, body, data = {}) {
  try {
    const response = await fetch(
      'https://us-central1-fyp-backend-672d5.cloudfunctions.net/sendSensorNotification',
      {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tagNumber,
        body,
        data,
      }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending notification:', error.response?.data || error.message);
    throw error;
  }
}


module.exports = (io) => {
  // POST route to receive sensor data
  router.post("/live", async (req, res) => {
    const { tagNumber } = req.body;
    
    if (!tagNumber) {
      return res.status(400).json({ message: "tagNumber is required" });
    }
    console.log("🔹 Incoming sensor data:", req.body);

    try {
      const data = new sensorData(req.body);
      // await data.save();
      // const latestData = await sensorData.findOne().sort({ timestamp: -1 });
      
      // Broadcast to subscribed clients
      io.to(tagNumber).emit("sensor-update", { tagNumber, data });
      
      res.status(201).json({ message: "Data emitted" });
      
      
      //send notification to firebase
      const alerts = checkThresholds(req.body);
      const now = Date.now();
      const alertsToSend = [];

      if (alerts.length > 0) {
        await data.save(); // Save only if abnormal & new alert
      }

      alerts.forEach((alert) => {
        const key = `${tagNumber}_${alert}`;
        const lastSent = alertCooldownMap.get(key) || 0;

        if (now - lastSent > ALERT_COOLDOWN_MS) {
          alertsToSend.push(alert);
          alertCooldownMap.set(key, now); // Update last sent time
        }
      });

      if (alertsToSend.length > 0) {
        sendCowNotification(tagNumber, alertsToSend.join(", "))
          .then(() => {
            console.log("✅ Notification sent successfully");
          })
          .catch((error) => {
            console.error("❌ Error sending notification:", error);
          });
      }

    } catch (error) {
      console.error("❌ Error saving sensor data:", error);
      res.status(500).json({ message: "Failed to save data" });
    }
  });

  router.post("/store", async (req, res) => {
  console.log("🔹 Incoming request:", req.body);
  try {
    const data = new sensorData(req.body); // Save request data
    await data.save(); // Store in MongoDB
    res.status(201).json({ message: "Data saved successfully" });
  } catch (error) {
    console.error("❌ Error saving data:", error);
    res.status(500).json({ message: "Failed to save data" });
  }
});

  // GET route to fetch data by date
  router.get("/all", async (req, res) => {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split("T")[0]; // Use current date if not provided
    console.log("🔹 Fetching data for date:", targetDate);

    try {
      const start = new Date(targetDate);
      const end = new Date(targetDate);
      end.setDate(end.getDate() + 1);

      console.log("Start date:", start);
      console.log("End date:", end);

      const allData = await sensorData.find({
        timestamp: { $gte: start, $lt: end }
      }).sort({ timestamp: -1 });

      res.json(allData);
    } catch (error) {
      console.error("❌ Error fetching data by date:", error);
      res.status(500).json({ message: "Error fetching data" });
    }
  });

  // GET route to fetch the latest sensor data
  router.get("/latest", async (req, res) => {
    const { tagNumber } = req.query;
    console.log("🔹 Fetching latest sensor data", tagNumber ? `for tagNumber: ${tagNumber}` : "");

    try {
      let latestData;
      if (tagNumber) {
        latestData = await sensorData.findOne({ tagNumber }).sort({ _id: -1 });
        if (!latestData) {
          return res.status(404).json({ message: `No data found for tagNumber: ${tagNumber}` });
        }
      } else {
        latestData = await sensorData.findOne().sort({ _id: -1 });
        if (!latestData) {
          return res.status(404).json({ message: "No data found" });
        }
      }
      res.json(latestData);
    } catch (error) {
      console.error("❌ Error fetching latest data:", error);
      res.status(500).json({ message: "Error fetching latest data" });
    }
  });

  return router;
};
