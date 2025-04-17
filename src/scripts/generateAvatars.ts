import { promises as fs } from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Together AI API Konfiguration
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const API_URL = 'https://api.together.xyz/v1/images/generations';

interface AvatarConfig {
  id: string;
  prompt: string;
  category: 'female' | 'male';
  role: string;
}

const AVATARS: AvatarConfig[] = [
  // Weibliche Avatare
  {
    id: 'female-writer',
    prompt: 'professional 3D cartoon avatar of a female writer, modern business casual style, friendly expression, white background, high quality, detailed facial features, professional look',
    category: 'female',
    role: 'writer'
  },
  {
    id: 'female-designer',
    prompt: 'creative 3D cartoon avatar of a female graphic designer, artistic style, modern look, colorful accessories, white background, high quality, detailed facial features',
    category: 'female',
    role: 'designer'
  },
  {
    id: 'female-researcher',
    prompt: 'intelligent 3D cartoon avatar of a female researcher with glasses, professional look, scientific appearance, white background, high quality, detailed facial features',
    category: 'female',
    role: 'researcher'
  },
  {
    id: 'female-spy',
    prompt: 'mysterious 3D cartoon avatar of a female spy, smart casual style, confident expression, subtle sophistication, white background, high quality, detailed facial features',
    category: 'female',
    role: 'spy'
  },
  {
    id: 'female-assistant',
    prompt: 'friendly 3D cartoon avatar of a female assistant with headset, welcoming smile, professional appearance, white background, high quality, detailed facial features',
    category: 'female',
    role: 'assistant'
  },
  // Männliche Avatare
  {
    id: 'male-writer',
    prompt: 'professional 3D cartoon avatar of a male writer, modern business casual style, friendly expression, white background, high quality, detailed facial features, professional look',
    category: 'male',
    role: 'writer'
  },
  {
    id: 'male-designer',
    prompt: 'creative 3D cartoon avatar of a male graphic designer, artistic style, modern look, colorful accessories, white background, high quality, detailed facial features',
    category: 'male',
    role: 'designer'
  },
  {
    id: 'male-researcher',
    prompt: 'intelligent 3D cartoon avatar of a male researcher with glasses, professional look, scientific appearance, white background, high quality, detailed facial features',
    category: 'male',
    role: 'researcher'
  },
  {
    id: 'male-spy',
    prompt: 'mysterious 3D cartoon avatar of a male spy, smart casual style, confident expression, subtle sophistication, white background, high quality, detailed facial features',
    category: 'male',
    role: 'spy'
  },
  {
    id: 'male-assistant',
    prompt: 'friendly 3D cartoon avatar of a male assistant with headset, welcoming smile, professional appearance, white background, high quality, detailed facial features',
    category: 'male',
    role: 'assistant'
  }
];

async function generateAvatar(config: AvatarConfig): Promise<void> {
  if (!TOGETHER_API_KEY) {
    throw new Error('TOGETHER_API_KEY ist nicht gesetzt');
  }

  console.log(`Generiere Avatar für: ${config.id}`);
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOGETHER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'black-forest-labs/FLUX.1-schnell',
      prompt: config.prompt,
      n: 1,
      size: '512x512',
      response_format: 'url'
    })
  });

  if (!response.ok) {
    throw new Error(`API Fehler: ${response.statusText}`);
  }

  const data = await response.json();
  const imageUrl = data.data[0].url;

  console.log(`Bild-URL erhalten für ${config.id}, lade herunter...`);

  // Lade das Bild herunter
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = await imageResponse.arrayBuffer();

  // Erstelle den Ordner, falls er nicht existiert
  const outputDir = path.join(process.cwd(), 'public', 'images', 'avatars');
  await fs.mkdir(outputDir, { recursive: true });

  // Speichere das Bild
  const outputPath = path.join(outputDir, `${config.id}.png`);
  await fs.writeFile(outputPath, Buffer.from(imageBuffer));

  console.log(`Avatar gespeichert: ${config.id}`);
}

async function generateAllAvatars() {
  console.log('Starte Avatar-Generierung...');
  
  for (const avatar of AVATARS) {
    try {
      await generateAvatar(avatar);
      // Warte 2 Sekunden zwischen den Anfragen
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Fehler bei der Generierung von ${avatar.id}:`, error);
    }
  }

  console.log('Avatar-Generierung abgeschlossen!');
}

// Führe das Script aus
generateAllAvatars().catch(console.error); 