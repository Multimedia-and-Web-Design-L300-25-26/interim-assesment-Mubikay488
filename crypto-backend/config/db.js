const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("FATAL: MONGO_URI environment variable is not set.");
    process.exit(1);
  }
  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    console.error(
      "Check that MONGO_URI is correct and the IP 0.0.0.0/0 is whitelisted in Atlas.",
    );
    process.exit(1);
  }
};

module.exports = connectDB;
