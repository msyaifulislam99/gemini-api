import express from 'express';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'models/gemini-1.5-flash',
});
const upload = multer({ dest: 'uploads/' });

app.use(cors())
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3003;
app.get('/', (req, res) => {
  res.send('Welcome to the Gemini AI Image Generation API');
});

const imageToGenerativePart = (filePath) => ({
    inlineData: {
      data: fs.readFileSync(filePath).toString('base64'),
      mimeType: 'image/png',
    },
})

app.post('/generate-text', async (req, res) => {
  const { prompt } = req.body;
  console.log(prompt);
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response
    return res.json({
      output: response.text(),
    });
  } catch (error) {
    console.error('Error generating text:', error);
    res.status(500).json({ error: 'Failed to generate text', message: error.message });
  }
});

app.post('/generate-image', upload.single('image'), async (req, res) => {
  const prompt = req.body.prompt || 'describe the image';
  const image = imageToGenerativePart(req.file.path)

  try {
    const result = await model.generateContent([prompt, image]);

    const response = await result.response.text();

    return res.json({
      output: response,
    });
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: 'Failed to generate image', message: error.message });
  }
});

app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);
    const base64Data = buffer.toString('base64');
    const mimeType = req.file.mimetype;

    try {
        const document = {
            inlineData: {
                data: base64Data,
                mimeType: mimeType,
            },
        };
        const result = await model.generateContent(['Please summarize the content of this document.', document]);
        const response = await result.response;

        return res.json({
            output: response.text(),
        });
    } catch (error) {
        console.error('Error generating from document:', error);
        res.status(500).json({ error: 'Failed to generate from document', message: error.message });
    } finally {
        // Clean up the uploaded file
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
});

app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);
    const base64Data = buffer.toString('base64');
    const mimeType = req.file.mimetype;

    try {
        const audio = {
            inlineData: {
                data: base64Data,
                mimeType: mimeType,
            },
        };
        const result = await model.generateContent(['Transcribe or analize the following audio', audio]);
        const response = await result.response;

        return res.json({
            output: response.text(),
        });
    } catch (error) {
        console.error('Error generating from audio:', error);
        res.status(500).json({ error: 'Failed to generate from audio', message: error.message });
    } finally {
        // Clean up the uploaded file
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
});

// 4th session it developer batch 2
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Messages is required' });
    }

    try {
        const result = await model.generateContent(message);

        const response = await result.response;

        return res.json({
            reply: response.text(),
        });
    } catch (error) {
        console.error('Error in chat generation:', error);
        res.status(500).json({ error: 'something went wrong.', message: error.message });
    }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});