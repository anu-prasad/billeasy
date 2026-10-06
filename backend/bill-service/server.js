require('dotenv').config();
const app = require('./src/app');

const PORT = Number(process.env.PORT) || 4004;

app.listen(PORT, () => {
  console.log(`[bill-service] listening on port ${PORT}`);
});