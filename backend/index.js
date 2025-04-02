const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const path = require("path");
const pool = require("./config/db.js"); // Import the database connection

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve Static Files (Frontend)
app.use(express.static(path.join(__dirname, "../frontend")));

// Routes
const signupRoute = require("./routes/signup.js");
const loginRoute = require("./routes/login.js");
const uploadRoute = require("./routes/upload");


app.use("/api/signup", signupRoute);
app.use("/api/login", loginRoute);
app.use("/api/upload", uploadRoute);

// Default Route (Serve index.html)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/pages/index.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/pages/signup.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/pages/login.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/pages/login.html"));
});
// Check Database Connection
pool.getConnection()
  .then((connection) => {
    console.log("✅ MySQL Database Connected Successfully!");
    connection.release(); // Release connection after successful test
  })
  .catch((error) => {
    console.error("❌ MySQL Connection Failed:", error.message);
  });

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
