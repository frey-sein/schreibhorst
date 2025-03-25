/**
 * Ruft die hochaufgelöste Version (2048x2048) eines generierten Bildes ab
 */
export async function getHighResolutionImage(imageId: string): Promise<Buffer | null> {
  try {
    // Hier würden wir die hochaufgelöste Version des Bildes von der KI-API abrufen
    const response = await fetch(`${process.env.AI_API_URL}/images/${imageId}/highres`, {
      headers: {
        'Authorization': `Bearer ${process.env.AI_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error('Fehler beim Abrufen des hochaufgelösten Bildes');
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);

  } catch (error) {
    console.error('Fehler beim Abrufen des hochaufgelösten Bildes:', error);
    return null;
  }
} 