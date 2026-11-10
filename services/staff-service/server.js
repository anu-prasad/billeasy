require('dotenv').config();
const app = require('./src/app');

const PORT = Number(process.env.PORT) || 4005;

app.listen(PORT, () => {
  console.log(`[staff-service] listening on port ${PORT}`);
});