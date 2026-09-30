require("dotenv").config();
const express = require("express");
const multer = require("multer");
const fs = require("node:fs");
const path = require("node:path");
const { Worker } = require("node:worker_threads");
const mongoose = require("mongoose");
const { Policy, User, ScheduledMessage, Message } = require("./models");
const app = express();
const upload = multer({
  dest: path.join(require("node:os").tmpdir(), "node-policy-uploads"),
  limits: { fileSize: 25 * 1024 * 1024 },
});
app.use(express.json());

app.post("/api/upload", upload.single("file"), (req, res, next) => {
  if (!req.file)
    return res
      .status(400)
      .json({ error: "Upload a CSV using the file field." });
  if (path.extname(req.file.originalname).toLowerCase() !== ".csv") {
    fs.unlink(req.file.path, () => {});
    return res
      .status(415)
      .json({ error: "Only CSV files are currently supported." });
  }
  const worker = new Worker(path.join(__dirname, "import-worker.js"), {
    workerData: {
      filePath: req.file.path,
      mongoUri:
        process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/node_policy",
    },
  });
  worker.once("message", (result) => {
    fs.unlink(req.file.path, () => {});
    if (result.error) return res.status(500).json({ error: result.error });
    res.json({ message: "Import complete.", ...result });
  });
  worker.once("error", (error) => {
    fs.unlink(req.file.path, () => {});
    next(error);
  });
});

app.get("/api/policies/search", async (req, res, next) => {
  try {
    const username = String(req.query.username || "").trim();
    if (!username)
      return res
        .status(400)
        .json({ error: "username query parameter is required." });
    const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const users = await User.find({
      firstName: new RegExp(`^${escapedUsername}$`, "i"),
    }).select("_id");
    const policies = await Policy.find({
      userId: { $in: users.map((user) => user._id) },
    })
      .populate("userId")
      .populate("policyCategoryId")
      .populate("companyId")
      .populate("agentId")
      .populate("accountId");
    res.json({ username, count: policies.length, policies });
  } catch (error) {
    next(error);
  }
});

app.get("/api/policies/aggregate", async (_req, res, next) => {
  try {
    const result = await Policy.aggregate([
      {
        $group: {
          _id: "$userId",
          policyCount: { $sum: 1 },
          policies: { $push: "$$ROOT" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $project: { _id: 0, user: 1, policyCount: 1, policies: 1 } },
      { $sort: { "user.firstName": 1 } },
    ]);
    res.json({ users: result });
  } catch (error) {
    next(error);
  }
});

app.post("/api/messages", async (req, res, next) => {
  try {
    const { message, day, time } = req.body || {};
    if (
      typeof message !== "string" ||
      !message.trim() ||
      typeof day !== "string" ||
      typeof time !== "string"
    ) {
      return res
        .status(400)
        .json({
          error: "message, day (YYYY-MM-DD), and time (HH:mm) are required.",
        });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) {
      return res
        .status(400)
        .json({ error: "day must use YYYY-MM-DD and time must use HH:mm." });
    }
    const scheduledAt = new Date(`${day}T${time}:00`);
    if (
      Number.isNaN(scheduledAt.getTime()) ||
      scheduledAt.getFullYear() !== Number(day.slice(0, 4)) ||
      scheduledAt.getMonth() + 1 !== Number(day.slice(5, 7)) ||
      scheduledAt.getDate() !== Number(day.slice(8, 10)) ||
      scheduledAt.getHours() !== Number(time.slice(0, 2)) ||
      scheduledAt.getMinutes() !== Number(time.slice(3, 5))
    ) {
      return res
        .status(400)
        .json({ error: "The scheduled date and time are invalid." });
    }
    if (scheduledAt <= new Date())
      return res
        .status(400)
        .json({ error: "The scheduled time must be in the future." });
    const scheduled = await ScheduledMessage.create({
      message: message.trim(),
      scheduledAt,
    });
    res
      .status(202)
      .json({ message: "Message scheduled.", id: scheduled.id, scheduledAt });
  } catch (error) {
    next(error);
  }
});

async function deliverDueMessages() {
  const due = await ScheduledMessage.find({
    delivered: false,
    scheduledAt: { $lte: new Date() },
  }).limit(100);
  for (const job of due) {
    await Message.findOneAndUpdate(
      { scheduledJobId: job._id },
      {
        $setOnInsert: {
          scheduledJobId: job._id,
          message: job.message,
          scheduledAt: job.scheduledAt,
        },
      },
      { upsert: true, new: true },
    );
    await ScheduledMessage.updateOne(
      { _id: job._id, delivered: false },
      { $set: { delivered: true } },
    );
  }
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message || "Internal server error." });
});

const port = Number(process.env.PORT) || 3000;
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/node_policy")
  .then(() => {
    deliverDueMessages().catch(console.error);
    setInterval(() => deliverDueMessages().catch(console.error), 1000).unref();
    app.listen(port, () => console.log(`Policy API listening on port ${port}`));
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
