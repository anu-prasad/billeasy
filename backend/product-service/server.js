require('dotenv').config();
const app = require('./src/app');

const PORT = Number(process.env.PORT) || 4003;

app.listen(PORT, () => {
  console.log(`[product-service] listening on port ${PORT}`);
});