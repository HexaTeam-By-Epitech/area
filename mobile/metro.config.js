const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname, {
  // Disable web support for simpler configuration
  isCSSEnabled: false,
});

// Force ASCII output to avoid serialization issues
config.transformer.minifierConfig = {
  output: {
    ascii_only: true,
    beautify: false,
    comments: false,
  },
};

// Simplified resolver to avoid complex module resolution
config.resolver.assetExts.push('db', 'mp3', 'ttf', 'obj', 'png', 'jpg');

module.exports = config;
