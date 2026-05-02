require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const priceSimulator = require('./utils/priceSimulator');
const { seedCrypto } = require('./utils/seedCrypto');

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  await seedCrypto();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  priceSimulator.start();
});
