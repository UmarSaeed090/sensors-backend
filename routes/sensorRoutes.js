const express = require("express");
const router = express.Router();
const sensorData = require("../models/sensorData");

// POST route to receive data
router.post("/upload", async (req, res) => {
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

// GET route to fetch all data
router.get("/all", async (req, res) => {
  try {
    const allData = await sensorData.find().sort({ timestamp: -1 });
    res.json(allData);
  } catch (error) {
    res.status(500).json({ message: "Error fetching data" });
  }
});

module.exports = router;
