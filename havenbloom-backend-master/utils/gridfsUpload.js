const { MongoClient, GridFSBucket } = require('mongodb');
const fs = require('fs');
const path = require('path');

const mongoURI = process.env.FETAL_AUDIO_URI || 'mongodb://localhost:27017/fetal_audio';

async function uploadWavToMongo(wavPath) {
  const client = new MongoClient(mongoURI);
  await client.connect();
  const db = client.db('fetal_audio');
  const bucket = new GridFSBucket(db, { bucketName: 'fs' });

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(path.basename(wavPath), {
      contentType: 'audio/wav'
    });

    fs.createReadStream(wavPath)
      .pipe(uploadStream)
      .on('error', async (err) => {
        console.error('MongoDB upload error:', err);
        await client.close();
        reject(err);
      })
      .on('finish', async () => {
        console.log(`Uploaded WAV to MongoDB with ID: ${uploadStream.id}`);
        await client.close();
        resolve({ _id: uploadStream.id, filename: uploadStream.filename });
      });
  });
}

// Download a WAV file from GridFS by filename and save to local path
async function downloadWavFromMongo(filename, destinationPath) {
  const client = new MongoClient(mongoURI);
  await client.connect();
  const db = client.db('fetal_audio');
  const bucket = new GridFSBucket(db, { bucketName: 'fs' });

  return new Promise((resolve, reject) => {
    const downloadStream = bucket.openDownloadStreamByName(filename);

    const writeStream = fs.createWriteStream(destinationPath);

    downloadStream
      .on('error', async (err) => {
        console.error('MongoDB download error:', err);
        await client.close();
        reject(err);
      })
      .pipe(writeStream)
      .on('finish', async () => {
        console.log(`Downloaded WAV from MongoDB to: ${destinationPath}`);
        await client.close();
        resolve(destinationPath);
      });
  });
}

module.exports = { uploadWavToMongo, downloadWavFromMongo };