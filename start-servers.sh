#!/bin/bash

# Converge-NPS Server Startup Script
# This script starts both backend and frontend servers

echo "🚀 Starting Converge-NPS Servers..."
echo ""

# Kill existing processes
echo "📋 Cleaning up existing processes..."
pkill -f "ts-node src/server.ts" 2>/dev/null
pkill -f "nodemon" 2>/dev/null
pkill -f "vite" 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
sleep 2

# Get network IP
NETWORK_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
echo "📡 Network IP: $NETWORK_IP"
echo ""

# Start backend in new terminal with redis check
echo "🔧 Starting Backend Server..."
osascript -e "tell application \"Terminal\"
    do script \"echo '🔧 Starting Backend...' && echo 'Checking Redis...' && redis-cli ping && echo '✓ Redis is running' || echo '⚠️  Redis is not running - starting it...' && redis-server --daemonize yes && sleep 2 && echo '✓ Redis started' ; cd /Users/timmartin/.claude-worktrees/Product-Creator-Multi-Agent-/Converge-NPS/backend && npm run dev\"
end tell" > /dev/null 2>&1

sleep 5

# Start frontend in new terminal
echo "🎨 Starting Frontend Server..."
osascript -e "tell application \"Terminal\"
    do script \"echo '🎨 Starting Frontend...' && cd /Users/timmartin/.claude-worktrees/Product-Creator-Multi-Agent-/Converge-NPS/frontend && npm run dev\"
end tell" > /dev/null 2>&1

sleep 5

echo ""
echo "✅ Servers starting in separate Terminal windows..."
echo "   → Backend window will show backend logs"
echo "   → Frontend window will show frontend logs"
echo ""

# Wait and check if servers are up
echo "⏳ Waiting for servers to start..."
sleep 10

# Check backend
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Backend is running on http://localhost:3000"
else
    echo "⚠️  Backend may not be running - check the backend terminal window for errors"
fi

# Check frontend
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Frontend is running on http://localhost:5173"
else
    echo "⚠️  Frontend may not be running - check the frontend terminal window for errors"
fi

echo ""
echo "📱 Access on iPhone:"
echo "   http://$NETWORK_IP:5173"
echo ""
echo "🔐 Login credentials:"
echo "   Email: admin@converge-nps.com"
echo "   Password: Admin123!"
echo ""
echo "ℹ️  Make sure your iPhone is on the same WiFi network!"
