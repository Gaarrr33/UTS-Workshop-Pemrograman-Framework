const config = require('../config');
const { createServerAApp } = require('./serverA');

const app = createServerAApp();
const server = app.listen(config.PORT_SERVER_A, () => {
  console.log(`[Server A] Berjalan di port ${config.PORT_SERVER_A} (${config.SERVER_A_URL})`);
});

module.exports = server;
