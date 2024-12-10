class AQICalculator {
    constructor() {
        // Sub-index history for pollutants with timestamps
        this.subIndexHistory = {
            PM10: [],
            PM25: [],
            NO2: [],
            SO2: [],
            CO: [],
            O3: [],
            NH3: [],
            Pb: []
        };

        // Track the timestamp of the first data point for each pollutant
        this.firstDataTimestamp = {
            PM10: null,
            PM25: null,
            NO2: null,
            SO2: null,
            CO: null,
            O3: null,
            NH3: null,
            Pb: null
        };

        // Flag to indicate when the initial 5-minute delay has passed
        this.firstCalculationDone = {
            PM10: false,
            PM25: false,
            NO2: false,
            SO2: false,
            CO: false,
            O3: false,
            NH3: false,
            Pb: false
        };
    }

    // Method to calculate sub-index for each pollutant based on concentration
    calculateSubIndex(pollutant, concentration) {
        let subIndex = 0;

        switch (pollutant) {
            case 'PM10':
                subIndex = this.calculatePM10SubIndex(concentration);
                break;
            case 'PM25':
                subIndex = this.calculatePM25SubIndex(concentration);
                break;
            case 'NO2':
                subIndex = this.calculateNO2SubIndex(concentration);
                break;
            case 'SO2':
                subIndex = this.calculateSO2SubIndex(concentration);
                break;
            case 'CO':
                subIndex = this.calculateCOSubIndex(concentration);
                break;
            case 'O3':
                subIndex = this.calculateO3SubIndex(concentration);
                break;
            case 'NH3':
                subIndex = this.calculateNH3SubIndex(concentration);
                break;
            case 'Pb':
                subIndex = this.calculatePbSubIndex(concentration);
                break;
            default:
                throw new Error('Unknown pollutant');
        }

        return subIndex;
    }

   // Method to calculate distance (used in IDW and ellipse equations)
   calculateDistance(point1, point2) {
    const latDiff = point1.lat - point2.lat;
    const lonDiff = point1.lon - point2.lon;
    return Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
}

// Existing methods (MISOE, IDW, Ellipse) are unchanged
misoeInterpolation(data, windData) {
    return data.map((point) => {
        let adjustedValue = point.value;
        return adjustedValue;
    });
}

applyIDW(dataPoints, targetPoint) {
    let numerator = 0;
    let denominator = 0;

    dataPoints.forEach((point) => {
        const distance = this.calculateDistance(point, targetPoint);
        const weight = 1 / Math.pow(distance, 2); // IDW formula
        numerator += point.value * weight;
        denominator += weight;
    });

    return numerator / denominator;
}

ellipseInterpolation(dataPoints, ellipseParams) {
    const { a, b, centerLat, centerLon } = ellipseParams; // Ellipse parameters

    return dataPoints.map((point) => {
        const distance = this.calculateDistance(point, { lat: centerLat, lon: centerLon });
        const ellipseFactor = Math.pow(distance / a, 2) + Math.pow(distance / b, 2);
        const adjustedValue = point.value * ellipseFactor; // Adjust the value based on ellipse geometry
        return adjustedValue;
    });
}
calculatePM10SubIndex(concentration) {
    if (concentration <= 50) return concentration * 50 / 50;
    if (concentration <= 150) return 50 + (concentration - 50) * 50 / 100;
    if (concentration <= 250) return 100 + (concentration - 150) * 50 / 100;
    if (concentration <= 350) return 150 + (concentration - 250) * 50 / 100;
    return 200 + (concentration - 350) * 100 / 100;
}

calculatePM25SubIndex(concentration) {
    if (concentration <= 60) return concentration * 50 / 60;
    if (concentration <= 120) return 50 + (concentration - 60) * 50 / 60;
    if (concentration <= 250) return 100 + (concentration - 120) * 50 / 130;
    return 150 + (concentration - 250) * 100 / 150;
}

calculateNO2SubIndex(concentration) {
    if (concentration <= 40) return concentration * 50 / 40;
    if (concentration <= 80) return 50 + (concentration - 40) * 50 / 40;
    if (concentration <= 180) return 100 + (concentration - 80) * 50 / 100;
    return 150 + (concentration - 180) * 50 / 120;
}

calculateSO2SubIndex(concentration) {
    if (concentration <= 40) return concentration * 50 / 40;
    if (concentration <= 80) return 50 + (concentration - 40) * 50 / 40;
    if (concentration <= 380) return 100 + (concentration - 80) * 50 / 300;
    return 150 + (concentration - 380) * 100 / 500;
}

calculateCOSubIndex(concentration) {
    if (concentration <= 1) return concentration * 50 / 1;
    if (concentration <= 2) return 50 + (concentration - 1) * 50 / 1;
    if (concentration <= 10) return 100 + (concentration - 2) * 50 / 8;
    return 150 + (concentration - 10) * 100 / 30;
}

calculateO3SubIndex(concentration) {
    if (concentration <= 50) return concentration * 50 / 50;
    if (concentration <= 100) return 50 + (concentration - 50) * 50 / 50;
    if (concentration <= 200) return 100 + (concentration - 100) * 50 / 100;
    return 150 + (concentration - 200) * 100 / 300;
}

calculateNH3SubIndex(concentration) {
    if (concentration <= 100) return concentration * 50 / 100;
    if (concentration <= 200) return 50 + (concentration - 100) * 50 / 100;
    return 100 + (concentration - 200) * 50 / 100;
}

calculatePbSubIndex(concentration) {
    if (concentration <= 0.5) return concentration * 50 / 0.5;
    if (concentration <= 1.0) return 50 + (concentration - 0.5) * 50 / 0.5;
    return 100 + (concentration - 1.0) * 50 / 1.0;
}


    // Add sub-index to history and calculate the 5-minute rolling average
    addToHistoryAndCalculateAvg(pollutant, subIndex) {
        const currentTime = Date.now();

        // Initialize first data timestamp for the pollutant
        if (this.firstDataTimestamp[pollutant] === null) {
            this.firstDataTimestamp[pollutant] = currentTime;
        }

        // Check if 5 minutes have passed since the first data point for the pollutant
        const fiveMinutesPassed = currentTime - this.firstDataTimestamp[pollutant] >= 5 * 60 * 1000;

        // If 5 minutes have not passed, don't compute the average yet
        if (!fiveMinutesPassed) {
            return null; // No average should be sent until 5 minutes have passed
        }

        // If 5 minutes have passed, proceed with average calculation
        if (!this.firstCalculationDone[pollutant]) {
            // Mark the calculation as done after the first average
            this.firstCalculationDone[pollutant] = true;
        }

        // Add the new sub-index with timestamp
        this.subIndexHistory[pollutant].push({ subIndex, timestamp: currentTime });

        // Filter out entries older than 5 minutes
        const fiveMinutesAgo = currentTime - 5 * 60 * 1000;
        this.subIndexHistory[pollutant] = this.subIndexHistory[pollutant].filter(entry => entry.timestamp >= fiveMinutesAgo);

        // Calculate the average of the valid entries
        const total = this.subIndexHistory[pollutant].reduce((sum, entry) => sum + entry.subIndex, 0);
        return total / this.subIndexHistory[pollutant].length || 0;
    }

    // Calculate the final AQI from sensor data
    calculateFinalAQI(sensorData) {
        if (!sensorData || typeof sensorData !== 'object') {
            throw new Error("Sensor data is missing or invalid.");
        }

        let worstAQI = -Infinity;
        let worstPollutant = null;
        let allSubIndices = {};

        // Calculate sub-index for each pollutant
        Object.keys(sensorData).forEach((pollutant) => {
            let subIndex = this.calculateSubIndex(pollutant, sensorData[pollutant]);
            let avgSubIndex = this.addToHistoryAndCalculateAvg(pollutant, subIndex);

            // If no average is calculated (before 5 minutes), skip
            if (avgSubIndex === null) return;

            allSubIndices[pollutant] = avgSubIndex;

            // Track the worst sub-index (highest value)
            if (avgSubIndex > worstAQI) {
                worstAQI = avgSubIndex;
                worstPollutant = pollutant;
            }
        });

        return {
            worstAQI: Math.round(worstAQI), // The AQI matches the worst sub-index
            subIndices: allSubIndices, // The sub-index values for all pollutants
            worstPollutant // The pollutant responsible for the worst AQI
        };
    }
}

module.exports = AQICalculator;
