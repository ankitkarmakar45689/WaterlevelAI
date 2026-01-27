# Water Level Monitoring System

A full-stack, real-time water level monitoring application with IoT integration.

## Features
- **Real-time Dashboard**: Visual representation of water tank level.
- **IoT Integration**: ESP32 firmware to send ultrasonic sensor data.
- **Motor Control**: Remote ON/OFF control with auto-cutoff safety.
- **Alerts**: Visual indicators for Low/Critical levels.
- **History**: Historical charts of water usage.
- **Security**: API Key protection for IoT endpoints.

## Project Structure
- `/client`: Frontend (React + Vite + Recharts + Socket.io)
- `/server`: Backend (Node.js + Express + MongoDB + Socket.io)
- `/firmware`: ESP32 Arduino Sketch

## Prerequisites
- Node.js installed.
- MongoDB installed (or use a cloud connection string).
- Arduino IDE (for ESP32).

## Installation & Setup

### 1. Backend
```bash
cd server
npm install
# Create a .env file with:
# MONGO_URI=mongodb://localhost:27017/water-monitor
# API_KEY=secret-water-key
node index.js
```
Server runs on `http://localhost:5000`.

### 2. Frontend
```bash
cd client
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Firmware (ESP32)
1. Open `firmware/water_monitor.ino` in Arduino IDE.
2. Update `ssid`, `password`, and `serverUrl` (use your PC's IP address, e.g., `http://192.168.1.10:5000/api/reading`).
3. Upload to ESP32.
4. Connect HC-SR04 sensor:
   - Trig -> Pin 5
   - Echo -> Pin 18
   - VCC -> 5V
   - GND -> GND

## Deployment
- **Frontend**: Build with `npm run build` and deploy to Vercel/Netlify.
- **Backend**: Deploy to Render/Heroku/Railway. Set `MONGO_URI` env var.
- **Database**: Use MongoDB Atlas.

## Security
This project uses a shared secret `API_KEY` in headers to authenticate the ESP32. Ensure you change the key in `.env` and in the firmware before deployment.
