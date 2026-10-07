const { ClamavService } = require('../dist/telegram-bot/clamav.service.js');
const { readClamavConfig } = require('../dist/config/clamav.js');

async function main() {
  const [host = '127.0.0.1', port = '3310'] = process.argv.slice(2);
  const values = {
    TELEGRAM_BUSINESS_FILE_SCAN_ENABLED: 'true',
    CLAMAV_HOST: host,
    CLAMAV_PORT: port,
  };
  const settings = readClamavConfig((key) => values[key]);
  const scanner = new ClamavService();
  // EICAR is a harmless antivirus test marker, kept in memory and never executed.
  const eicar = Buffer.from(
    'X5O!P%@AP[4\\PZX54(P^)7CC)7}$' +
      'EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*',
  );
  const clean = await scanner.scan(
    Buffer.from('Ordinary invoice test document.\n'),
    settings,
  );
  const detected = await scanner.scan(eicar, settings);
  if (clean.status !== 'clean' || detected.status !== 'infected') {
    throw new Error('ClamAV smoke check failed');
  }
  console.log(
    'ClamAV smoke check passed: clean document preserved; EICAR marker detected.',
  );
}

main().catch(() => {
  // Do not print raw connection/scanner errors or file contents.
  console.error(
    'ClamAV smoke check failed. Check private connectivity, startup, and signature updates.',
  );
  process.exitCode = 1;
});
