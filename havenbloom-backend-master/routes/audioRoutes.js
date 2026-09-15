const express = require('express');
const { MongoClient, GridFSBucket } = require('mongodb');

const router = express.Router();
const mongoURI = process.env.FETAL_AUDIO_URI || 'mongodb://localhost:27017/fetal_audio';

// GET /api/audio/download/:filename
router.get('/download/:filename', async (req, res) => {
  const client = new MongoClient(mongoURI);
  try {
    await client.connect();
    const db = client.db('fetal_audio');
    const bucket = new GridFSBucket(db, { bucketName: 'fs' });

    const downloadStream = bucket.openDownloadStreamByName(req.params.filename);

    res.set('Content-Type', 'audio/wav');
    res.set('Content-Disposition', `attachment; filename="${req.params.filename}"`);

    downloadStream.on('error', (err) => {
      res.status(404).json({ error: 'File not found' });
      client.close();
    });

    downloadStream.on('end', () => {
      client.close();
    });

    downloadStream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
    await client.close();
  }
});

router.get('/test', (req, res) => {
  res.send('Audio route is working!');
});

module.exports = router;