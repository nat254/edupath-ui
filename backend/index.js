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
); // allow Vite dev server

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
      id: safeUser.id,
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

// ═══════════════════════════════════════════════════════════════════════════
// COURSE CRUD
// ═══════════════════════════════════════════════════════════════════════════

const COURSE_COLUMNS = `id, title, category, objectives, duration,
  video_url AS "videoUrl", pdf_url AS "pdfUrl",
  cover_image AS "coverImage", quiz, created_at AS "createdAt"`;

// GET /courses – list all
app.get("/courses", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${COURSE_COLUMNS} FROM courses ORDER BY created_at DESC`,
    );
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
      `SELECT ${COURSE_COLUMNS} FROM courses WHERE id = $1`,
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

// POST /courses – create (multipart: video, pdf files + text fields)
app.post("/courses", courseUpload, async (req, res) => {
  try {
    const { title, category, objectives, duration, cover_image, quiz } =
      req.body;
    const files = req.files || {};
    const videoFile = files.video?.[0];
    const pdfFile = files.pdf?.[0];

    const videoUrl = videoFile ? `/uploads/${videoFile.filename}` : null;
    const pdfUrl = pdfFile ? `/uploads/${pdfFile.filename}` : null;

    const result = await pool.query(
      `INSERT INTO courses (title, category, objectives, duration, video_url, pdf_url, cover_image, quiz)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING ${COURSE_COLUMNS}`,
      [
        title,
        category,
        objectives,
        duration,
        videoUrl,
        pdfUrl,
        cover_image || null,
        quiz || "[]",
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create course error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /courses/:id – update (multipart)
app.patch("/courses/:id", courseUpload, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, objectives, duration, cover_image, quiz } =
      req.body;
    const files = req.files || {};
    const videoFile = files.video?.[0];
    const pdfFile = files.pdf?.[0];

    const sets = [];
    const vals = [];
    let idx = 1;
    const push = (col, val) => {
      sets.push(`${col} = $${idx++}`);
      vals.push(val);
    };

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
    const result = await pool.query(
      `UPDATE courses SET ${sets.join(", ")} WHERE id = $${idx}
       RETURNING ${COURSE_COLUMNS}`,
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
    const result = await pool.query("DELETE FROM courses WHERE id = $1", [
      req.params.id,
    ]);
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

// GET /categories – list all
app.get("/categories", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, created_at AS \"createdAt\" FROM categories ORDER BY name ASC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("List categories error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /categories – create
app.post("/categories", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim())
      return res.status(400).json({ error: "Category name is required" });

    const result = await pool.query(
      `INSERT INTO categories (name) VALUES ($1)
       RETURNING id, name, created_at AS "createdAt"`,
      [name.trim()],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505")
      return res.status(409).json({ error: "Category already exists" });
    console.error("Create category error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /categories/:id – rename
app.patch("/categories/:id", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim())
      return res.status(400).json({ error: "Category name is required" });

    const result = await pool.query(
      `UPDATE categories SET name = $1 WHERE id = $2
       RETURNING id, name, created_at AS "createdAt"`,
      [name.trim(), req.params.id],
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Category not found" });
    res.json(result.rows[0]);
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
    const result = await pool.query("DELETE FROM categories WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Category not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete category error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// LEARNERS (admin view)
// ═══════════════════════════════════════════════════════════════════════════

// GET /learners – all learner-role users with real enrollment counts
app.get("/learners", async (_req, res) => {
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
       WHERE u.role = 'learner'
       GROUP BY u.id
       ORDER BY u.name ASC`,
    );
    // Cast counts from string to number (pg returns bigint as string)
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

// PATCH /learners/:id – update learner profile (admin)
app.patch("/learners/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, nationalId, organization, county } = req.body;
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

    if (sets.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    vals.push(id);
    const result = await pool.query(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${idx} AND role = 'learner'
       RETURNING id, national_id AS "nationalId", name, email, organization, county`,
      vals,
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Learner not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update learner error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /learners/:id – remove a learner (admin)
app.delete("/learners/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 AND role = 'learner'",
      [req.params.id],
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Learner not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete learner error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// COURSE FEEDBACK
// ═══════════════════════════════════════════════════════════════════════════

// POST /feedback – submit feedback for a course
// Body: { userId, courseId, rating, comment }  (userId is UUID from users.id)
app.post("/feedback", async (req, res) => {
  const { userId, courseId, rating, comment } = req.body;

  if (!userId || !courseId || !rating)
    return res.status(400).json({ error: "userId, courseId and rating are required" });

  try {
    // Fetch user name for the response
    const userRow = await pool.query(
      "SELECT name FROM users WHERE id = $1",
      [userId],
    );
    if (userRow.rowCount === 0)
      return res.status(404).json({ error: "User not found" });

    const userName = userRow.rows[0].name;

    // Upsert: one feedback row per (user, course)
    const result = await pool.query(
      `INSERT INTO course_feedback (user_id, course_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, course_id)
       DO UPDATE SET rating = EXCLUDED.rating,
                     comment = EXCLUDED.comment,
                     updated_at = NOW()
       RETURNING id, user_id AS "userId", course_id AS "courseId",
                 rating, comment,
                 created_at AS "submittedAt"`,
      [userId, courseId, rating, comment ?? ""],
    );

    res.status(201).json({ ...result.rows[0], userName });
  } catch (err) {
    console.error("Submit feedback error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /feedback/:courseId – get all feedback for a course
app.get("/feedback/:courseId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cf.id,
              cf.user_id      AS "userId",
              u.name          AS "userName",
              cf.course_id    AS "courseId",
              c.title         AS "courseName",
              cf.rating,
              cf.comment,
              cf.created_at   AS "submittedAt"
       FROM   course_feedback cf
       JOIN   users   u ON u.id = cf.user_id
       JOIN   courses c ON c.id = cf.course_id
       WHERE  cf.course_id = $1
       ORDER  BY cf.created_at DESC`,
      [req.params.courseId],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get feedback error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /feedback – get all feedback (admin view)
app.get("/feedback", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT cf.id,
              cf.user_id      AS "userId",
              u.name          AS "userName",
              cf.course_id    AS "courseId",
              c.title         AS "courseName",
              cf.rating,
              cf.comment,
              cf.created_at   AS "submittedAt"
       FROM   course_feedback cf
       JOIN   users   u ON u.id = cf.user_id
       JOIN   courses c ON c.id = cf.course_id
       ORDER  BY cf.created_at DESC`,
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get all feedback error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /feedback/:id – remove a feedback entry
app.delete("/feedback/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM course_feedback WHERE id = $1",
      [req.params.id],
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Feedback not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete feedback error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTIMONIALS
// ═══════════════════════════════════════════════════════════════════════════

const TESTIMONIAL_COLS = `
  t.id,
  u.name,
  u.county,
  t.role,
  t.rating,
  t.text,
  t.is_approved   AS "isApproved",
  t.created_at    AS "createdAt"
`;

// GET /testimonials – approved only (public, used by landing page)
app.get("/testimonials", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${TESTIMONIAL_COLS}
       FROM   testimonials t
       JOIN   users u ON u.id = t.user_id
       WHERE  t.is_approved = TRUE
       ORDER  BY t.created_at DESC`,
    );
    res.json(result.rows);
  } catch (err) {
    console.error("List testimonials error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /testimonials/all – all testimonials (admin view)
app.get("/testimonials/all", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${TESTIMONIAL_COLS}
       FROM   testimonials t
       JOIN   users u ON u.id = t.user_id
       ORDER  BY t.created_at DESC`,
    );
    res.json(result.rows);
  } catch (err) {
    console.error("List all testimonials error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /testimonials – submit/update a testimonial
// Body: { userId, role, rating, text }  (userId is UUID from users.id)
app.post("/testimonials", async (req, res) => {
  const { userId, role, rating, text } = req.body;

  if (!userId || !role || !rating || !text)
    return res.status(400).json({ error: "userId, role, rating and text are required" });

  try {
    // Verify the user exists
    const userRow = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
    if (userRow.rowCount === 0)
      return res.status(404).json({ error: "User not found" });

    // Upsert: one testimonial per user – update if already exists, reset approval
    const result = await pool.query(
      `INSERT INTO testimonials (user_id, role, rating, text, is_approved)
       VALUES ($1, $2, $3, $4, FALSE)
       ON CONFLICT (user_id)
       DO UPDATE SET role       = EXCLUDED.role,
                     rating     = EXCLUDED.rating,
                     text       = EXCLUDED.text,
                     is_approved = FALSE,
                     updated_at = NOW()
       RETURNING id, user_id AS "userId", role, rating, text,
                 is_approved AS "isApproved", created_at AS "createdAt"`,
      [userId, role, rating, text],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Submit testimonial error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /testimonials/:id/approve – toggle approval (admin)
app.patch("/testimonials/:id/approve", async (req, res) => {
  try {
    const { approved } = req.body; // boolean
    const result = await pool.query(
      `UPDATE testimonials
       SET is_approved = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, is_approved AS "isApproved"`,
      [approved, req.params.id],
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Testimonial not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Approve testimonial error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /testimonials/:id – admin delete
app.delete("/testimonials/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM testimonials WHERE id = $1",
      [req.params.id],
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Testimonial not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete testimonial error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ENROLLMENTS
// ═══════════════════════════════════════════════════════════════════════════

/** Resolve users.id (UUID) from national_id */
async function resolveUserId(nationalId) {
  const r = await pool.query("SELECT id FROM users WHERE national_id = $1", [nationalId]);
  if (r.rowCount === 0) throw new Error("User not found");
  return r.rows[0].id;
}

// POST /enrollments – enroll (upsert)
// Body: { userId, courseId }  (userId is the UUID from users.id)
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
    // Return existing row if already enrolled
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
    console.error("Enroll error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /enrollments/progress – update progress
// Body: { userId, courseId, progress }  (userId is UUID)
app.patch("/enrollments/progress", async (req, res) => {
  const { userId, courseId, progress } = req.body;
  if (!userId || !courseId || progress === undefined)
    return res.status(400).json({ error: "userId, courseId and progress are required" });
  try {
    const clamped = Math.min(100, Math.max(0, Math.round(Number(progress))));
    const result = await pool.query(
      `UPDATE course_enrollments
       SET progress = $1,
           completed_at = ${clamped >= 100 ? "NOW()" : "completed_at"}
       WHERE user_id = $2 AND course_id = $3
       RETURNING id, user_id AS "userId", course_id AS "courseId",
                 progress, enrolled_at AS "enrolledAt", completed_at AS "completedAt"`,
      [clamped, userId, courseId],
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Enrollment not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update progress error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /enrollments/:userId – all enrollments for a user (userId is UUID)
app.get("/enrollments/:userId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ce.id,
              ce.course_id    AS "courseId",
              ce.progress,
              ce.enrolled_at  AS "enrolledAt",
              ce.completed_at AS "completedAt"
       FROM course_enrollments ce
       WHERE ce.user_id = $1
       ORDER BY ce.enrolled_at DESC`,
      [req.params.userId],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get enrollments error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

app.get("/analytics", async (_req, res) => {
  try {
    // 1. Monthly enrollment + completion trend
    const trendResult = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', enrolled_at), 'Mon YYYY') AS month,
        DATE_TRUNC('month', enrolled_at)                       AS date,
        COUNT(*)                                               AS enrollments,
        COUNT(*) FILTER (WHERE completed_at IS NOT NULL)       AS completions
      FROM course_enrollments
      GROUP BY DATE_TRUNC('month', enrolled_at)
      ORDER BY DATE_TRUNC('month', enrolled_at) ASC
    `);

    // 2. Daily enrollments (last 90 days)
    const dailyResult = await pool.query(`
      SELECT
        TO_CHAR(day, 'Mon DD') AS day,
        day::date              AS date,
        COALESCE(COUNT(ce.id), 0) AS enrollments
      FROM generate_series(
        NOW() - INTERVAL '90 days', NOW(), INTERVAL '1 day'
      ) AS day
      LEFT JOIN course_enrollments ce
        ON ce.enrolled_at >= day
        AND ce.enrolled_at < day + INTERVAL '1 day'
      GROUP BY day
      ORDER BY day ASC
    `);

    // 3. Enrollments by county
    const countyResult = await pool.query(`
      SELECT u.county AS name, COUNT(DISTINCT u.id) AS count
      FROM users u
      WHERE u.role = 'learner' AND u.county IS NOT NULL
      GROUP BY u.county
      ORDER BY count DESC
    `);

    // 4. Completion rate per course
    const courseCompletionResult = await pool.query(`
      SELECT id, name, total, completed
  FROM (
    SELECT
      c.id,
      c.title AS name,
      COUNT(ce.id)                                             AS total,
      COUNT(ce.id) FILTER (WHERE ce.completed_at IS NOT NULL) AS completed
    FROM courses c
    LEFT JOIN course_enrollments ce ON ce.course_id = c.id
    GROUP BY c.id, c.title
  ) sub
  ORDER BY completed DESC
    `);

    // 5. Enrollments per course (top courses by enrollment)
    const topCoursesResult = await pool.query(`
      SELECT
        c.id,
        c.title AS name,
        COUNT(ce.id) AS score
      FROM courses c
      LEFT JOIN course_enrollments ce ON ce.course_id = c.id
      GROUP BY c.id, c.title
      ORDER BY score DESC
      LIMIT 8
    `);

    // 6. Progress by organisation
    const orgResult = await pool.query(`
  SELECT
    SPLIT_PART(u.organization, ' - ', 1)                                        AS name,
    COUNT(ce.id) FILTER (WHERE ce.completed_at IS NOT NULL)                     AS completed,
    COUNT(ce.id) FILTER (WHERE ce.completed_at IS NULL AND ce.progress > 0)     AS in_progress
  FROM users u
  LEFT JOIN course_enrollments ce ON ce.user_id = u.id
  WHERE u.role = 'learner'
  GROUP BY SPLIT_PART(u.organization, ' - ', 1)
  ORDER BY COUNT(ce.id) DESC
`);

    // 7. Learner status distribution
const statusResult = await pool.query(`
  SELECT
    COUNT(DISTINCT CASE 
      WHEN completed_count > 0 AND in_progress_count = 0 
      THEN user_id END
    ) AS completed,
    COUNT(DISTINCT CASE 
      WHEN in_progress_count > 0 
      THEN user_id END
    ) AS in_progress,
    COUNT(DISTINCT CASE 
      WHEN completed_count = 0 AND in_progress_count = 0 
      THEN user_id END
    ) AS not_started
  FROM (
    SELECT
      u.id AS user_id,
      COUNT(ce.id) FILTER (WHERE ce.completed_at IS NOT NULL)                    AS completed_count,
      COUNT(ce.id) FILTER (WHERE ce.completed_at IS NULL AND ce.progress > 0)    AS in_progress_count
    FROM users u
    LEFT JOIN course_enrollments ce ON ce.user_id = u.id
    WHERE u.role = 'learner'
    GROUP BY u.id
  ) sub
`);
    res.json({
      trend: trendResult.rows.map(r => ({
        month: r.month,
        date: r.date,
        enrollments: parseInt(r.enrollments) || 0,
        completions: parseInt(r.completions) || 0,
      })),
      daily: dailyResult.rows.map(r => ({
        day: r.day,
        date: r.date,
        enrollments: parseInt(r.enrollments) || 0,
      })),
      county: countyResult.rows.map(r => ({
        name: r.name,
        count: parseInt(r.count) || 0,
      })),
      courseCompletion: courseCompletionResult.rows.map(r => {
        const total = parseInt(r.total) || 0;
        const completed = parseInt(r.completed) || 0;
        return {
          id: r.id,
          name: r.name.length > 20 ? r.name.slice(0, 20) + "…" : r.name,
          fullName: r.name,
          rate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      }),
      topCourses: topCoursesResult.rows.map(r => ({
        id: r.id,
        name: r.name.length > 26 ? r.name.slice(0, 26) + "…" : r.name,
        fullName: r.name,
        score: parseInt(r.score) || 0,
      })),
      orgProgress: orgResult.rows.map(r => {
        const completed = parseInt(r.completed) || 0;
        const inProgress = parseInt(r.in_progress) || 0;  // ← was r.inProgress
        const total = completed + inProgress;
        return {
          name: r.name,
          completed,
          inProgress,
          total,
          rate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      }),
     status: {
  completed:  parseInt(statusResult.rows[0]?.completed)    || 0,
  inProgress: parseInt(statusResult.rows[0]?.in_progress)  || 0,  // ← was inProgress
  notStarted: parseInt(statusResult.rows[0]?.not_started)  || 0,  // ← was notStarted
},
    });
  } catch (err) {
    console.error("Analytics error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Start server
 */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
