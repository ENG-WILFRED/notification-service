#!/bin/bash

# Notification Service - Quick Start Guide

set -e

echo "🚀 Starting Notification Service..."
echo ""

# Check if Docker is running
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

echo "1️⃣  Starting Kafka & Zookeeper..."
docker-compose up -d
sleep 3

echo ""
echo "2️⃣  Installing dependencies..."
npm install

echo ""
echo "3️⃣  Starting Producer API in background..."
npm start &
PRODUCER_PID=$!
sleep 2

echo ""
echo "✅ Setup complete!"
echo ""
echo "📊 API available at: http://localhost:3000"
echo "📖 Swagger docs at: http://localhost:3000/api-docs"
echo "🔌 Kafka broker at: localhost:9092"
echo ""
echo "4️⃣  Starting Consumer (in new terminal):"
echo "   npm run consumer"
echo ""
echo "5️⃣  Test with:"
echo '   curl -X POST http://localhost:3000/notify \'
echo '     -H "Content-Type: application/json" \'
echo '     -d "{"to":"user@example.com","channel":"email","template":"welcome_email","data":{"name":"Alice","message":"Hello"}}"'
echo ""
echo "Press Ctrl+C to stop producer"
wait $PRODUCER_PID
