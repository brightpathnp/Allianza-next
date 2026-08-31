import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const CHUNK_SIZE = 800 * 1024; // 800 KB per chunk (Firestore limit is 1MB)

export const uploadFileToFirestore = async (file: File, base64Data: string): Promise<string> => {
  const fileId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const base64Content = base64Data.split(',')[1] || base64Data; // remove data:image/png;base64, prefix if present
  
  const totalChunks = Math.ceil(base64Content.length / CHUNK_SIZE);
  
  // Save main metadata doc
  await setDoc(doc(db, 'documentFiles', fileId), {
    name: file.name,
    type: file.type,
    chunks: totalChunks,
    createdAt: new Date().toISOString()
  });

  // Save chunks
  for (let i = 0; i < totalChunks; i++) {
    const chunkData = base64Content.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    await setDoc(doc(db, 'documentFiles', `${fileId}_${i}`), {
      data: chunkData
    });
  }

  return fileId;
};

export const getFileFromFirestore = async (fileId: string): Promise<{ dataUrl: string, name: string, type: string } | null> => {
  try {
    const metaDoc = await getDoc(doc(db, 'documentFiles', fileId));
    if (!metaDoc.exists()) return null;
    
    const meta = metaDoc.data();
    let base64Content = '';
    
    for (let i = 0; i < meta.chunks; i++) {
      const chunkDoc = await getDoc(doc(db, 'documentFiles', `${fileId}_${i}`));
      if (chunkDoc.exists()) {
        base64Content += chunkDoc.data().data;
      }
    }
    
    return {
      dataUrl: `data:${meta.type};base64,${base64Content}`,
      name: meta.name,
      type: meta.type
    };
  } catch (error: any) {
    console.error("Error retrieving file from firestore:", error.message || error);
    return null;
  }
};
