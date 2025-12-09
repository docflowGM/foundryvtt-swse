#!/bin/bash

#######################################
# SWSE Developer Setup Script
# Sets up development environment for
# Star Wars Saga Edition system
#######################################

set -e  # Exit on error

echo "🚀 SWSE Developer Setup"
echo "========================"
echo ""

# Check for Node.js
echo "📦 Checking for Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "   Please install Node.js 16 or higher from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old"
    echo "   Please install Node.js 16 or higher"
    exit 1
fi

echo "✅ Node.js $(node -v) found"

# Check for npm
echo "📦 Checking for npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

echo "✅ npm $(npm -v) found"

# Install dependencies
echo ""
echo "📥 Installing dependencies..."
npm install

echo "✅ Dependencies installed"

# Build styles
echo ""
echo "🎨 Building styles..."
npm run build:styles

echo "✅ Styles built"

# Run data validation
echo ""
echo "🔍 Validating data files..."
if node tools/validate-data.js; then
    echo "✅ Data validation passed"
else
    echo "⚠️  Data validation had warnings (see above)"
fi

# Check for Foundry installation
echo ""
echo "🎮 Checking for Foundry VTT installation..."
FOUNDRY_PATHS=(
    "$HOME/FoundryVTT/Data/systems"
    "$HOME/.local/share/FoundryVTT/Data/systems"
    "/usr/local/share/FoundryVTT/Data/systems"
    "$HOME/Library/Application Support/FoundryVTT/Data/systems"
)

FOUNDRY_FOUND=false
for path in "${FOUNDRY_PATHS[@]}"; do
    if [ -d "$path" ]; then
        echo "✅ Foundry data directory found: $path"
        echo ""
        echo "📝 To link this system to Foundry, run:"
        echo "   ln -s $(pwd) \"$path/swse\""
        echo ""
        FOUNDRY_FOUND=true
        break
    fi
done

if [ "$FOUNDRY_FOUND" = false ]; then
    echo "⚠️  Foundry VTT data directory not found in standard locations"
    echo "   You'll need to manually link this directory to your Foundry systems folder"
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file..."
    cat > .env <<EOF
# SWSE Development Environment
# Add your environment-specific configuration here

# Enable development mode
DEV_MODE=true

# Foundry data path (optional)
# FOUNDRY_DATA_PATH=/path/to/FoundryVTT/Data
EOF
    echo "✅ .env file created"
fi

# Print next steps
echo ""
echo "========================"
echo "✅ Setup Complete!"
echo "========================"
echo ""
echo "📖 Next Steps:"
echo ""
echo "1. Link to Foundry (if not already done):"
echo "   ln -s $(pwd) /path/to/FoundryVTT/Data/systems/swse"
echo ""
echo "2. Start development:"
echo "   npm run watch:styles  # Watch for style changes"
echo ""
echo "3. Run linting:"
echo "   npm run lint          # Check for code issues"
echo "   npm run lint:fix      # Auto-fix issues"
echo ""
echo "4. Format code:"
echo "   npm run format        # Format all files"
echo ""
echo "5. Validate data:"
echo "   node tools/validate-data.js"
echo ""
echo "6. Read the docs:"
echo "   - CONTRIBUTING.md     # Contribution guidelines"
echo "   - migrations/README.md # Migration documentation"
echo "   - docs/               # Technical documentation"
echo ""
echo "Happy coding! 🎉"
