// Load environment variables from .env file
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const sensorRoutes = require("./routes/sensorRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/sensors", sensorRoutes(io)); // pass io instance

// MongoDB connection
const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  console.error("❌ MONGODB_URI not found in .env file");
  process.exit(1);
}

mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ DB Error:", err));

// Socket.IO connections
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("subscribe-cows", (cowIds) => {
    console.log("Received cowIds:", cowIds);

    const idsArray = Array.isArray(cowIds) ? cowIds : [cowIds]; // Convert single value to array

    idsArray.forEach(cowId => {
      socket.join(cowId);
      console.log(`✅ Client ${socket.id} subscribed to cow ${cowId}`);
    });
  });

  socket.on("unsubscribe-cows", (cowIds) => {
    cowIds.forEach(cowId => {
      socket.leave(cowId);
      console.log(`🚫 Client ${socket.id} unsubscribed from cow ${cowId}`);
    });
  });

  socket.on("disconnect", () => {
    console.log("❎ Client disconnected:", socket.id);
  });
});

// Sample route
app.get("/", (req, res) => {
  res.send("Sensor backend is running!");
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
