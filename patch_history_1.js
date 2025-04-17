const fs = require('fs'); const panelPath = fs.readFileSync('src/app/components/stage/StagePanel.tsx', 'utf8'); const updatedPanel = panelPath.replace(/const loadSnapshots = async \(\) => {[\s\S]*?try {[\s\S]*?const loadedSnapshots = await getSnapshots\(\);/, 'const loadSnapshots = async () => {
        try {
          // Nur manuell gespeicherte Snapshots laden
          const loadedSnapshots = await getSnapshots(true); // true = onlyManual').replace(/await addSnapshot\(textDrafts, imageDrafts\);/, 'await addSnapshot(textDrafts, imageDrafts, undefined, undefined, true); // true = isManualSave'); fs.writeFileSync('src/app/components/stage/StagePanel.tsx', updatedPanel); console.log('StagePanel.tsx erfolgreich aktualisiert');
