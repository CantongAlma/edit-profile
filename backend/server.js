import express from "express";
import cors from "cors";
import multer from "multer";
import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

// Database: one table, one starter user (id = 1)
   const db = new DatabaseSync(path.join(__dirname, "quickcart.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY,
    full_name TEXT NOT NULL,
    email     TEXT NOT NULL,
    phone     TEXT NOT NULL,
    address   TEXT NOT NULL,
    photo_url TEXT
  )
`);
if (!db.prepare("SELECT 1 FROM users WHERE id = 1").get()) {
  db.prepare(
    "INSERT INTO users (id, full_name, email, phone, address) VALUES (1, ?, ?, ?, ?)"
  ).run("ALMA CANTONG", "alma.cantong@example.com", "+63 912 345 6789", "123 Green Valley St., San Pedro, Laguna");
}

// Validation
const validate = ({ fullName, email, phone, address }) => {
  const e = {};
  if (!fullName?.trim()) e.fullName = "Enter your full name.";
  if (!/^\S+@\S+\.\S+$/.test(email || "")) e.email = "Enter a valid email address.";
  if (!/^(\+63|0)9\d{9}$/.test((phone || "").replace(/\s/g, ""))) e.phone = "Enter a valid PH mobile number, like +63 912 345 6789.";
  if (!address?.trim()) e.address = "Enter your delivery address.";
  return e;
};

const toClient = (r) => ({
  fullName: r.full_name, email: r.email, phone: r.phone, address: r.address, photoUrl: r.photo_url,
});

// Photo upload settings (images only, 2 MB max)
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => cb(null, `user1-${Date.now()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    /^image\/(png|jpe?g|webp)$/.test(file.mimetype) ? cb(null, true) : cb(new Error("Upload a PNG, JPG or WebP image.")),
});

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadDir));

// Routes
app.get("/api/profile", (_req, res) => {
  res.json(toClient(db.prepare("SELECT * FROM users WHERE id = 1").get()));
});

app.put("/api/profile", (req, res) => {
  const errors = validate(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ errors });
  const { fullName, email, phone, address } = req.body;
  db.prepare("UPDATE users SET full_name=?, email=?, phone=?, address=? WHERE id=1")
    .run(fullName.trim(), email.trim(), phone.trim(), address.trim());
  res.json(toClient(db.prepare("SELECT * FROM users WHERE id = 1").get()));
});

app.post("/api/profile/photo", (req, res) => {
  upload.single("photo")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.file) return res.status(400).json({ message: "Choose an image to upload." });
    const photoUrl = `/uploads/${req.file.filename}`;
    db.prepare("UPDATE users SET photo_url=? WHERE id=1").run(photoUrl);
    res.json({ photoUrl });
  });
});

app.listen(5000, () => console.log("API running on http://localhost:5000"));