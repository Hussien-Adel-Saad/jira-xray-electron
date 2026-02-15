#!/bin/bash

# Quick Start Script for Jira/Xray Orchestrator
# This script helps you get started quickly

set -e

echo "🚀 Jira/Xray Orchestrator - Quick Start"
echo "======================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version is too old (found v$NODE_VERSION, need v18+)"
    echo "Please upgrade Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    exit 1
fi

echo "✅ npm $(npm -v) detected"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found!"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo "📦 Installing dependencies..."
echo ""

# Install dependencies
npm install

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Installation failed!"
    echo ""
    echo "Common issues:"
    echo "1. Windows: Install windows-build-tools"
    echo "   npm install --global windows-build-tools"
    echo ""
    echo "2. Linux: Install required packages"
    echo "   sudo apt-get install libsecret-1-dev build-essential"
    echo ""
    echo "3. macOS: Install Xcode Command Line Tools"
    echo "   xcode-select --install"
    exit 1
fi

echo ""
echo "✅ Dependencies installed successfully!"
echo ""

# Run type check
echo "🔍 Running TypeScript checks..."
npm run type-check

if [ $? -ne 0 ]; then
    echo "⚠️  TypeScript errors found (non-critical)"
else
    echo "✅ TypeScript checks passed"
fi

echo ""
echo "======================================="
echo "🎉 Setup Complete!"
echo "======================================="
echo ""
echo "To start the application:"
echo ""
echo "  npm run electron:dev"
echo ""
echo "To build for production:"
echo ""
echo "  npm run electron:build"
echo ""
echo "📚 Documentation:"
echo "  - INSTALLATION.md - Installation guide"
echo "  - DEVELOPMENT.md  - Development guide"
echo "  - ARCHITECTURE.md - System architecture"
echo "  - CHECKLIST.md    - Complete file list"
echo ""
echo "Happy coding! 🚀"