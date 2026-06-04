import express from "express";
import dotenv from "dotenv";
import pkg from "pg";
import bcrypt from "bcrypt";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();

const { Pool } = pkg;

const app = express();
app.use(
  cors({
    origin: "http://localhost:8080",
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

// ── File uploads setup ──────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });
const courseUpload = upload.fields([
  { name: "video", maxCount: 1 },
  { name: "pdf", maxCount: 1 },
]);

app.use("/uploads", express.static(uploadsDir));

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

pool
  .connect()
  .then(() => console.log("✅ Connected to PostgreSQL database"))
  .catch((err) => console.error("❌ DB connection error:", err));

// // ── Run DB migrations on startup ─────────────────────────────────────────
// async function runMigrations() {
//   try {
//     await pool.query(`
//       ALTER TABLE users
//         ADD COLUMN IF NOT EXISTS designation  VARCHAR(50),
//         ADD COLUMN IF NOT EXISTS is_active    BOOLEAN NOT NULL DEFAULT TRUE,
//         ADD COLUMN IF NOT EXISTS facility_name VARCHAR(255),
//         ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ DEFAULT NOW();
//     `);
//     await pool.query(`
//       ALTER TABLE categories
//         ADD COLUMN IF NOT EXISTS audience_type VARCHAR(20) NOT NULL DEFAULT 'both';
//     `);
//     await pool.query(`
//       ALTER TABLE course_enrollments
//         ADD COLUMN IF NOT EXISTS quiz_score INTEGER;
//     `);
//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS quiz_attempts (
//         id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//         user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
//         course_id    UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
//         score        INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
//         attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
//       );
//     `);
//     await pool.query(`
//       CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
//     `);
//     // Migrate old 'learner' role to 'healthcare_provider'
//     await pool.query(`
//       UPDATE users SET role = 'healthcare_provider' WHERE role = 'learner';
//     `);
//     console.log("✅ DB migrations applied");
//   } catch (err) {
//     console.error("⚠️  Migration warning:", err.message);
//   }
// }
// runMigrations();

app.get("/", (req, res) => {
  res.send("Backend is running");
});

// ═══════════════════════════════════════════════════════════════════════════
// AUTH — REGISTER
// ═══════════════════════════════════════════════════════════════════════════

app.post("/auth/register", async (req, res) => {
  const { role, name, email, pin, nationalId, county, organization, designation } = req.body;

  if (!role || !["healthcare_provider", "internal_staff"].includes(role))
    return res.status(400).json({ error: "Invalid role. Must be healthcare_provider or internal_staff." });

  if (!name?.trim()) return res.status(400).json({ error: "Full name is required." });
  if (!email?.trim()) return res.status(400).json({ error: "Email is required." });
  if (!pin) return res.status(400).json({ error: "PIN is required." });

  try {
    // Email uniqueness check
    const emailCheck = await pool.query("SELECT id FROM users WHERE email = $1", [email.trim()]);
    if (emailCheck.rowCount > 0)
      return res.status(409).json({ error: "Email is already registered." });

    // Healthcare Provider specific validation
    if (role === "healthcare_provider") {
      if (!nationalId?.trim())
        return res.status(400).json({ error: "National ID is required for Healthcare Providers." });
      if (!county?.trim())
        return res.status(400).json({ error: "County is required for Healthcare Providers." });
      if (!organization?.trim())
        return res.status(400).json({ error: "Facility Name is required for Healthcare Providers." });

      // National ID uniqueness
      const idCheck = await pool.query("SELECT id FROM users WHERE national_id = $1", [nationalId.trim()]);
      if (idCheck.rowCount > 0)
        return res.status(409).json({ error: "National ID is already registered." });
    }

    // Internal Staff specific validation
    if (role === "internal_staff") {
      const validDesignations = ["Tech Support", "Call Center", "Customer Delivery"];
      if (!designation || !validDesignations.includes(designation))
        return res.status(400).json({ error: "Valid designation is required for Internal Staff." });
    }

    const pin_hash = await bcrypt.hash(pin, 10);

    let result;
    if (role === "healthcare_provider") {
      result = await pool.query(
        `INSERT INTO users (id, national_id, email, name, organization, county, pin, role, is_active)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'healthcare_provider', TRUE)
         RETURNING id, national_id AS "nationalId", email, name, organization,
                   county, role, is_active AS "isActive"`,
        [nationalId.trim(), email.trim(), name.trim(), organization.trim(), county.trim(), pin_hash],
      );
    } else {
      result = await pool.query(
        `INSERT INTO users (id, email, name, designation, pin, role, is_active)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'internal_staff', TRUE)
         RETURNING id, email, name, designation, role, is_active AS "isActive"`,
        [email.trim(), name.trim(), designation, pin_hash],
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// AUTH — LOGIN
// ═══════════════════════════════════════════════════════════════════════════

app.post("/auth/login", async (req, res) => {
  const { identifier, pin, portal } = req.body;
  // identifier = nationalId for provider portal, email for staff portal

  if (!portal || !["provider", "staff"].includes(portal))
    return res.status(400).json({ error: "Portal must be 'provider' or 'staff'." });

  try {
    let result;

    if (portal === "provider") {
      // Healthcare Provider: lookup by national_id
      result = await pool.query(
        `SELECT id, national_id AS "nationalId", email, name, organization, county, role, pin, is_active AS "isActive",
                designation
         FROM users WHERE national_id = $1`,
        [identifier],
      );

      if (result.rowCount === 0)
        return res.status(400).json({ error: "No account found with this National ID." });

      const user = result.rows[0];

      // Cross-portal check
      if (user.role === "internal_staff" || user.role === "admin") {
        return res.status(403).json({
          error: "This account belongs to Internal Staff. Please use the Internal Staff login portal.",
          crossPortal: true,
        });
      }
    } else {
      // Staff portal: lookup by email
      result = await pool.query(
        `SELECT id, national_id AS "nationalId", email, name, organization, county, role, pin, is_active AS "isActive",
                designation
         FROM users WHERE email = $1`,
        [identifier],
      );

      if (result.rowCount === 0)
        return res.status(400).json({ error: "No account found with this email address." });

      const user = result.rows[0];

      // Cross-portal check
      if (user.role === "healthcare_provider") {
        return res.status(403).json({
          error: "This account belongs to a Healthcare Provider. Please use the Healthcare Provider login portal.",
          crossPortal: true,
        });
      }
    }

    const user = result.rows[0];

    // Active account check
    if (!user.isActive) {
      return res.status(403).json({ error: "Your account has been deactivated. Please contact an administrator." });
    }

    // PIN verification
    const isValid = await bcrypt.compare(pin, user.pin);
    if (!isValid)
      return res.status(400).json({ error: "Incorrect PIN. Please try again." });

    // Return safe user object
    const { pin: _pin, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// AUTH — PROFILE UPDATE
// ═══════════════════════════════════════════════════════════════════════════

app.patch("/auth/profile", async (req, res) => {
  const { userId, nationalId, name, email, organization, county, designation } = req.body;

  try {
    let result;
    if (userId) {
      result = await pool.query(
        `UPDATE users
         SET name        = COALESCE($1, name),
             email       = COALESCE($2, email),
             county      = COALESCE($3, county),
             designation = COALESCE($4, designation)
         WHERE id = $5
         RETURNING id, national_id AS "nationalId", email, name, organization, county, role, designation, is_active AS "isActive"`,
        [name, email, county, designation, userId],
      );
    } else if (nationalId) {
      result = await pool.query(
        `UPDATE users
         SET name  = COALESCE($1, name),
             email = COALESCE($2, email),
             county = COALESCE($3, county)
         WHERE national_id = $4
         RETURNING id, national_id AS "nationalId", email, name, organization,
                   county, role, designation, is_active AS "isActive"`,
        [name, email, county, nationalId],
      );
    } else {
      return res.status(400).json({ error: "userId or nationalId is required" });
    }

    if (result.rowCount === 0)
      return res.status(404).json({ error: "User not found" });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// AUTH — CHANGE PIN
// ═══════════════════════════════════════════════════════════════════════════

app.post("/auth/change-pin", async (req, res) => {
  const { userId, nationalId, email, currentPin, newPin } = req.body;

  if (!currentPin || !newPin)
    return res.status(400).json({ error: "currentPin and newPin are required" });
  if (newPin.length < 4)
    return res.status(400).json({ error: "PIN must be at least 4 digits" });

  try {
    let result;
    if (userId) {
      result = await pool.query("SELECT pin FROM users WHERE id = $1", [userId]);
    } else if (nationalId) {
      result = await pool.query("SELECT pin FROM users WHERE national_id = $1", [nationalId]);
    } else if (email) {
      result = await pool.query("SELECT pin FROM users WHERE email = $1", [email]);
    } else {
      return res.status(400).json({ error: "userId, nationalId, or email is required" });
    }

    if (result.rowCount === 0) return res.status(404).json({ error: "User not found" });

    const isValid = await bcrypt.compare(currentPin, result.rows[0].pin);
    if (!isValid) return res.status(400).json({ error: "Current PIN is incorrect" });

    const newHash = await bcrypt.hash(newPin, 10);

    if (userId) {
      await pool.query("UPDATE users SET pin = $1 WHERE id = $2", [newHash, userId]);
    } else if (nationalId) {
      await pool.query("UPDATE users SET pin = $1 WHERE national_id = $2", [newHash, nationalId]);
    } else {
      await pool.query("UPDATE users SET pin = $1 WHERE email = $2", [newHash, email]);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// AUTH — RESET PIN (forgot password)
// ═══════════════════════════════════════════════════════════════════════════

app.post("/auth/reset-pin", async (req, res) => {
  const { portal, nationalId, email, newPin } = req.body;

  if (!newPin) return res.status(400).json({ error: "newPin is required" });
  if (newPin.length < 4) return res.status(400).json({ error: "PIN must be at least 4 digits" });

  try {
    let result;
    if (portal === "provider" || (!portal && nationalId)) {
      // Healthcare Provider: verify nationalId + email
      if (!nationalId || !email)
        return res.status(400).json({ error: "nationalId and email are required" });
      result = await pool.query(
        "SELECT id FROM users WHERE national_id = $1 AND email = $2",
        [nationalId, email],
      );
      if (result.rowCount === 0)
        return res.status(400).json({ error: "No account found with that ID and email" });
      const newHash = await bcrypt.hash(newPin, 10);
      await pool.query("UPDATE users SET pin = $1 WHERE national_id = $2", [newHash, nationalId]);
    } else {
      // Staff: verify by email only
      if (!email) return res.status(400).json({ error: "email is required" });
      result = await pool.query(
        "SELECT id FROM users WHERE email = $1 AND role IN ('internal_staff', 'admin')",
        [email],
      );
      if (result.rowCount === 0)
        return res.status(400).json({ error: "No staff account found with that email" });
      const newHash = await bcrypt.hash(newPin, 10);
      await pool.query("UPDATE users SET pin = $1 WHERE email = $2", [newHash, email]);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
app.post("/auth/logout", (req, res) => {
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════
// COURSE CRUD
// ═══════════════════════════════════════════════════════════════════════════

const COURSE_COLUMNS = `c.id, c.title, c.category, c.objectives, c.duration,
  c.video_url AS "videoUrl", c.pdf_url AS "pdfUrl",
  c.cover_image AS "coverImage", c.quiz, c.created_at AS "createdAt"`;

// GET /courses – list all, optionally filtered by role-based audience
app.get("/courses", async (req, res) => {
  const { role } = req.query;

  try {
    let query;
    let params = [];

    if (!role || role === "admin") {
      // Admin sees all courses
      query = `SELECT ${COURSE_COLUMNS} FROM courses c ORDER BY c.created_at DESC`;
    } else {
      // Map role to audience_type filter
      let audienceFilter;
      if (role === "healthcare_provider") {
        audienceFilter = `cat.audience_type IN ('healthcare_provider', 'both')`;
      } else if (role === "internal_staff") {
        audienceFilter = `cat.audience_type IN ('internal_staff', 'both')`;
      } else {
        audienceFilter = "TRUE";
      }

      query = `
        SELECT ${COURSE_COLUMNS}
        FROM courses c
        LEFT JOIN categories cat ON cat.name = c.category
        WHERE ${audienceFilter}
        ORDER BY c.created_at DESC
      `;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("List courses error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /courses/:id – single course
app.get("/courses/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${COURSE_COLUMNS} FROM courses c WHERE c.id = $1`,
      [req.params.id],
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Course not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get course error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /courses – create
app.post("/courses", courseUpload, async (req, res) => {
  try {
    const { title, category, objectives, duration, cover_image, quiz } = req.body;
    const files = req.files || {};
    const videoFile = files.video?.[0];
    const pdfFile = files.pdf?.[0];

    const videoUrl = videoFile ? `/uploads/${videoFile.filename}` : null;
    const pdfUrl = pdfFile ? `/uploads/${pdfFile.filename}` : null;

    const result = await pool.query(
      `INSERT INTO courses (title, category, objectives, duration, video_url, pdf_url, cover_image, quiz)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING ${COURSE_COLUMNS}`.replace(/c\./g, ""),
      [title, category, objectives, duration, videoUrl, pdfUrl, cover_image || null, quiz || "[]"],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create course error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /courses/:id – update
app.patch("/courses/:id", courseUpload, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, objectives, duration, cover_image, quiz } = req.body;
    const files = req.files || {};
    const videoFile = files.video?.[0];
    const pdfFile = files.pdf?.[0];

    const sets = [];
    const vals = [];
    let idx = 1;
    const push = (col, val) => { sets.push(`${col} = $${idx++}`); vals.push(val); };

    if (title !== undefined) push("title", title);
    if (category !== undefined) push("category", category);
    if (objectives !== undefined) push("objectives", objectives);
    if (duration !== undefined) push("duration", duration);
    if (videoFile) push("video_url", `/uploads/${videoFile.filename}`);
    if (pdfFile) push("pdf_url", `/uploads/${pdfFile.filename}`);
    if (cover_image !== undefined) push("cover_image", cover_image);
    if (quiz !== undefined) push("quiz", quiz);

    if (sets.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    vals.push(id);
    const COLS_NO_ALIAS = `id, title, category, objectives, duration, video_url AS "videoUrl", pdf_url AS "pdfUrl", cover_image AS "coverImage", quiz, created_at AS "createdAt"`;
    const result = await pool.query(
      `UPDATE courses SET ${sets.join(", ")} WHERE id = $${idx} RETURNING ${COLS_NO_ALIAS}`,
      vals,
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Course not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update course error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /courses/:id
app.delete("/courses/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM courses WHERE id = $1", [req.params.id]);
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Course not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete course error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY CRUD
// ═══════════════════════════════════════════════════════════════════════════

// GET /categories
app.get("/categories", async (req, res) => {
  const { audience_type } = req.query;
  try {
    let query = `SELECT id, name, audience_type AS "audienceType",
                   (SELECT COUNT(*) FROM courses WHERE category = categories.name) AS "courseCount",
                   created_at AS "createdAt"
                 FROM categories`;
    const params = [];
    if (audience_type && audience_type !== "all") {
      query += ` WHERE audience_type = $1`;
      params.push(audience_type);
    }
    query += ` ORDER BY name ASC`;
    const result = await pool.query(query, params);
    res.json(result.rows.map(r => ({ ...r, courseCount: parseInt(r.courseCount) || 0 })));
  } catch (err) {
    console.error("List categories error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /categories
app.post("/categories", async (req, res) => {
  try {
    const { name, audienceType } = req.body;
    if (!name?.trim())
      return res.status(400).json({ error: "Category name is required" });

    const audience = audienceType || "both";
    const valid = ["healthcare_provider", "internal_staff", "both"];
    if (!valid.includes(audience))
      return res.status(400).json({ error: "Invalid audience type" });

    const result = await pool.query(
      `INSERT INTO categories (name, audience_type)
       VALUES ($1, $2)
       RETURNING id, name, audience_type AS "audienceType", created_at AS "createdAt"`,
      [name.trim(), audience],
    );
    res.status(201).json({ ...result.rows[0], courseCount: 0 });
  } catch (err) {
    if (err.code === "23505")
      return res.status(409).json({ error: "Category already exists" });
    console.error("Create category error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /categories/:id
app.patch("/categories/:id", async (req, res) => {
  try {
    const { name, audienceType } = req.body;
    const sets = [];
    const vals = [];
    let idx = 1;

    if (name?.trim()) { sets.push(`name = $${idx++}`); vals.push(name.trim()); }
    if (audienceType) {
      const valid = ["healthcare_provider", "internal_staff", "both"];
      if (!valid.includes(audienceType))
        return res.status(400).json({ error: "Invalid audience type" });
      sets.push(`audience_type = $${idx++}`);
      vals.push(audienceType);
    }

    if (sets.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    vals.push(req.params.id);
    const result = await pool.query(
      `UPDATE categories SET ${sets.join(", ")} WHERE id = $${idx}
       RETURNING id, name, audience_type AS "audienceType", created_at AS "createdAt"`,
      vals,
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Category not found" });

    const courseCount = await pool.query(
      "SELECT COUNT(*) FROM courses WHERE category = $1",
      [result.rows[0].name],
    );
    res.json({ ...result.rows[0], courseCount: parseInt(courseCount.rows[0].count) || 0 });
  } catch (err) {
    if (err.code === "23505")
      return res.status(409).json({ error: "Category already exists" });
    console.error("Update category error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /categories/:id
app.delete("/categories/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM categories WHERE id = $1", [req.params.id]);
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Category not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete category error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT (Admin)
// ═══════════════════════════════════════════════════════════════════════════

// GET /users – all non-admin users with role-specific fields and filters
app.get("/users", async (req, res) => {
  const { role, county, facility, designation } = req.query;
  try {
    const conditions = ["u.role != 'admin'"];
    const params = [];
    let idx = 1;

    if (role && role !== "all") {
      conditions.push(`u.role = $${idx++}`);
      params.push(role);
    }
    if (county) {
      conditions.push(`u.county ILIKE $${idx++}`);
      params.push(`%${county}%`);
    }
    if (facility) {
      conditions.push(`u.organization ILIKE $${idx++}`);
      params.push(`%${facility}%`);
    }
    if (designation) {
      conditions.push(`u.designation = $${idx++}`);
      params.push(designation);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT
         u.id,
         u.national_id   AS "nationalId",
         u.name,
         u.email,
         u.organization,
         u.county,
         u.designation,
         u.role,
         u.is_active     AS "isActive",
         u.created_at    AS "createdAt",
         COUNT(ce.id) FILTER (WHERE ce.completed_at IS NOT NULL)                AS "coursesCompleted",
         COUNT(ce.id) FILTER (WHERE ce.completed_at IS NULL AND ce.progress > 0) AS "coursesInProgress"
       FROM users u
       LEFT JOIN course_enrollments ce ON ce.user_id = u.id
       ${where}
       GROUP BY u.id
       ORDER BY u.name ASC`,
      params,
    );

    const rows = result.rows.map((r) => ({
      ...r,
      coursesCompleted: parseInt(r.coursesCompleted, 10) || 0,
      coursesInProgress: parseInt(r.coursesInProgress, 10) || 0,
    }));
    res.json(rows);
  } catch (err) {
    console.error("Get users error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /users/:id – update user profile (admin)
app.patch("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, nationalId, organization, county, designation } = req.body;
  try {
    const sets = [];
    const vals = [];
    let idx = 1;
    const push = (col, val) => { sets.push(`${col} = $${idx++}`); vals.push(val); };

    if (name !== undefined)         push("name", name);
    if (email !== undefined)        push("email", email);
    if (nationalId !== undefined)   push("national_id", nationalId);
    if (organization !== undefined) push("organization", organization);
    if (county !== undefined)       push("county", county);
    if (designation !== undefined)  push("designation", designation);

    if (sets.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    vals.push(id);
    const result = await pool.query(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${idx}
       RETURNING id, national_id AS "nationalId", name, email, organization,
                 county, designation, role, is_active AS "isActive"`,
      vals,
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update user error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /users/:id/status – toggle is_active
app.patch("/users/:id/status", async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== "boolean")
    return res.status(400).json({ error: "isActive (boolean) is required" });

  try {
    const result = await pool.query(
      `UPDATE users SET is_active = $1 WHERE id = $2 AND role != 'admin'
       RETURNING id, is_active AS "isActive", name, role`,
      [isActive, id],
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Toggle status error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /users/:id
app.delete("/users/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 AND role != 'admin'",
      [req.params.id],
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "User not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete user error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Legacy /learners endpoint — maps to /users with healthcare_provider role
app.get("/learners", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         u.id,
         u.national_id  AS "nationalId",
         u.name,
         u.email,
         u.organization,
         u.county,
         COUNT(ce.id) FILTER (WHERE ce.completed_at IS NOT NULL)               AS "coursesCompleted",
         COUNT(ce.id) FILTER (WHERE ce.completed_at IS NULL AND ce.progress > 0) AS "coursesInProgress"
       FROM users u
       LEFT JOIN course_enrollments ce ON ce.user_id = u.id
       WHERE u.role = 'healthcare_provider'
       GROUP BY u.id
       ORDER BY u.name ASC`,
    );
    const rows = result.rows.map((r) => ({
      ...r,
      coursesCompleted: parseInt(r.coursesCompleted, 10) || 0,
      coursesInProgress: parseInt(r.coursesInProgress, 10) || 0,
    }));
    res.json(rows);
  } catch (err) {
    console.error("Get learners error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.patch("/learners/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, nationalId, organization, county } = req.body;
  try {
    const sets = []; const vals = []; let idx = 1;
    const push = (col, val) => { sets.push(`${col} = $${idx++}`); vals.push(val); };
    if (name !== undefined)         push("name", name);
    if (email !== undefined)        push("email", email);
    if (nationalId !== undefined)   push("national_id", nationalId);
    if (organization !== undefined) push("organization", organization);
    if (county !== undefined)       push("county", county);
    if (sets.length === 0) return res.status(400).json({ error: "No fields to update" });
    vals.push(id);
    const result = await pool.query(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${idx}
       RETURNING id, national_id AS "nationalId", name, email, organization, county`,
      vals,
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/learners/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "User not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// COURSE FEEDBACK
// ═══════════════════════════════════════════════════════════════════════════

app.post("/feedback", async (req, res) => {
  const { userId, courseId, rating, comment } = req.body;
  if (!userId || !courseId || !rating)
    return res.status(400).json({ error: "userId, courseId and rating are required" });
  try {
    const userRow = await pool.query("SELECT name FROM users WHERE id = $1", [userId]);
    if (userRow.rowCount === 0) return res.status(404).json({ error: "User not found" });
    const userName = userRow.rows[0].name;
    const result = await pool.query(
      `INSERT INTO course_feedback (user_id, course_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, course_id)
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = NOW()
       RETURNING id, user_id AS "userId", course_id AS "courseId",
                 rating, comment, created_at AS "submittedAt"`,
      [userId, courseId, rating, comment ?? ""],
    );
    res.status(201).json({ ...result.rows[0], userName });
  } catch (err) {
    console.error("Submit feedback error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/feedback/:courseId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cf.id, cf.user_id AS "userId", u.name AS "userName",
              cf.course_id AS "courseId", c.title AS "courseName",
              cf.rating, cf.comment, cf.created_at AS "submittedAt"
       FROM course_feedback cf
       JOIN users u ON u.id = cf.user_id
       JOIN courses c ON c.id = cf.course_id
       WHERE cf.course_id = $1
       ORDER BY cf.created_at DESC`,
      [req.params.courseId],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/feedback", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT cf.id, cf.user_id AS "userId", u.name AS "userName",
              cf.course_id AS "courseId", c.title AS "courseName",
              cf.rating, cf.comment, cf.created_at AS "submittedAt"
       FROM course_feedback cf
       JOIN users u ON u.id = cf.user_id
       JOIN courses c ON c.id = cf.course_id
       ORDER BY cf.created_at DESC`,
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/feedback/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM course_feedback WHERE id = $1", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Feedback not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTIMONIALS
// ═══════════════════════════════════════════════════════════════════════════

const TESTIMONIAL_COLS = `t.id, u.name, u.county, t.role, t.rating, t.text,
  t.is_approved AS "isApproved", t.created_at AS "createdAt"`;

app.get("/testimonials", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${TESTIMONIAL_COLS} FROM testimonials t
       JOIN users u ON u.id = t.user_id
       WHERE t.is_approved = TRUE ORDER BY t.created_at DESC`,
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/testimonials/all", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${TESTIMONIAL_COLS} FROM testimonials t
       JOIN users u ON u.id = t.user_id ORDER BY t.created_at DESC`,
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/testimonials", async (req, res) => {
  const { userId, role, rating, text } = req.body;
  if (!userId || !role || !rating || !text)
    return res.status(400).json({ error: "userId, role, rating and text are required" });
  try {
    const userRow = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
    if (userRow.rowCount === 0) return res.status(404).json({ error: "User not found" });
    const result = await pool.query(
      `INSERT INTO testimonials (user_id, role, rating, text, is_approved)
       VALUES ($1, $2, $3, $4, FALSE)
       ON CONFLICT (user_id)
       DO UPDATE SET role = EXCLUDED.role, rating = EXCLUDED.rating,
                     text = EXCLUDED.text, is_approved = FALSE, updated_at = NOW()
       RETURNING id, user_id AS "userId", role, rating, text,
                 is_approved AS "isApproved", created_at AS "createdAt"`,
      [userId, role, rating, text],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/testimonials/:id/approve", async (req, res) => {
  try {
    const { approved } = req.body;
    const result = await pool.query(
      `UPDATE testimonials SET is_approved = $1, updated_at = NOW()
       WHERE id = $2 RETURNING id, is_approved AS "isApproved"`,
      [approved, req.params.id],
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Testimonial not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/testimonials/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM testimonials WHERE id = $1", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Testimonial not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ENROLLMENTS
// ═══════════════════════════════════════════════════════════════════════════

app.post("/enrollments", async (req, res) => {
  const { userId, courseId } = req.body;
  if (!userId || !courseId)
    return res.status(400).json({ error: "userId and courseId are required" });
  try {
    const result = await pool.query(
      `INSERT INTO course_enrollments (user_id, course_id, progress)
       VALUES ($1, $2, 0)
       ON CONFLICT (user_id, course_id) DO NOTHING
       RETURNING id, user_id AS "userId", course_id AS "courseId",
                 progress, enrolled_at AS "enrolledAt", completed_at AS "completedAt"`,
      [userId, courseId],
    );
    if (result.rowCount === 0) {
      const existing = await pool.query(
        `SELECT id, user_id AS "userId", course_id AS "courseId",
                progress, enrolled_at AS "enrolledAt", completed_at AS "completedAt"
         FROM course_enrollments WHERE user_id = $1 AND course_id = $2`,
        [userId, courseId],
      );
      return res.json(existing.rows[0]);
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/enrollments/progress", async (req, res) => {
  const { userId, courseId, progress, quizScore } = req.body;
  if (!userId || !courseId || progress === undefined)
    return res.status(400).json({ error: "userId, courseId and progress are required" });
  try {
    const clamped = Math.min(100, Math.max(0, Math.round(Number(progress))));
    // Only overwrite quiz_score when explicitly provided (COALESCE keeps the old value otherwise)
    const scoreVal = quizScore !== undefined && quizScore !== null
      ? Math.min(100, Math.max(0, Math.round(Number(quizScore))))
      : null;
    const result = await pool.query(
      `UPDATE course_enrollments
       SET progress    = $1,
           quiz_score  = COALESCE($4, quiz_score),
           completed_at = ${clamped >= 100 ? "NOW()" : "completed_at"}
       WHERE user_id = $2 AND course_id = $3
       RETURNING id, user_id AS "userId", course_id AS "courseId",
                 progress, quiz_score AS "quizScore",
                 enrolled_at AS "enrolledAt", completed_at AS "completedAt"`,
      [clamped, userId, courseId, scoreVal],
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Enrollment not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /enrollments/all — all learner enrollments with course details (admin CSV export)
// MUST be defined before /enrollments/:userId so Express doesn't treat "all" as a UUID param
app.get("/enrollments/all", async (req, res) => {
  const { role } = req.query;
  const targetRole = role || "healthcare_provider";
  try {
    const result = await pool.query(
      `SELECT
         u.id           AS "userId",
         u.name,
         u.email,
         u.national_id  AS "nationalId",
         u.organization,
         u.county,
         c.title        AS "courseTitle",
         ce.progress,
         ce.quiz_score  AS "quizScore",
         ce.enrolled_at AS "enrolledAt",
         ce.completed_at AS "completedAt"
       FROM users u
       LEFT JOIN course_enrollments ce ON ce.user_id = u.id
       LEFT JOIN courses c ON c.id = ce.course_id
       WHERE u.role = $1
       ORDER BY u.name ASC, c.title ASC`,
      [targetRole],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Enrollments all error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/enrollments/:userId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ce.id, ce.course_id AS "courseId", ce.progress,
              ce.quiz_score AS "quizScore",
              ce.enrolled_at AS "enrolledAt", ce.completed_at AS "completedAt"
       FROM course_enrollments ce
       WHERE ce.user_id = $1
       ORDER BY ce.enrolled_at DESC`,
      [req.params.userId],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /quiz-attempts — record a quiz attempt and keep the best score in enrollments
app.post("/quiz-attempts", async (req, res) => {
  const { userId, courseId, score } = req.body;
  if (!userId || !courseId || score === undefined)
    return res.status(400).json({ error: "userId, courseId, and score are required" });

  const clamped = Math.min(100, Math.max(0, Math.round(Number(score))));
  try {
    const attempt = await pool.query(
      `INSERT INTO quiz_attempts (user_id, course_id, score)
       VALUES ($1, $2, $3)
       RETURNING id, score, attempted_at AS "attemptedAt"`,
      [userId, courseId, clamped],
    );
    // Update quiz_score in enrollments only when this score is better than the stored best
    await pool.query(
      `UPDATE course_enrollments
       SET quiz_score = GREATEST(COALESCE(quiz_score, 0), $1)
       WHERE user_id = $2 AND course_id = $3`,
      [clamped, userId, courseId],
    );
    res.status(201).json({ ...attempt.rows[0], score: clamped });
  } catch (err) {
    console.error("Quiz attempt error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /top-scorers — top 5 users by quiz score, optionally filtered by courseId
app.get("/top-scorers", async (req, res) => {
  const { courseId } = req.query;
  try {
    let result;
    if (courseId) {
      result = await pool.query(
        `SELECT
           u.id           AS "userId",
           u.name,
           u.organization,
           ce.quiz_score  AS "score",
           c.title        AS "courseTitle",
           ce.completed_at AS "completedAt"
         FROM users u
         JOIN course_enrollments ce ON ce.user_id = u.id
         JOIN courses c ON c.id = ce.course_id
         WHERE ce.course_id = $1
           AND ce.quiz_score IS NOT NULL
           AND u.role != 'admin'
         ORDER BY ce.quiz_score DESC
         LIMIT 5`,
        [courseId],
      );
    } else {
      result = await pool.query(
        `SELECT
           u.id           AS "userId",
           u.name,
           u.organization,
           ROUND(AVG(ce.quiz_score))::int AS "score",
           COUNT(ce.id) FILTER (WHERE ce.completed_at IS NOT NULL) AS "coursesCompleted",
           NULL AS "courseTitle",
           NULL AS "completedAt"
         FROM users u
         JOIN course_enrollments ce ON ce.user_id = u.id
         WHERE ce.quiz_score IS NOT NULL
           AND u.role != 'admin'
         GROUP BY u.id, u.name, u.organization
         ORDER BY AVG(ce.quiz_score) DESC
         LIMIT 5`,
      );
    }
    res.json(result.rows.map(r => ({
      ...r,
      score: parseInt(r.score) || 0,
      coursesCompleted: r.coursesCompleted !== undefined ? parseInt(r.coursesCompleted) || 0 : undefined,
    })));
  } catch (err) {
    console.error("Top scorers error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /quiz-scores/:userId — per-course quiz scores + attempt history (admin use)
app.get("/quiz-scores/:userId", async (req, res) => {
  try {
    const [enrollRes, attemptsRes] = await Promise.all([
      pool.query(
        `SELECT c.id          AS "courseId",
                c.title       AS "courseTitle",
                ce.quiz_score AS "quizScore",
                ce.progress,
                ce.completed_at AS "completedAt"
         FROM course_enrollments ce
         JOIN courses c ON c.id = ce.course_id
         WHERE ce.user_id = $1
         ORDER BY c.title ASC`,
        [req.params.userId],
      ),
      pool.query(
        `SELECT course_id AS "courseId", score,
                attempted_at AS "attemptedAt"
         FROM quiz_attempts
         WHERE user_id = $1
         ORDER BY attempted_at ASC`,
        [req.params.userId],
      ),
    ]);

    // Group attempts by course
    const attemptMap = {};
    attemptsRes.rows.forEach(a => {
      if (!attemptMap[a.courseId]) attemptMap[a.courseId] = [];
      attemptMap[a.courseId].push({ score: parseInt(a.score), attemptedAt: a.attemptedAt });
    });

    res.json(enrollRes.rows.map(r => ({
      courseId:    r.courseId,
      courseTitle: r.courseTitle,
      quizScore:   r.quizScore !== null ? parseInt(r.quizScore) : null,
      progress:    parseInt(r.progress) || 0,
      completedAt: r.completedAt,
      attempts:    attemptMap[r.courseId] ?? [],
    })));
  } catch (err) {
    console.error("Quiz scores error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

app.get("/analytics", async (_req, res) => {
  try {
    const trendResult = await pool.query(`
      SELECT TO_CHAR(DATE_TRUNC('month', enrolled_at), 'Mon YYYY') AS month,
             DATE_TRUNC('month', enrolled_at) AS date,
             COUNT(*) AS enrollments,
             COUNT(*) FILTER (WHERE completed_at IS NOT NULL) AS completions
      FROM course_enrollments
      GROUP BY DATE_TRUNC('month', enrolled_at)
      ORDER BY DATE_TRUNC('month', enrolled_at) ASC
    `);

    const dailyResult = await pool.query(`
      SELECT TO_CHAR(day, 'Mon DD') AS day, day::date AS date,
             COALESCE(COUNT(ce.id), 0) AS enrollments
      FROM generate_series(NOW() - INTERVAL '90 days', NOW(), INTERVAL '1 day') AS day
      LEFT JOIN course_enrollments ce
        ON ce.enrolled_at >= day AND ce.enrolled_at < day + INTERVAL '1 day'
      GROUP BY day ORDER BY day ASC
    `);

    const countyResult = await pool.query(`
      SELECT u.county AS name, COUNT(DISTINCT u.id) AS count
      FROM users u
      WHERE u.role = 'healthcare_provider' AND u.county IS NOT NULL
      GROUP BY u.county ORDER BY count DESC
    `);

    const courseCompletionResult = await pool.query(`
      SELECT id, name, total, completed FROM (
        SELECT c.id, c.title AS name,
          COUNT(ce.id) AS total,
          COUNT(ce.id) FILTER (WHERE ce.completed_at IS NOT NULL) AS completed
        FROM courses c LEFT JOIN course_enrollments ce ON ce.course_id = c.id
        GROUP BY c.id, c.title
      ) sub ORDER BY completed DESC
    `);

    const topCoursesResult = await pool.query(`
      SELECT c.id, c.title AS name, COUNT(ce.id) AS score
      FROM courses c LEFT JOIN course_enrollments ce ON ce.course_id = c.id
      GROUP BY c.id, c.title ORDER BY score DESC LIMIT 8
    `);

    const orgResult = await pool.query(`
      SELECT SPLIT_PART(u.organization, ' - ', 1) AS name,
        COUNT(ce.id) FILTER (WHERE ce.completed_at IS NOT NULL) AS completed,
        COUNT(ce.id) FILTER (WHERE ce.completed_at IS NULL AND ce.progress > 0) AS in_progress
      FROM users u LEFT JOIN course_enrollments ce ON ce.user_id = u.id
      WHERE u.role = 'healthcare_provider'
      GROUP BY SPLIT_PART(u.organization, ' - ', 1)
      ORDER BY COUNT(ce.id) DESC
    `);

    const statusResult = await pool.query(`
      SELECT
        COUNT(DISTINCT CASE WHEN completed_count > 0 AND in_progress_count = 0 THEN user_id END) AS completed,
        COUNT(DISTINCT CASE WHEN in_progress_count > 0 THEN user_id END) AS in_progress,
        COUNT(DISTINCT CASE WHEN completed_count = 0 AND in_progress_count = 0 THEN user_id END) AS not_started
      FROM (
        SELECT u.id AS user_id,
          COUNT(ce.id) FILTER (WHERE ce.completed_at IS NOT NULL) AS completed_count,
          COUNT(ce.id) FILTER (WHERE ce.completed_at IS NULL AND ce.progress > 0) AS in_progress_count
        FROM users u LEFT JOIN course_enrollments ce ON ce.user_id = u.id
        WHERE u.role IN ('healthcare_provider', 'internal_staff')
        GROUP BY u.id
      ) sub
    `);

    // Role distribution
    const roleDistResult = await pool.query(`
      SELECT role, COUNT(*) AS count FROM users
      WHERE role != 'admin' GROUP BY role
    `);

    // Category performance by audience
    const categoryAudienceResult = await pool.query(`
      SELECT cat.name, cat.audience_type AS "audienceType",
        COUNT(ce.id) AS enrollments,
        COUNT(ce.id) FILTER (WHERE ce.completed_at IS NOT NULL) AS completions
      FROM categories cat
      LEFT JOIN courses c ON c.category = cat.name
      LEFT JOIN course_enrollments ce ON ce.course_id = c.id
      GROUP BY cat.name, cat.audience_type
      ORDER BY enrollments DESC
    `);

    // By designation (internal staff)
    const designationResult = await pool.query(`
      SELECT COALESCE(u.designation, 'Unassigned') AS name,
        COUNT(DISTINCT u.id) AS count
      FROM users u WHERE u.role = 'internal_staff'
      GROUP BY u.designation ORDER BY count DESC
    `);

    res.json({
      trend: trendResult.rows.map(r => ({
        month: r.month, date: r.date,
        enrollments: parseInt(r.enrollments) || 0,
        completions: parseInt(r.completions) || 0,
      })),
      daily: dailyResult.rows.map(r => ({
        day: r.day, date: r.date, enrollments: parseInt(r.enrollments) || 0,
      })),
      county: countyResult.rows.map(r => ({ name: r.name, count: parseInt(r.count) || 0 })),
      courseCompletion: courseCompletionResult.rows.map(r => {
        const total = parseInt(r.total) || 0;
        const completed = parseInt(r.completed) || 0;
        return { id: r.id, name: r.name.length > 20 ? r.name.slice(0, 20) + "…" : r.name,
          fullName: r.name, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
      }),
      topCourses: topCoursesResult.rows.map(r => ({
        id: r.id, name: r.name.length > 26 ? r.name.slice(0, 26) + "…" : r.name,
        fullName: r.name, score: parseInt(r.score) || 0,
      })),
      orgProgress: orgResult.rows.map(r => {
        const completed = parseInt(r.completed) || 0;
        const inProgress = parseInt(r.in_progress) || 0;
        const total = completed + inProgress;
        return { name: r.name, completed, inProgress, total,
          rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
      }),
      status: {
        completed: parseInt(statusResult.rows[0]?.completed) || 0,
        inProgress: parseInt(statusResult.rows[0]?.in_progress) || 0,
        notStarted: parseInt(statusResult.rows[0]?.not_started) || 0,
      },
      roleDistribution: roleDistResult.rows.map(r => ({
        role: r.role, count: parseInt(r.count) || 0,
      })),
      categoryAudience: categoryAudienceResult.rows.map(r => ({
        name: r.name, audienceType: r.audienceType,
        enrollments: parseInt(r.enrollments) || 0,
        completions: parseInt(r.completions) || 0,
      })),
      designation: designationResult.rows.map(r => ({
        name: r.name, count: parseInt(r.count) || 0,
      })),
    });
  } catch (err) {
    console.error("Analytics error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Reports endpoint — all queries share the same user filter so every chart responds to filters
app.get("/reports", async (req, res) => {
  const { role, county, facility, designation } = req.query;

  // ── Build shared user WHERE clause ──────────────────────────────────────
  const filterConds = ["u.role != 'admin'"];
  const filterParams = [];
  let pi = 1;
  if (role && role !== "all")        { filterConds.push(`u.role = $${pi++}`);               filterParams.push(role); }
  if (county && county !== "all")    { filterConds.push(`u.county ILIKE $${pi++}`);          filterParams.push(`%${county}%`); }
  if (facility && facility !== "all"){ filterConds.push(`u.organization ILIKE $${pi++}`);    filterParams.push(`%${facility}%`); }
  if (designation && designation !== "all"){ filterConds.push(`u.designation = $${pi++}`);  filterParams.push(designation); }
  const userWhere = `WHERE ${filterConds.join(" AND ")}`;

  // ── HP-specific filters (always scope to healthcare_provider) ────────────
  const hpCountyConds = ["u.role = 'healthcare_provider'", "u.county IS NOT NULL"];
  const hpCountyParams = [];
  let hci = 1;
  if (county && county !== "all")    { hpCountyConds.push(`u.county ILIKE $${hci++}`);       hpCountyParams.push(`%${county}%`); }
  if (facility && facility !== "all"){ hpCountyConds.push(`u.organization ILIKE $${hci++}`); hpCountyParams.push(`%${facility}%`); }

  const hpFacilityConds = ["u.role = 'healthcare_provider'"];
  const hpFacilityParams = [];
  let hfi = 1;
  if (facility && facility !== "all"){ hpFacilityConds.push(`u.organization ILIKE $${hfi++}`); hpFacilityParams.push(`%${facility}%`); }
  if (county && county !== "all")    { hpFacilityConds.push(`u.county ILIKE $${hfi++}`);       hpFacilityParams.push(`%${county}%`); }

  const staffDesigConds = ["u.role = 'internal_staff'"];
  const staffDesigParams = [];
  let sdi = 1;
  if (designation && designation !== "all"){ staffDesigConds.push(`u.designation = $${sdi++}`); staffDesigParams.push(designation); }

  // Run each query individually so a single failure doesn't wipe out all results
  const run = (label, sql, params) =>
    pool.query(sql, params).catch(err => {
      console.error(`[/reports] query "${label}" failed:`, err.message);
      return { rows: [] };
    });

  try {
    const [
      hpByCountyRes, hpByFacilityRes, staffByDesigRes,
      completionByRoleRes, catPerfRes,
      statusRes, roleDistRes, orgProgressRes,
      courseCompletionRes, topCoursesRes,
      trendRes, dailyRes,
    ] = await Promise.all([

      // ── HP by County ─────────────────────────────────────────────────────
      run("hpByCounty",
        `SELECT u.county AS name, COUNT(DISTINCT u.id) AS count
         FROM users u WHERE ${hpCountyConds.join(" AND ")}
         GROUP BY u.county ORDER BY count DESC`,
        hpCountyParams,
      ),

      // ── HP by Facility ────────────────────────────────────────────────────
      run("hpByFacility",
        `SELECT COALESCE(u.organization, 'Unknown') AS name, COUNT(DISTINCT u.id) AS count
         FROM users u WHERE ${hpFacilityConds.join(" AND ")}
         GROUP BY u.organization ORDER BY count DESC LIMIT 20`,
        hpFacilityParams,
      ),

      // ── Staff by Designation ──────────────────────────────────────────────
      run("staffByDesignation",
        `SELECT COALESCE(u.designation, 'Unassigned') AS name, COUNT(DISTINCT u.id) AS count
         FROM users u WHERE ${staffDesigConds.join(" AND ")}
         GROUP BY u.designation ORDER BY count DESC`,
        staffDesigParams,
      ),

      // ── Completion by Role (filtered) ─────────────────────────────────────
      run("completionByRole",
        `SELECT u.role,
           COUNT(ce.id) AS enrollments,
           COUNT(ce.id) FILTER (WHERE ce.completed_at IS NOT NULL) AS completions
         FROM users u
         LEFT JOIN course_enrollments ce ON ce.user_id = u.id
         ${userWhere}
         GROUP BY u.role`,
        filterParams,
      ),

      // ── Category Performance (filtered) ───────────────────────────────────
      // Subquery keeps only enrollments from filtered users before the outer LEFT JOIN,
      // so COUNT reflects only the filtered segment while all categories are shown.
      run("categoryPerformance",
        `SELECT cat.name, cat.audience_type AS "audienceType",
           COUNT(DISTINCT c.id) AS courses,
           COUNT(ce.id) AS enrollments,
           COUNT(ce.id) FILTER (WHERE ce.completed_at IS NOT NULL) AS completions
         FROM categories cat
         LEFT JOIN courses c ON c.category = cat.name
         LEFT JOIN (
           SELECT ce2.id, ce2.course_id, ce2.completed_at
           FROM course_enrollments ce2
           JOIN users u ON u.id = ce2.user_id
           ${userWhere}
         ) ce ON ce.course_id = c.id
         GROUP BY cat.name, cat.audience_type
         ORDER BY enrollments DESC`,
        filterParams,
      ),

      // ── Learner status breakdown (filtered) ───────────────────────────────
      run("status",
        `SELECT
           COUNT(DISTINCT CASE WHEN completed_count > 0 AND in_progress_count = 0 THEN uid END) AS completed,
           COUNT(DISTINCT CASE WHEN in_progress_count > 0 THEN uid END) AS in_progress,
           COUNT(DISTINCT CASE WHEN completed_count = 0 AND in_progress_count = 0 THEN uid END) AS not_started
         FROM (
           SELECT u.id AS uid,
             COUNT(ce.id) FILTER (WHERE ce.completed_at IS NOT NULL) AS completed_count,
             COUNT(ce.id) FILTER (WHERE ce.completed_at IS NULL AND ce.progress > 0) AS in_progress_count
           FROM users u
           LEFT JOIN course_enrollments ce ON ce.user_id = u.id
           ${userWhere}
           GROUP BY u.id
         ) sub`,
        filterParams,
      ),

      // ── Role distribution (filtered) ──────────────────────────────────────
      run("roleDistribution",
        `SELECT u.role, COUNT(*) AS count
         FROM users u
         ${userWhere}
         GROUP BY u.role`,
        filterParams,
      ),

      // ── Org Progress (filtered) ───────────────────────────────────────────
      run("orgProgress",
        `SELECT SPLIT_PART(u.organization, ' - ', 1) AS name,
           COUNT(ce.id) FILTER (WHERE ce.completed_at IS NOT NULL) AS completed,
           COUNT(ce.id) FILTER (WHERE ce.completed_at IS NULL AND ce.progress > 0) AS in_progress
         FROM users u
         LEFT JOIN course_enrollments ce ON ce.user_id = u.id
         ${userWhere} AND u.organization IS NOT NULL AND u.organization != ''
         GROUP BY SPLIT_PART(u.organization, ' - ', 1)
         HAVING SPLIT_PART(u.organization, ' - ', 1) != ''
         ORDER BY COUNT(ce.id) DESC`,
        filterParams,
      ),

      // ── Course completion rates (filtered) ────────────────────────────────
      run("courseCompletion",
        `SELECT c.id, c.title AS name,
           COUNT(ce.id) AS total,
           COUNT(ce.id) FILTER (WHERE ce.completed_at IS NOT NULL) AS completed
         FROM courses c
         LEFT JOIN (
           SELECT ce2.id, ce2.course_id, ce2.completed_at
           FROM course_enrollments ce2
           JOIN users u ON u.id = ce2.user_id
           ${userWhere}
         ) ce ON ce.course_id = c.id
         GROUP BY c.id, c.title
         ORDER BY completed DESC`,
        filterParams,
      ),

      // ── Top courses by enrollment (filtered) ──────────────────────────────
      run("topCourses",
        `SELECT c.id, c.title AS name, COUNT(ce.id) AS score
         FROM courses c
         LEFT JOIN (
           SELECT ce2.id, ce2.course_id
           FROM course_enrollments ce2
           JOIN users u ON u.id = ce2.user_id
           ${userWhere}
         ) ce ON ce.course_id = c.id
         GROUP BY c.id, c.title
         ORDER BY score DESC LIMIT 8`,
        filterParams,
      ),

      // ── Monthly enrollment trend (filtered) ───────────────────────────────
      run("trend",
        `SELECT TO_CHAR(DATE_TRUNC('month', ce.enrolled_at), 'Mon YYYY') AS month,
               DATE_TRUNC('month', ce.enrolled_at) AS date,
               COUNT(*) AS enrollments,
               COUNT(*) FILTER (WHERE ce.completed_at IS NOT NULL) AS completions
         FROM course_enrollments ce
         JOIN users u ON u.id = ce.user_id
         ${userWhere}
         GROUP BY DATE_TRUNC('month', ce.enrolled_at)
         ORDER BY DATE_TRUNC('month', ce.enrolled_at) ASC`,
        filterParams,
      ),

      // ── Daily trend — last 90 days (filtered) ─────────────────────────────
      // Use gs(day) alias to avoid ambiguity with the output column alias "day"
      run("daily",
        `SELECT TO_CHAR(gs.day, 'Mon DD') AS day, gs.day::date AS date,
               COALESCE(COUNT(ce.id), 0) AS enrollments
         FROM generate_series(NOW() - INTERVAL '90 days', NOW(), INTERVAL '1 day') AS gs(day)
         LEFT JOIN (
           SELECT ce2.id, ce2.enrolled_at
           FROM course_enrollments ce2
           JOIN users u ON u.id = ce2.user_id
           ${userWhere}
         ) ce ON ce.enrolled_at >= gs.day AND ce.enrolled_at < gs.day + INTERVAL '1 day'
         GROUP BY gs.day ORDER BY gs.day ASC`,
        filterParams,
      ),
    ]);

    res.json({
      // ── ReportsPage charts ──────────────────────────────────────────────
      hpByCounty:       hpByCountyRes.rows.map(r => ({ name: r.name, count: parseInt(r.count) || 0 })),
      hpByFacility:     hpByFacilityRes.rows.map(r => ({ name: r.name, count: parseInt(r.count) || 0 })),
      staffByDesignation: staffByDesigRes.rows.map(r => ({ name: r.name, count: parseInt(r.count) || 0 })),
      completionByRole: completionByRoleRes.rows.map(r => ({
        role: r.role, enrollments: parseInt(r.enrollments) || 0, completions: parseInt(r.completions) || 0,
      })),
      categoryPerformance: catPerfRes.rows.map(r => ({
        name: r.name, audienceType: r.audienceType,
        courses: parseInt(r.courses) || 0,
        enrollments: parseInt(r.enrollments) || 0,
        completions: parseInt(r.completions) || 0,
      })),
      // ── Analytics data (same source, respects all filters) ──────────────
      status: {
        completed:  parseInt(statusRes.rows[0]?.completed)   || 0,
        inProgress: parseInt(statusRes.rows[0]?.in_progress) || 0,
        notStarted: parseInt(statusRes.rows[0]?.not_started) || 0,
      },
      roleDistribution: roleDistRes.rows.map(r => ({ role: r.role, count: parseInt(r.count) || 0 })),
      orgProgress: orgProgressRes.rows.map(r => {
        const completed  = parseInt(r.completed)   || 0;
        const inProgress = parseInt(r.in_progress) || 0;
        const total = completed + inProgress;
        return { name: r.name, completed, inProgress, total, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
      }),
      courseCompletion: courseCompletionRes.rows.map(r => {
        const total     = parseInt(r.total)     || 0;
        const completed = parseInt(r.completed) || 0;
        return {
          id: r.id,
          name:     r.name.length > 20 ? r.name.slice(0, 20) + "…" : r.name,
          fullName: r.name,
          rate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      }),
      topCourses: topCoursesRes.rows.map(r => ({
        id: r.id,
        name:     r.name.length > 26 ? r.name.slice(0, 26) + "…" : r.name,
        fullName: r.name,
        score: parseInt(r.score) || 0,
      })),
      trend: trendRes.rows.map(r => ({
        month: r.month, date: r.date,
        enrollments: parseInt(r.enrollments) || 0,
        completions: parseInt(r.completions) || 0,
      })),
      daily: dailyRes.rows.map(r => ({
        day: r.day, date: r.date, enrollments: parseInt(r.enrollments) || 0,
      })),
    });
  } catch (err) {
    console.error("Reports error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
