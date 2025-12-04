#!/bin/bash

# Converge-NPS Development Server Startup Script
# This script starts both frontend and backend servers for iPhone testing

echo "🚀 Starting Converge-NPS Development Servers..."
echo ""

# Get the script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get local IP address
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

echo -e "${BLUE}📍 Your Mac's IP address: ${GREEN}$LOCAL_IP${NC}"
echo ""

# Check if ports are already in use
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 5173 is already in use. Killing existing process...${NC}"
    kill -9 $(lsof -ti:5173) 2>/dev/null
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 3000 is already in use. Killing existing process...${NC}"
    kill -9 $(lsof -ti:3000) 2>/dev/null
fi

echo ""
echo -e "${BLUE}Starting Backend Server...${NC}"
cd "$SCRIPT_DIR/backend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    npm install
fi

# Start backend in background
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
echo -e "${BLUE}   Log file: backend.log${NC}"

sleep 2

echo ""
echo -e "${BLUE}Starting Frontend Server...${NC}"
cd "$SCRIPT_DIR/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
fi

# Start frontend in background with network access
npm run dev -- --host 0.0.0.0 > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
echo -e "${BLUE}   Log file: frontend.log${NC}"

sleep 3

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Servers are running!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📱 Access from your iPhone:${NC}"
echo -e "${GREEN}   http://$LOCAL_IP:5173${NC}"
echo ""
echo -e "${BLUE}💻 Access from your Mac:${NC}"
echo -e "${GREEN}   http://localhost:5173${NC}"
echo ""
echo -e "${BLUE}🔧 Backend API:${NC}"
echo -e "${GREEN}   http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}📋 Important:${NC}"
echo -e "   • Make sure your iPhone is on the same WiFi network"
echo -e "   • Use Safari on your iPhone (not Chrome)"
echo -e "   • Check firewall settings if you can't connect"
echo ""
echo -e "${BLUE}To stop the servers:${NC}"
echo -e "   ${GREEN}./stop-dev.sh${NC}"
echo ""
echo -e "${BLUE}To view logs:${NC}"
echo -e "   Frontend: ${GREEN}tail -f frontend.log${NC}"
echo -e "   Backend:  ${GREEN}tail -f backend.log${NC}"
echo ""

# Save PIDs for cleanup
echo "$FRONTEND_PID" > .frontend.pid
echo "$BACKEND_PID" > .backend.pid

echo -e "${GREEN}Servers are running in the background.${NC}"
echo -e "${YELLOW}Press Ctrl+C or run ./stop-dev.sh to stop them.${NC}"
echo ""

# Keep script running and show live logs
echo -e "${BLUE}Showing live frontend logs (Ctrl+C to exit):${NC}"
echo ""
tail -f frontend.log
