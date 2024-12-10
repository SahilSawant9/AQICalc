const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const WebSocket = require('ws');
const AQICalculator = require('./models/aqiCalc'); // Import AQI calculation logic


const app = express();
const port = 3003;

app.use(cors());
app.use(bodyParser.json());

const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Create instance of AQICalculator
const aqiCalculator = new AQICalculator();

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('WebSocket connected');

  ws.on('message', (message) => {
    console.log('Received message:', message);
  });

  ws.send(JSON.stringify({ message: 'Connected to WebSocket server' }));
});

// Root GET route to avoid "Cannot GET" issue
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the AQI Monitoring Server!',
    endpoints: {
      sensorData: {
        method: 'POST',
        url: '/sensor-data',
        description: 'Send sensor data to calculate AQI and broadcast to clients.',
      },
    },
  });
});

// Endpoint to receive sensor data and calculate AQI
app.post('/sensor-data', async (req, res) => {
  const { sensor_id, latitude, longitude, pollutants } = req.body;

  // Validate the data
  if (!sensor_id || !latitude || !longitude || !pollutants) {
    return res.status(400).json({ message: 'Missing required data' });
  }

  // Check pollutants object
  const requiredPollutants = ['PM10', 'PM25', 'NO2', 'SO2', 'CO', 'O3', 'NH3', 'Pb'];
  for (const pollutant of requiredPollutants) {
    if (!pollutants.hasOwnProperty(pollutant)) {
      return res.status(400).json({ message: `Missing pollutant: ${pollutant}` });
    }
  }

  // Calculate AQI
  try {
    const result = aqiCalculator.calculateFinalAQI(pollutants);

    

    // Prepare payload for WebSocket broadcast
    const payload = {
      worstAQI: result.worstAQI,
      worstPollutant: getWorstPollutant(result.subIndices),
      subIndices: result.subIndices,
    };

    // Broadcast the AQI data to connected WebSocket clients
    if (wss.clients.size > 0) {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(payload));
        }
      });
    }

    // Send response back to the sender
    res.status(200).json({ message: 'AQI calculated and broadcasted', result: payload });
  } catch (error) {
    console.error('Error calculating AQI:', error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Function to find the worst pollutant
function getWorstPollutant(subIndices) {
  let worstPollutant = '';
  let highestSubIndex = -Infinity;

  for (const [pollutant, subIndex] of Object.entries(subIndices)) {
    if (subIndex > highestSubIndex) {
      highestSubIndex = subIndex;
      worstPollutant = pollutant;
    }
  }

  return worstPollutant;
}