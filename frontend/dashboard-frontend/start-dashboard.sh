#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Animal Bite Dashboard Setup   ${NC}"
    echo -e "${BLUE}================================${NC}"
    echo
}

# Main execution
print_header

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found! Make sure you're in the dashboard directory."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    
    if [ $? -ne 0 ]; then
        print_error "Failed to install dependencies!"
        exit 1
    fi
else
    print_status "Dependencies already installed."
fi

print_status "Starting Animal Bite Dashboard..."
print_status "Dashboard will open on: http://localhost:3000"
print_warning "Make sure your Flask backend is running on http://localhost:5000"

echo
print_status "Press Ctrl+C to stop the dashboard"
echo

# Start the development server
npm run dev

# If we get here, the server was stopped
print_status "Dashboard stopped."