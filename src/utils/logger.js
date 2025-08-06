const originalLog = console.log.bind(console);
const isDebug = process.env.DEBUG === 'true' || process.env.DEBUG === '1';

if (!isDebug) {
  console.log = () => {};
}

module.exports = {
  debug: (...args) => {
    if (isDebug) {
      originalLog(...args);
    }
  },
  info: (...args) => originalLog(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};
