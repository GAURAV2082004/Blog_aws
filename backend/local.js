// Local dev server: `npm run dev`. Not used on Lambda (handler.js is).
require('dotenv').config();
if (!process.env.USER_POOL_ID) process.env.DEV_AUTH = 'true';

const app = require('./app');
const db = require('./db');
const { seed } = require('./seed');

const port = process.env.PORT || 3001;
(async () => {
  if (!process.env.TABLE_NAME) await seed(db);
  app.listen(port, () => {
    const auth = process.env.DEV_AUTH === 'true' ? 'demo auth' : 'Cognito auth';
    const store = process.env.TABLE_NAME ? `DynamoDB (${process.env.TABLE_NAME})` : 'in-memory store';
    console.log(`API on http://localhost:${port}  |  ${auth}  |  ${store}`);
  });
})();
