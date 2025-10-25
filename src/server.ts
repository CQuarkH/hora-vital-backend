// src/server.ts
import app from "./app";
import { PORT } from "./config";
import prisma from "./db/prisma";
import { startCronJobs } from "./services/cronService";

const start = async () => {
  try {
    await prisma.$connect();
    console.log("✅ DB connected");

    startCronJobs();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start", err);
    process.exit(1);
  }
};

start();
