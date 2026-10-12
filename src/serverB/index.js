const config = require('../config');
const { createServerBApp } = require('./serverB');

const app = createServerBApp();
const server = app.listen(config.PORT_SERVER_B, () => {
  console.log(`[Server B] Berjalan di port ${config.PORT_SERVER_B} (${config.SERVER_B_URL})`);
});

module.exports = server;
