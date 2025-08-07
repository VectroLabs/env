
const fs = require("node:fs");
const path = require("node:path");

/**
 * Loads environment variables from a .env file
 * @param {Object} options - Configuration options
 * @param {string} options.file - Path to the .env file (default: '.env')
 * @param {boolean} options.override - Whether to override existing process.env variables (default: false)
 * @param {string} options.encoding - File encoding (default: 'utf8')
 * @param {Object} options.schema - Schema for validation and type conversion
 * @returns {Object} Parsed environment variables
 */
function load(options = {}) {
  const opt = {
    file: ".env",
    override: false,
    encoding: "utf8",
    schema: null,
    ...options
  };

  const filePath = path.resolve(process.cwd(), opt.file);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(filePath, opt.encoding);
    let parsed = parse(content);
    
    // Apply schema validation and type conversion if provided
    if (opt.schema) {
      parsed = validateAndConvert(parsed, opt.schema);
    }
    
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
 * Validates and converts environment variables according to schema
 * @param {Object} parsed - Parsed environment variables
 * @param {Object} schema - Schema definition
 * @returns {Object} Validated and converted variables
 */
function validateAndConvert(parsed, schema) {
  const result = {};
  const errors = [];

  // Check required variables
  if (schema.required) {
    for (const key of schema.required) {
      if (!(key in parsed)) {
        errors.push(`Required environment variable '${key}' is missing`);
      }
    }
  }

  // Process all variables in schema
  if (schema.variables) {
    for (const [key, config] of Object.entries(schema.variables)) {
      const value = parsed[key];
      
      if (value === undefined) {
        if (config.default !== undefined) {
          result[key] = config.default;
        }
        continue;
      }

      try {
        result[key] = convertType(value, config.type || 'string');
      } catch (error) {
        errors.push(`Invalid type for '${key}': ${error.message}`);
      }
    }
  }

  // Include variables not in schema
  for (const [key, value] of Object.entries(parsed)) {
    if (!schema.variables || !(key in schema.variables)) {
      result[key] = value;
    }
  }

  if (errors.length > 0) {
    throw new Error(`Schema validation failed:\n${errors.join('\n')}`);
  }

  return result;
}

/**
 * Converts string value to specified type
 * @param {string} value - Value to convert
 * @param {string} type - Target type (string, number, boolean, array)
 * @returns {*} Converted value
 */
function convertType(value, type) {
  switch (type) {
    case 'string':
      return value;
    case 'number':
      const num = Number(value);
      if (isNaN(num)) {
        throw new Error(`Cannot convert '${value}' to number`);
      }
      return num;
    case 'boolean':
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') return true;
      if (lower === 'false' || lower === '0' || lower === 'no') return false;
      throw new Error(`Cannot convert '${value}' to boolean`);
    case 'array':
      return value.split(',').map(item => item.trim());
    default:
      throw new Error(`Unknown type: ${type}`);
  }
}

/**
 * Generates .env file content from process.env or provided object
 * @param {Object} options - Generation options
 * @param {Object} options.source - Source object (default: process.env)
 * @param {Array} options.include - Keys to include (default: all)
 * @param {Array} options.exclude - Keys to exclude
 * @param {boolean} options.sort - Sort keys alphabetically (default: true)
 * @returns {string} .env file content
 */
function generate(options = {}) {
  const opt = {
    source: process.env,
    include: null,
    exclude: [],
    sort: true,
    ...options
  };

  let keys = Object.keys(opt.source);

  // Filter keys
  if (opt.include) {
    keys = keys.filter(key => opt.include.includes(key));
  }
  if (opt.exclude.length > 0) {
    keys = keys.filter(key => !opt.exclude.includes(key));
  }

  // Sort keys
  if (opt.sort) {
    keys.sort();
  }

  // Generate content
  const lines = keys.map(key => {
    const value = opt.source[key];
    // Quote values that contain spaces or special characters
    const needsQuotes = /[\s"'${}\\]/.test(value);
    const quotedValue = needsQuotes ? `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` : value;
    return `${key}=${quotedValue}`;
  });

  return lines.join('\n');
}

/**
 * Saves generated .env content to file
 * @param {string} filePath - Target file path
 * @param {Object} options - Generation options (same as generate())
 */
function export(filePath, options = {}) {
  const content = generate(options);
  fs.writeFileSync(filePath, content, 'utf8');
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
  config,
  validateAndConvert,
  convertType,
  generate,
  export
};
