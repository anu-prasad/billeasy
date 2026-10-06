require('dotenv').config();
const app = require('./src/app');

const PORT = Number(process.env.PORT) || 4001;

app.listen(PORT, () => {
  console.log(`[auth-service] listening on port ${PORT}`);
});