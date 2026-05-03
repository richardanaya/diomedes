#!/usr/bin/env node
import { main } from "../dist/server.js";

const { shutdown } = await main();

// Forward termination signals
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);