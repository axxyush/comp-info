// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { Pool } = require("pg");

const app = express();
app.use(express.json());
app.use(cors());

// Postgres pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Utility: normalize serial (uppercase, trim)
function normalizeSerial(raw) {
  if (!raw) return null;
  return String(raw).trim().toUpperCase();
}

// 1. List all serials with current status
// GET /serials
// Returns an array of { serial_number, current_name, current_status, last_event_date, manufacture, model, description }
app.get("/serials", async (req, res) => {
  try {
    // Use DISTINCT ON to get latest event per serial
    const q = `
      SELECT DISTINCT ON (serial_number)
        serial_number,
        current_name,
        status AS current_status,
        event_date AS last_event_date,
        manufacture,
        model,
        description
      FROM computer_events
      ORDER BY serial_number, event_date DESC, event_id DESC
    `;
    const result = await pool.query(q);
    res.json({ serials: result.rows });
  } catch (err) {
    console.error("GET /serials error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// 2. Fetch full history for a serial
// GET /serials/:serial/history
app.get("/serials/:serial/history", async (req, res) => {
  const raw = req.params.serial;
  const serial = normalizeSerial(raw);
  if (!serial) {
    return res.status(400).json({ error: "Invalid serial" });
  }
  try {
    // Check if any row exists for that serial
    const chk = await pool.query(
      `SELECT 1 FROM computer_events WHERE serial_number = $1 LIMIT 1`,
      [serial]
    );
    if (chk.rowCount === 0) {
      return res.status(404).json({ error: "Serial not found or no history" });
    }
    const q = `
      SELECT event_id, serial_number, current_name, renamed_from, renamed_to,
             event_date, status, manufacture, model, description, created_at
      FROM computer_events
      WHERE serial_number = $1
      ORDER BY event_date ASC, event_id ASC
    `;
    const result = await pool.query(q, [serial]);
    res.json({ history: result.rows });
  } catch (err) {
    console.error(`GET /serials/${serial}/history error:`, err);
    res.status(500).json({ error: "Database error" });
  }
});

// 3. Fetch current status for a serial
// GET /serials/:serial/status
app.get("/serials/:serial/status", async (req, res) => {
  const raw = req.params.serial;
  const serial = normalizeSerial(raw);
  if (!serial) {
    return res.status(400).json({ error: "Invalid serial" });
  }
  try {
    const q = `
      SELECT serial_number, current_name, status AS current_status,
             event_date AS last_event_date, manufacture, model, description
      FROM computer_events
      WHERE serial_number = $1
      ORDER BY event_date DESC, event_id DESC
      LIMIT 1
    `;
    const result = await pool.query(q, [serial]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Serial not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`GET /serials/${serial}/status error:`, err);
    res.status(500).json({ error: "Database error" });
  }
});

// 4. Add an event for a serial
// POST /serials/:serial/event
// Body JSON may include:
//   event_date (required, "YYYY-MM-DD"),
//   status (required, e.g. 'Renamed','Redeploy','Disposal','Assigned','Returned'),
//   current_name (optional),
//   renamed_from (optional),
//   renamed_to (optional),
//   manufacture (optional),
//   model (optional),
//   description (optional)
// POST /serials/:serial/event
app.post("/serials/:serial/event", async (req, res) => {
  const rawSerial = req.params.serial;
  const serial = normalizeSerial(rawSerial);
  if (!serial) {
    return res.status(400).json({ error: "Invalid serial" });
  }
  const {
    event_date,
    status,
    current_name,
    renamed_from,
    renamed_to,
    manufacture,
    model,
    description,
  } = req.body;
  if (
    !event_date ||
    !status ||
    !current_name ||
    !renamed_from ||
    !renamed_to ||
    !manufacture ||
    !model ||
    !description
  ) {
    return res
      .status(400)
      .json({ error: 'All fields are required; use "N/A" if not applicable' });
  }
  const dt = new Date(event_date);
  if (isNaN(dt.getTime())) {
    return res
      .status(400)
      .json({ error: "Invalid event_date format, use YYYY-MM-DD" });
  }
  try {
    // OPTIONAL: chronological check; but if first event, skip check
    const latestRes = await pool.query(
      `SELECT event_date FROM computer_events
       WHERE serial_number = $1
       ORDER BY event_date DESC, event_id DESC
       LIMIT 1`,
      [serial]
    );
    if (latestRes.rowCount > 0) {
      const lastDate = latestRes.rows[0].event_date;
      if (dt < lastDate) {
        return res.status(400).json({
          error: `event_date ${event_date} is before latest event date ${lastDate
            .toISOString()
            .slice(0, 10)}`,
        });
      }
    }
    const insertQ = `
      INSERT INTO computer_events
        (serial_number, current_name, renamed_from, renamed_to, event_date, status, manufacture, model, description)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING event_id
    `;
    const insertRes = await pool.query(insertQ, [
      serial,
      current_name.trim(),
      renamed_from.trim(),
      renamed_to.trim(),
      event_date,
      status.trim(),
      manufacture.trim(),
      model.trim(),
      description.trim(),
    ]);
    res.status(201).json({ event_id: insertRes.rows[0].event_id });
  } catch (err) {
    console.error(`POST /serials/${serial}/event error:`, err);
    res.status(500).json({ error: "Database error" });
  }
});

// 5. Delete a serial (all events for it)
// DELETE /serials/:serial
app.delete("/serials/:serial", async (req, res) => {
  const raw = req.params.serial;
  const serial = normalizeSerial(raw);
  if (!serial) {
    return res.status(400).json({ error: "Invalid serial" });
  }
  try {
    const result = await pool.query(
      `DELETE FROM computer_events WHERE serial_number = $1`,
      [serial]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Serial not found" });
    }
    res.json({ message: `Deleted all events for serial ${serial}` });
  } catch (err) {
    console.error(`DELETE /serials/${serial} error:`, err);
    res.status(500).json({ error: "Database error" });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});
