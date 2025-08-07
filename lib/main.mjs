
// ESM wrapper for the CommonJS module
const envModule = await import('./main.js');

// Re-export all functions from the CommonJS module
export const {
  load,
  parse,
  config,
  validateAndConvert,
  convertType,
  generate,
  export: exportToFile
} = envModule.default;

// Also provide a default export for convenience
export default envModule.default;
