require('dotenv').config();
const path = require('path');
const { uploadWavToMongo } = require('./utils/gridfsUpload');

const wavPath = path.join(__dirname, 'test.wav'); // Replace with your .wav file path

uploadWavToMongo(wavPath)
  .then(file => {
    console.log('Upload complete:', file);
    process.exit(0);
  })
  .catch(err => {
    console.error('Upload failed:', err);
    process.exit(1);
  });