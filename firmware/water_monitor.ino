#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Wi-Fi Credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Backend API URL
const char* serverUrl = "http://YOUR_SERVER_IP:5000/api/reading";

// Pin Definitions
#define TRIGGER_PIN 5
#define ECHO_PIN 18
#define MOTOR_PIN 2
#define TANK_HEIGHT_CM 100 // Total height of the tank

// Motor State
bool motorState = false;

void setup() {
  Serial.begin(115200);
  
  pinMode(TRIGGER_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(MOTOR_PIN, OUTPUT);
  digitalWrite(MOTOR_PIN, LOW);

  connectToWiFi();
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    float distance = getDistance();
    float waterLevel = TANK_HEIGHT_CM - distance;
    if (waterLevel < 0) waterLevel = 0;
    
    int percentage = (waterLevel / TANK_HEIGHT_CM) * 100;
    if (percentage > 100) percentage = 100;

    Serial.printf("Distance: %.2f cm, Level: %.2f cm, Percentage: %d%%\n", distance, waterLevel, percentage);

    // Send data to server and get motor command
    sendData(waterLevel, percentage);
  } else {
    connectToWiFi();
  }

  // Control Motor locally based on logic if needed, or rely on server response
  digitalWrite(MOTOR_PIN, motorState ? HIGH : LOW);

  delay(2000); // Send data every 2 seconds
}

void connectToWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected!");
}

float getDistance() {
  digitalWrite(TRIGGER_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIGGER_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIGGER_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH);
  float distance = duration * 0.034 / 2;
  return distance;
}

void sendData(float level, int percentage) {
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", "secret-water-key"); // Add API Key for security

  // Create JSON payload
  StaticJsonDocument<200> doc;
  doc["level"] = level;
  doc["percentage"] = percentage;
  
  String requestBody;
  serializeJson(doc, requestBody);

  int httpResponseCode = http.POST(requestBody);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Server Response: " + response);
    
    // Parse response for motor control
    StaticJsonDocument<200> responseDoc;
    deserializeJson(responseDoc, response);
    bool serverMotorState = responseDoc["motorOn"];
    motorState = serverMotorState;
    
  } else {
    Serial.print("Error on sending POST: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}
