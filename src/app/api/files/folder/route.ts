import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { addFile } from '../data';

export async function POST(request: Request) {
  try {
    const { name, parentId } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Der Ordnername darf nicht leer sein' },
        { status: 400 }
      );
    }

    // Neuen Ordner erstellen und in Datenspeicher hinzufügen
    const newFolder = addFile({
      name,
      type: 'folder',
      parentId,
      path: `/uploads/${parentId}/${name}`
    });

    return NextResponse.json(newFolder);
  } catch (error) {
    console.error('Fehler beim Erstellen des Ordners:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Ordners' },
      { status: 500 }
    );
  }
} 