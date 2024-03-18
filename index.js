const express = require('express');
const mongoose = require('mongoose');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { S3Client } = require('@aws-sdk/client-s3');
const cors = require('cors');

require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());


const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});


mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

    const urlSchema = new mongoose.Schema({
        glburl: String,
        imageUrl: String
    });

    const ThreeDObject = mongoose.model('3d', urlSchema);
    app.post('/post/urls', async (req, res) => {
        try {
            const { glburl, imageUrl } = req.body;
            const savedURL = await ThreeDObject.create({ glburl, imageUrl });
            res.status(200).json({ id: savedURL._id });
        } catch (error) {
            console.log(error);
            res.status(500).send('Error posting URLs');
        }
    });

    app.get('/all', async (req, res) => {
        try {
            const allData = await ThreeDObject.find();
            res.status(200).json(allData);
        } catch (error) {
            console.log(error);
            res.status(500).send('Error retrieving data');
        }
    });

    app.get('/data/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const data = await ThreeDObject.findById(id);
            
            if (!data) {
                return res.status(404).json({ message: 'Data not found' });
            }
            
            res.status(200).json(data);
        } catch (error) {
            console.error(error);
            res.status(500).send('Error retrieving data');
        }
    });
    
    
async function generatePresignedUrl(fileName, contentType, location) {
    const command = new PutObjectCommand({
        Bucket: process.env.INUPT_BUCKET,
        Key: `${location}/${fileName}`,
        ContentType: contentType
    });
    const url = await getSignedUrl(s3Client, command);
    return url;
}

app.post('/upload', async (req, res) => {
    try {
        const { fileName, contentType, location } = req.body;
        console.log(req.body)
        const signedUrl = await generatePresignedUrl(fileName, contentType, location);
        res.status(200).json({ signedUrl });
    } catch (error) {
        console.log(error)
        res.status(500).send('Error uploading file');
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
