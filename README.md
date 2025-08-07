
<div align="center">

# 🌱 @vectrolabs/env

<p align="center">
  <strong>A powerful, feature-rich environment variable loader for Node.js</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/@vectrolabs/env?style=flat-square" alt="npm version">
  <img src="https://img.shields.io/github/license/VectroLabs/env?style=flat-square" alt="License">
  <img src="https://img.shields.io/node/v/@vectrolabs/env?style=flat-square" alt="Node.js Version">
</p>

<p align="center">
  Load environment variables from <code>.env</code> files with advanced features like schema validation, type conversion, variable expansion, and more!
</p>

</div>

---

## ✨ Features

<div align="center">

| Feature | Description |
|---------|-------------|
| 🔧 **Schema Validation** | Validate and type-convert environment variables |
| 🔄 **Variable Expansion** | Support for `${VAR}` and `$VAR` syntax with cycle detection |
| 📝 **Type Conversion** | Convert to string, number, boolean, array, or JSON |
| 🛡️ **Error Handling** | Comprehensive error messages and validation |
| 🎯 **Flexible Loading** | Multiple loading options and configurations |
| 📤 **Export Functionality** | Generate `.env` files from current environment |

</div>

## 🚀 Installation

```bash
npm install @vectrolabs/env
```

## 📖 Quick Start

<div align="center">

### Basic Usage

</div>

```javascript
const env = require('@vectrolabs/env');

// Load .env file
env.config();

// Or with options
const result = env.load({
  file: '.env.local',
  override: true
});
```

<div align="center">

### With Schema Validation

</div>

```javascript
const schema = {
  required: ['DATABASE_URL', 'API_KEY'],
  variables: {
    PORT: { type: 'number', default: 3000 },
    DEBUG: { type: 'boolean', default: false },
    ALLOWED_HOSTS: { type: 'array' },
    CONFIG: { type: 'json' }
  }
};

const result = env.load({ schema });
```

## 🔧 API Reference

<div align="center">

### Core Functions

</div>

#### `load(options)`

Loads environment variables from a `.env` file with full configuration support.

**Parameters:**
- `options` (Object, optional):
  - `file` (string): Path to .env file (default: `'.env'`)
  - `override` (boolean): Override existing process.env variables (default: `false`)
  - `encoding` (string): File encoding (default: `'utf8'`)
  - `schema` (Object): Schema for validation and type conversion

**Returns:** Object with parsed environment variables

```javascript
const result = env.load({
  file: '.env.production',
  override: true,
  schema: {
    required: ['DATABASE_URL'],
    variables: {
      PORT: { type: 'number', default: 8080 }
    }
  }
});
```

#### `parse(content)`

Parses `.env` file content into key-value pairs.

**Parameters:**
- `content` (string): Raw .env file content

**Returns:** Object with parsed variables

```javascript
const content = 'PORT=3000\nDEBUG=true';
const parsed = env.parse(content);
// { PORT: '3000', DEBUG: 'true' }
```

#### `config(options)`

Convenience method that loads and populates `process.env` in one call.

**Parameters:**
- `options` (Object, optional): Same as `load()` options

**Returns:** Object with `parsed` property containing the variables

```javascript
const { parsed } = env.config({ file: '.env.local' });
```

#### `generate(options)`

Generates `.env` file content from environment variables.

**Parameters:**
- `options` (Object, optional):
  - `source` (Object): Source object (default: `process.env`)
  - `include` (Array): Keys to include
  - `exclude` (Array): Keys to exclude
  - `sort` (boolean): Sort keys alphabetically (default: `true`)

**Returns:** String with .env file content

```javascript
const content = env.generate({
  source: { PORT: '3000', DEBUG: 'true' },
  exclude: ['NODE_ENV']
});
```

#### `export(filePath, options)`

Saves generated `.env` content to a file.

**Parameters:**
- `filePath` (string): Target file path
- `options` (Object, optional): Same as `generate()` options

```javascript
env.export('.env.backup', {
  exclude: ['TEMP_VAR']
});
```

<div align="center">

### Schema Configuration

</div>

Schemas provide powerful validation and type conversion capabilities:

```javascript
const schema = {
  // Required variables (must be present and non-empty)
  required: ['DATABASE_URL', 'API_SECRET'],
  
  // Variable definitions with types and defaults
  variables: {
    // Numbers
    PORT: { type: 'number', default: 3000 },
    TIMEOUT: { type: 'number' },
    
    // Booleans
    DEBUG: { type: 'boolean', default: false },
    ENABLE_CACHE: { type: 'boolean' },
    
    // Arrays (comma-separated)
    ALLOWED_HOSTS: { type: 'array', default: ['localhost'] },
    CORS_ORIGINS: { type: 'array' },
    
    // JSON objects
    DATABASE_CONFIG: { type: 'json' },
    FEATURE_FLAGS: { type: 'json', default: {} },
    
    // Strings (default type)
    APP_NAME: { default: 'My App' },
    LOG_LEVEL: { type: 'string' }
  }
};
```

<div align="center">

### Supported Types

</div>

| Type | Description | Examples |
|------|-------------|----------|
| `string` | Plain text (default) | `"Hello World"` |
| `number` | Numeric values | `42`, `3.14`, `Infinity` |
| `boolean` | Boolean values | `true`, `false`, `1`, `0`, `yes`, `no` |
| `array` | Comma-separated lists | `"a,b,c"` → `['a', 'b', 'c']` |
| `json` | JSON objects/arrays | `'{"key": "value"}'` |

<div align="center">

### Variable Expansion

</div>

The library supports variable expansion with both `${VAR}` and `$VAR` syntax:

```bash
# .env file
BASE_URL=https://api.example.com
API_ENDPOINT=${BASE_URL}/v1
DATABASE_URL=postgres://user:pass@${DB_HOST}:${DB_PORT}/mydb

# Advanced expansion
HOME_DIR=/home/user
CONFIG_DIR=${HOME_DIR}/config
LOG_FILE=${CONFIG_DIR}/app.log
```

**Features:**
- ✅ Circular reference detection
- ✅ Nested variable expansion
- ✅ Fallback to `process.env` if variable not found
- ✅ Depth limit protection (max 100 levels)

## 📁 File Format Support

<div align="center">

### Basic Syntax

</div>

```bash
# Comments start with #
DATABASE_URL=postgres://localhost/mydb
API_KEY=your-secret-key

# Quoted values
APP_NAME="My Awesome App"
DESCRIPTION='This is a "quoted" string'

# Multi-line values with backslash
LONG_TEXT=This is a very long \
text that spans multiple \
lines in the file

# Empty values
OPTIONAL_VAR=
```

<div align="center">

### Advanced Features

</div>

```bash
# Variable expansion
BASE_DIR=/app
LOG_DIR=${BASE_DIR}/logs
CONFIG_FILE=${BASE_DIR}/config/app.json

# Arrays (comma-separated)
ALLOWED_IPS=192.168.1.1,192.168.1.2,127.0.0.1
CORS_ORIGINS=http://localhost:3000,https://example.com

# JSON configuration
DATABASE_CONFIG={"host":"localhost","port":5432,"ssl":true}
FEATURE_FLAGS={"newUI":true,"betaFeatures":false}

# Boolean values
DEBUG=true
ENABLE_LOGGING=yes
MAINTENANCE_MODE=off
```

## 🛡️ Error Handling

The library provides comprehensive error handling with detailed messages:

```javascript
try {
  const result = env.load({
    schema: {
      required: ['DATABASE_URL'],
      variables: {
        PORT: { type: 'number' }
      }
    }
  });
} catch (error) {
  console.error('Environment loading failed:', error.message);
  // Detailed error messages for:
  // - Missing required variables
  // - Type conversion failures
  // - Circular references
  // - File access issues
}
```

## 🎯 Use Cases

<div align="center">

### Development Environment

</div>

```javascript
// .env.development
const env = require('@vectrolabs/env');

env.config({
  file: '.env.development',
  schema: {
    required: ['DATABASE_URL'],
    variables: {
      PORT: { type: 'number', default: 3000 },
      DEBUG: { type: 'boolean', default: true },
      LOG_LEVEL: { default: 'debug' }
    }
  }
});
```

<div align="center">

### Production Configuration

</div>

```javascript
// Production with validation
const env = require('@vectrolabs/env');

const { parsed } = env.config({
  file: '.env.production',
  override: true,
  schema: {
    required: ['DATABASE_URL', 'JWT_SECRET', 'REDIS_URL'],
    variables: {
      PORT: { type: 'number', default: 8080 },
      WORKERS: { type: 'number', default: 4 },
      ENABLE_CACHE: { type: 'boolean', default: true },
      ALLOWED_ORIGINS: { type: 'array' }
    }
  }
});

console.log(`Server starting on port ${process.env.PORT}`);
```

<div align="center">

### Configuration Export

</div>

```javascript
// Export current environment to file
const env = require('@vectrolabs/env');

// Backup current configuration
env.export('.env.backup');

// Export filtered configuration
env.export('.env.public', {
  exclude: ['JWT_SECRET', 'DATABASE_PASSWORD', 'API_KEYS']
});
```

## 🔒 Security Considerations

<div align="center">

### Best Practices

</div>

- ✅ Never commit `.env` files to version control
- ✅ Use different `.env` files for different environments
- ✅ Validate required variables with schemas
- ✅ Use the `exclude` option when exporting sensitive data
- ✅ Set appropriate file permissions on `.env` files

```bash
# Add to .gitignore
.env
.env.local
.env.*.local
```

## 📄 License

<div align="center">

This project is licensed under the GPL-3.0 License.

---

<p align="center">
  Made with ❤️ by <strong>VectroLabs</strong>
</p>

<p align="center">
  <a href="https://github.com/VectroLabs/env">GitHub</a> •
  <a href="https://github.com/VectroLabs/env/issues">Issues</a> •
  <a href="mailto:vectrolabs.official@gmail.com">Contact</a>
</p>

</div>
