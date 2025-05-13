const mongoose = require("mongoose");

const sensorDataSchema = new mongoose.Schema({
  tagNumber: { type: String, required: true },
  dht22: { temperature: Number, humidity: Number },
  max30100: { heartRate: Number, spo2: Number },
  ds18b20: { temperature: Number },
  gps: { latitude: Number, longitude: Number },
  timestamp: {
    type: Date,
    default: () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" })),
  },
});

module.exports = mongoose.model("SensorData", sensorDataSchema);
