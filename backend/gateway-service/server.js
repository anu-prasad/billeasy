require('dotenv').config();
const app = require('./src/app');

const PORT = Number(process.env.GATEWAY_PORT) || 4000;

app.listen(PORT, () => {
  console.log(`[gateway-service] listening on port ${PORT}`);
});