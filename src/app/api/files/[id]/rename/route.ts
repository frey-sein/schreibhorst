import { NextResponse } from 'next/server';
import { updateFile } from '../../data';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const { newName } = await request.json();

    if (!newName || newName.trim() === '') {
      return NextResponse.json(
        { error: 'Der neue Name darf nicht leer sein' },
        { status: 400 }
      );
    }

    // Element in Datenspeicher umbenennen
    const updatedFile = updateFile(id, { name: newName.trim() });

    if (!updatedFile) {
      return NextResponse.json(
        { error: 'Element nicht gefunden' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedFile);
  } catch (error) {
    console.error('Fehler beim Umbenennen des Elements:', error);
    return NextResponse.json(
      { error: 'Fehler beim Umbenennen des Elements' },
      { status: 500 }
    );
  }
} 