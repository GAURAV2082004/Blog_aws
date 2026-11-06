// Lambda entry point: wraps the Express app so API Gateway events reach it.
const serverless = require('serverless-http');
const app = require('./app');

module.exports.handler = serverless(app);
