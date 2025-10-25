const dotenv = require("dotenv");
const mongoose = require("mongoose");
const createApp = require("./app");

dotenv.config();

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const app = createApp();

// If MONGO_URI is provided, connect (production/dev). Tests should handle their own connection.
if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      // eslint-disable-next-line no-console
      console.log("Connected to MongoDB");
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("MongoDB connection error:", err);
    });
}

if (require.main === module) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
