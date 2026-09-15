require('dotenv').config();
const { downloadWavFromMongo } = require('./utils/gridfsUpload');

const filename = 'heartbeat_20250722_202842.wav'; // The name of your file in GridFS
const destination = 'downloaded_test.wav'; // The local file path to save

downloadWavFromMongo(filename, destination)
  .then(() => console.log('Download complete!'))
  .catch(console.error);