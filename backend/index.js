import express from "express";
import dotenv from "dotenv";
import pkg from "pg";
import bcrypt from "bcrypt";
import cors from "cors";

dotenv.config();

const { Pool } = pkg;

const app = express();
app.use(
  cors({
    origin: "http://localhost:8080",
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
); // allow Vite dev server

app.use(express.json());

/**
 * PostgreSQL connection pool
 */
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

/**
 * Test DB connection
 */
pool
  .connect()
  .then(() => console.log("✅ Connected to PostgreSQL database"))
  .catch((err) => console.error("❌ DB connection error:", err));

/**
 * Simple test route
 */
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// Insert into users - Register functionality
app.post("/auth/register", async (req, res) => {
  const { nationalId, email, name, organization, county, pin } = req.body;

  try {
    // hash the pin
    const pin_hash = await bcrypt.hash(pin, 10);

    const result = await pool.query(
      `INSERT INTO users (id, national_id, email, name, organization, county, pin, role)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'learner')
            RETURNING id, national_id AS "nationalId", email, name, organization, county, role`,
      [nationalId, email, name, organization, county, pin_hash],
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Fetch from users - Login functionality
app.post("/auth/login", async (req, res) => {
  const { nationalId, pin } = req.body; // extract nationalID from request body

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE national_id = $1",
      [nationalId],
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // compare user input pin with hashed pin from db
    const isValid = await bcrypt.compare(pin, user.pin);

    if (!isValid) {
      return res.status(400).json({ error: "Invalid PIN" });
    }

    // Return user without the hashed pin
    const { pin: _pin, ...safeUser } = user;
    res.json({
      nationalId: safeUser.national_id,
      email: safeUser.email,
      name: safeUser.name,
      organization: safeUser.organization,
      county: safeUser.county,
      role: safeUser.role,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update profile - PATCH /auth/profile
app.patch("/auth/profile", async (req, res) => {
  const { nationalId, name, email, organization, county } = req.body;

  if (!nationalId)
    return res.status(400).json({ error: "nationalId is required" });

  try {
    const result = await pool.query(
      `UPDATE users
             SET name = COALESCE($1, name),
                 email = COALESCE($2, email),
                 organization = COALESCE($3, organization),
                 county = COALESCE($4, county)
             WHERE national_id = $5
             RETURNING national_id AS "nationalId", email, name, organization, county, role`,
      [name, email, organization, county, nationalId],
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: "User not found" });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change PIN - POST /auth/change-pin
app.post("/auth/change-pin", async (req, res) => {
  const { nationalId, currentPin, newPin } = req.body;

  if (!nationalId || !currentPin || !newPin)
    return res
      .status(400)
      .json({ error: "nationalId, currentPin and newPin are required" });

  if (newPin.length < 4)
    return res.status(400).json({ error: "PIN must be at least 4 digits" });

  try {
    const result = await pool.query(
      "SELECT pin FROM users WHERE national_id = $1",
      [nationalId],
    );

    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });

    const isValid = await bcrypt.compare(currentPin, user.pin);
    if (!isValid)
      return res.status(400).json({ error: "Current PIN is incorrect" });

    const newHash = await bcrypt.hash(newPin, 10);
    await pool.query("UPDATE users SET pin = $1 WHERE national_id = $2", [
      newHash,
      nationalId,
    ]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset PIN (forgot password flow) - POST /auth/reset-pin
app.post("/auth/reset-pin", async (req, res) => {
  const { nationalId, email, newPin } = req.body;

  if (!nationalId || !email || !newPin)
    return res
      .status(400)
      .json({ error: "nationalId, email and newPin are required" });

  if (newPin.length < 4)
    return res.status(400).json({ error: "PIN must be at least 4 digits" });

  try {
    // Verify that nationalId + email match a real user
    const result = await pool.query(
      "SELECT id FROM users WHERE national_id = $1 AND email = $2",
      [nationalId, email],
    );

    if (result.rowCount === 0)
      return res
        .status(400)
        .json({ error: "No account found with that ID and email" });

    const newHash = await bcrypt.hash(newPin, 10);
    await pool.query("UPDATE users SET pin = $1 WHERE national_id = $2", [
      newHash,
      nationalId,
    ]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout - POST /auth/logout
// Sessions are managed client-side; this endpoint exists for future token invalidation.
app.post("/auth/logout", (req, res) => {
  res.json({ success: true });
});

/**
 * Start server
 */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
