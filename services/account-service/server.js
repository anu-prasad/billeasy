require('dotenv').config();
const app = require('./src/app');

const PORT = Number(process.env.PORT) || 4002;

app.listen(PORT, () => {
  console.log(`[account-service] listening on port ${PORT}`);
});