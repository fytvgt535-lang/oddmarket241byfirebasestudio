
/**
 * Compresse et convertit une image en WebP via Canvas API.
 * Redimensionne si la largeur dépasse maxWidth.
 */
export const compressImage = async (file: File, quality = 0.8, maxWidth = 1280): Promise<File> => {
  // Ignorer si ce n'est pas une image
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      // Libérer la mémoire de l'URL objet
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Calcul du ratio pour redimensionnement
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        // Fallback si le contexte canvas échoue
        console.warn("Canvas context unavailable, returning original file");
        resolve(file);
        return;
      }

      // Dessiner l'image redimensionnée
      ctx.drawImage(img, 0, 0, width, height);

      // Export en WebP
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            console.warn("Blob creation failed, returning original file");
            resolve(file);
            return;
          }

          // Remplacer l'extension par .webp
          const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
          
          const compressedFile = new File([blob], newName, {
            type: 'image/webp',
            lastModified: Date.now(),
          });

          console.log(`Image optimisée: ${(file.size / 1024).toFixed(0)}kb -> ${(compressedFile.size / 1024).toFixed(0)}kb`);
          resolve(compressedFile);
        },
        'image/webp',
        quality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
  });
};
