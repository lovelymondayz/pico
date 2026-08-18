#!/bin/bash
set -e

cd /root/pico

echo ">>> Pulling latest code..."
git pull origin main

echo ">>> Rebuilding Docker containers..."
docker compose build --no-cache && docker compose up -d --force-recreate

echo ">>> Done! Pico is live."
docker compose ps
