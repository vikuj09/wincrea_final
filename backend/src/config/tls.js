const fs = require('fs');
const path = require('path');

function databaseTLS(env = process.env) {
  if (env.DB_SSL === 'false') return undefined;
  if (env.DB_SSL_CA) return { ca: env.DB_SSL_CA.replace(/\\n/g, '\n'), rejectUnauthorized: true };
  const candidates = [env.DB_SSL_CA_FILE, path.join(__dirname, 'ca.pem')].filter(Boolean);
  const file = candidates.find(candidate => fs.existsSync(candidate));
  if (!file) throw new Error('Database CA certificate missing. Set DB_SSL_CA or DB_SSL_CA_FILE.');
  return { ca: fs.readFileSync(file, 'utf8'), rejectUnauthorized: true };
}
module.exports = { databaseTLS };
