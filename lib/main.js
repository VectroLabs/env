
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
  // Input validation
  if (options !== null && typeof options !== 'object') {
    throw new Error(`Invalid options parameter: expected object, got ${typeof options}`);
  }

  const opt = {
    file: ".env",
    override: false,
    encoding: "utf8",
    schema: null,
    ...options
  };

  // Validate option types
  if (typeof opt.file !== 'string') {
    throw new Error(`Invalid file option: expected string, got ${typeof opt.file}`);
  }
  if (typeof opt.override !== 'boolean') {
    throw new Error(`Invalid override option: expected boolean, got ${typeof opt.override}`);
  }
  if (typeof opt.encoding !== 'string') {
    throw new Error(`Invalid encoding option: expected string, got ${typeof opt.encoding}`);
  }
  if (opt.schema !== null && typeof opt.schema !== 'object') {
    throw new Error(`Invalid schema option: expected object or null, got ${typeof opt.schema}`);
  }

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
    if (error.code === 'ENOENT') {
      throw new Error(`Environment file not found: ${filePath}`);
    } else if (error.code === 'EACCES') {
      throw new Error(`Permission denied reading environment file: ${filePath}`);
    } else if (error.code === 'EISDIR') {
      throw new Error(`Expected file but found directory: ${filePath}`);
    }
    throw new Error(`Failed to load environment file '${filePath}': ${error.message}`);
  }
}

/**
 * Parses .env file content into key-value pairs
 * @param {string} content - File content to parse
 * @returns {Object} Parsed environment variables
 */
function parse(content) {
  // Input validation
  if (typeof content !== 'string') {
    throw new Error(`Invalid content parameter: expected string, got ${typeof content}`);
  }
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
 * Expands variables in values (${VAR} or $VAR format) with cycle detection
 * Supports both ${VARIABLE} and $VARIABLE syntax
 * Prevents infinite loops by detecting circular references
 * @private
 * @param {string} value - Value to expand
 * @param {Object} parsed - Already parsed variables
 * @param {Set<string>} [visiting=new Set()] - Set of variables currently being expanded (for cycle detection)
 * @param {number} [depth=0] - Current expansion depth (for preventing deep recursion)
 * @returns {string} Expanded value
 * @throws {Error} If circular reference is detected or expansion depth exceeds limit
 */
function expandVariables(value, parsed, visiting = new Set(), depth = 0) {
  // Input validation
  if (typeof value !== 'string') {
    throw new Error(`Invalid value parameter: expected string, got ${typeof value}`);
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`Invalid parsed parameter: expected object, got ${typeof parsed}`);
  }

  // Prevent excessive recursion depth
  if (depth > 100) {
    throw new Error(`Variable expansion depth limit exceeded (>100). This may indicate a complex circular reference.`);
  }

  return value.replace(/\$\{([^}]+)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (match, braced, unbraced) => {
    const varName = braced || unbraced;
    
    // Check for circular reference
    if (visiting.has(varName)) {
      throw new Error(`Circular variable reference detected: ${Array.from(visiting).join(' -> ')} -> ${varName}`);
    }
    
    const replacement = parsed[varName] || process.env[varName];
    if (replacement === undefined) {
      return "";
    }
    
    // If replacement contains variables, expand them recursively
    if (replacement.includes('$')) {
      const newVisiting = new Set(visiting);
      newVisiting.add(varName);
      try {
        return expandVariables(replacement, parsed, newVisiting, depth + 1);
      } catch (error) {
        throw new Error(`Error expanding variable '${varName}': ${error.message}`);
      }
    }
    
    return replacement;
  });
}

/**
 * Populates process.env with parsed variables
 * @param {Object} parsed - Parsed environment variables
 * @param {boolean} override - Whether to override existing variables
 */
function populate(parsed, override = false) {
  // Input validation
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`Invalid parsed parameter: expected object, got ${typeof parsed}`);
  }
  if (typeof override !== 'boolean') {
    throw new Error(`Invalid override parameter: expected boolean, got ${typeof override}`);
  }
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
  // Input validation
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`Invalid parsed parameter: expected object, got ${typeof parsed}`);
  }
  if (typeof schema !== 'object' || schema === null) {
    throw new Error(`Invalid schema parameter: expected object, got ${typeof schema}`);
  }

  const result = {};
  const errors = [];

  // Validate schema structure
  if (schema.required && !Array.isArray(schema.required)) {
    throw new Error(`Invalid schema.required: expected array, got ${typeof schema.required}`);
  }
  if (schema.variables && typeof schema.variables !== 'object') {
    throw new Error(`Invalid schema.variables: expected object, got ${typeof schema.variables}`);
  }

  // Check required variables
  if (schema.required && schema.required.length > 0) {
    for (const key of schema.required) {
      if (typeof key !== 'string') {
        errors.push(`Invalid required variable name: expected string, got ${typeof key}`);
        continue;
      }
      if (!(key in parsed) || parsed[key] === '') {
        errors.push(`Required environment variable '${key}' is missing or empty`);
      }
    }
  }

  // Process all variables in schema
  if (schema.variables && Object.keys(schema.variables).length > 0) {
    for (const [key, config] of Object.entries(schema.variables)) {
      if (typeof config !== 'object' || config === null) {
        errors.push(`Invalid schema configuration for '${key}': expected object, got ${typeof config}`);
        continue;
      }

      const value = parsed[key];
      
      if (value === undefined || value === '') {
        if (config.default !== undefined) {
          result[key] = config.default;
        }
        continue;
      }

      try {
        result[key] = convertType(value, config.type || 'string', key);
      } catch (error) {
        errors.push(`Type conversion failed for variable '${key}' with value '${value}': ${error.message}`);
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
    throw new Error(`Schema validation failed with ${errors.length} error(s):\n${errors.map((err, i) => `  ${i + 1}. ${err}`).join('\n')}`);
  }

  return result;
}

/**
 * Converts string value to specified type with comprehensive edge case handling
 * @param {string} value - Value to convert
 * @param {string} type - Target type (string, number, boolean, array)
 * @param {string} [varName] - Variable name for better error messages
 * @returns {*} Converted value
 * @throws {Error} If conversion fails or type is unsupported
 */
function convertType(value, type, varName = 'unknown') {
  // Input validation
  if (typeof value !== 'string') {
    throw new Error(`Expected string value for conversion, got ${typeof value}`);
  }
  if (typeof type !== 'string') {
    throw new Error(`Expected string type, got ${typeof type}`);
  }

  const trimmedValue = value.trim();

  switch (type.toLowerCase()) {
    case 'string':
      return value;
      
    case 'number':
      // Handle empty strings
      if (trimmedValue === '') {
        throw new Error(`Empty string cannot be converted to number`);
      }
      
      // Handle special numeric values
      if (trimmedValue.toLowerCase() === 'infinity') return Infinity;
      if (trimmedValue.toLowerCase() === '-infinity') return -Infinity;
      if (trimmedValue.toLowerCase() === 'nan') return NaN;
      
      const num = Number(trimmedValue);
      if (isNaN(num)) {
        throw new Error(`'${value}' is not a valid number. Expected a numeric value or 'Infinity', '-Infinity', 'NaN'`);
      }
      return num;
      
    case 'boolean':
      // Handle empty strings
      if (trimmedValue === '') {
        throw new Error(`Empty string cannot be converted to boolean`);
      }
      
      const lower = trimmedValue.toLowerCase();
      const truthyValues = ['true', '1', 'yes', 'on', 'enabled'];
      const falsyValues = ['false', '0', 'no', 'off', 'disabled'];
      
      if (truthyValues.includes(lower)) return true;
      if (falsyValues.includes(lower)) return false;
      
      throw new Error(`'${value}' is not a valid boolean. Expected one of: ${[...truthyValues, ...falsyValues].join(', ')}`);
      
    case 'array':
      // Handle empty strings
      if (trimmedValue === '') {
        return [];
      }
      
      // Split and trim, filter out empty items
      const items = value.split(',')
        .map(item => item.trim())
        .filter(item => item !== '');
      
      return items;
      
    case 'json':
      try {
        return JSON.parse(value);
      } catch (error) {
        throw new Error(`Invalid JSON format: ${error.message}`);
      }
      
    default:
      const supportedTypes = ['string', 'number', 'boolean', 'array', 'json'];
      throw new Error(`Unsupported type '${type}'. Supported types: ${supportedTypes.join(', ')}`);
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
  // Input validation
  if (options !== null && typeof options !== 'object') {
    throw new Error(`Invalid options parameter: expected object, got ${typeof options}`);
  }
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
function exportToFile(filePath, options = {}) {
  // Input validation
  if (typeof filePath !== 'string') {
    throw new Error(`Invalid filePath parameter: expected string, got ${typeof filePath}`);
  }
  if (options !== null && typeof options !== 'object') {
    throw new Error(`Invalid options parameter: expected object, got ${typeof options}`);
  }
  
  try {
    const content = generate(options);
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (error) {
    throw new Error(`Failed to write environment file '${filePath}': ${error.message}`);
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
  config,
  validateAndConvert,
  convertType,
  generate,
  export: exportToFile
};
