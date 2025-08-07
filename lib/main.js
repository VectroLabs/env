
const fs = require("node:fs");
const path = require("node:path");

/**
 * Loads environment variables from a .env file
 * @param {Object} options - Configuration options
 * @param {string} options.file - Path to the .env file (default: '.env')
 * @param {boolean} options.override - Whether to override existing process.env variables (default: false)
 * @param {string} options.encoding - File encoding (default: 'utf8')
 * @returns {Object} Parsed environment variables
 */
function load(options = {}) {
  const opt = {
    file: ".env",
    override: false,
    encoding: "utf8",
    ...options
  };

  const filePath = path.resolve(process.cwd(), opt.file);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(filePath, opt.encoding);
    const parsed = parse(content);
    
    // Populate process.env by default, respecting override setting
    populate(parsed, opt.override);
    
    return parsed;
  } catch (error) {
    throw new Error(`Failed to load env file '${filePath}': ${error.message}`);
  }
}

/**
 * Parses .env file content into key-value pairs
 * @param {string} content - File content to parse
 * @returns {Object} Parsed environment variables
 */
function parse(content) {
  const result = {};
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Skip empty lines and comments
    if (!line || line.startsWith("#")) {
      continue;
    }

    // Handle multi-line values (quoted with backslash continuation)
    while (line.endsWith("\\") && i + 1 < lines.length) {
      line = line.slice(0, -1) + lines[++i].trim();
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue; // Skip malformed lines
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (!key) {
      continue; // Skip lines without keys
    }

    // Handle quoted values
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
      // Unescape common escape sequences
      value = value.replace(/\\n/g, "\n")
                   .replace(/\\r/g, "\r")
                   .replace(/\\t/g, "\t")
                   .replace(/\\\\/g, "\\")
                   .replace(/\\"/g, '"')
                   .replace(/\\'/g, "'");
    }

    // Handle variable expansion ${VAR} or $VAR
    value = expandVariables(value, result);

    result[key] = value;
  }

  return result;
}

/**
 * Expands variables in values (${VAR} or $VAR format)
 * @param {string} value - Value to expand
 * @param {Object} parsed - Already parsed variables
 * @returns {string} Expanded value
 */
function expandVariables(value, parsed) {
  return value.replace(/\$\{([^}]+)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (match, braced, unbraced) => {
    const varName = braced || unbraced;
    return parsed[varName] || process.env[varName] || "";
  });
}

/**
 * Populates process.env with parsed variables
 * @param {Object} parsed - Parsed environment variables
 * @param {boolean} override - Whether to override existing variables
 */
function populate(parsed, override = false) {
  for (const [key, value] of Object.entries(parsed)) {
    if (override || !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

/**
 * Loads and populates process.env in one call
 * @param {Object} options - Configuration options
 * @returns {Object} Parsed environment variables
 */
function config(options = {}) {
  const result = load({ override: true, ...options });
  return { parsed: result };
}

module.exports = {
  load,
  parse,
  config
};
