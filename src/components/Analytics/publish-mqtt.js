import mqtt from 'mqtt';

// Simple seeded random number generator (Linear Congruential Generator)
function seededRandom(seed) {
  let value = seed;
  return function(min, max) {
    value = (value * 9301 + 49297) % 233280;
    const rnd = value / 233280;
    return Math.floor(rnd * (max - min + 1)) + min;
  };
}

const client = mqtt.connect('mqtt://test.mosquitto.org');

// Set your seed here (any integer)
const getStableRandomInt = seededRandom(12345);

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  setInterval(() => {
    // Fetal Heart Rate: 110-160 BPM
    const fetalRate = getStableRandomInt(110, 160);

    // Heart Rate: 60-110 BPM
    const heartRate = getStableRandomInt(60, 110);

    client.publish('20heartbeat/bpm', String(fetalRate));
    client.publish('69heartrate/bpm', String(heartRate));

    console.log(
      `Published: FHR=${fetalRate}, HR=${heartRate}`
    );
  }, 1000); // every second
});