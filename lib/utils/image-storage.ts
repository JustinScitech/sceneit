// Image storage utility for converting and storing images as base64 in localStorage
const IMAGE_STORAGE_KEY = 'sceneit_images';

export interface StoredImage {
  id: string;
  data: string; // base64 data URL
  filename: string;
  type: string;
  size: number;
  createdAt: string;
}

export const imageStorage = {
  // Convert File to base64 and store it
  storeImage: async (file: File): Promise<StoredImage> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('localStorage not available'));
        return;
      }

      // Check file size limit (5MB)
      const MAX_FILE_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        reject(new Error('File too large. Maximum size is 5MB.'));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const imageData = e.target?.result as string;
          const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          const storedImage: StoredImage = {
            id: imageId,
            data: imageData,
            filename: file.name,
            type: file.type,
            size: file.size,
            createdAt: new Date().toISOString(),
          };

          // Get existing images
          const existingImages = imageStorage.getAllImages();
          const updatedImages = [...existingImages, storedImage];
          
          // Try to store the image, with automatic cleanup if quota exceeded
          try {
            const dataToStore = JSON.stringify(updatedImages);
            localStorage.setItem(IMAGE_STORAGE_KEY, dataToStore);
          } catch (storageError) {
            if (storageError instanceof Error && storageError.name === 'QuotaExceededError') {
              // Attempt automatic cleanup of old images
              const cleanedUp = imageStorage.cleanupOldImages(3); // Keep only 3 most recent
              if (cleanedUp > 0) {
                try {
                  // Retry with cleaned up storage
                  const freshImages = imageStorage.getAllImages();
                  const retryImages = [...freshImages, storedImage];
                  const retryData = JSON.stringify(retryImages);
                  localStorage.setItem(IMAGE_STORAGE_KEY, retryData);
                } catch (retryError) {
                  reject(new Error('Storage quota exceeded even after cleanup. Please delete more images manually.'));
                  return;
                }
              } else {
                reject(new Error('Storage quota exceeded. Please delete some images manually.'));
                return;
              }
            } else {
              throw storageError;
            }
          }
          
          resolve(storedImage);
        } catch (error) {
          console.error('Image storage error:', error);
          if (error instanceof Error && error.name === 'QuotaExceededError') {
            reject(new Error('Storage quota exceeded. Please delete some images.'));
          } else {
            reject(new Error('Failed to store image: ' + (error instanceof Error ? error.message : 'Unknown error')));
          }
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read image file'));
      };
      
      reader.readAsDataURL(file);
    });
  },

  // Get all stored images
  getAllImages: (): StoredImage[] => {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(IMAGE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading images from localStorage:', error);
      return [];
    }
  },

  // Get image by ID
  getImage: (id: string): StoredImage | null => {
    const images = imageStorage.getAllImages();
    return images.find(img => img.id === id) || null;
  },

  // Delete image by ID
  deleteImage: (id: string): boolean => {
    if (typeof window === 'undefined') return false;
    
    try {
      const images = imageStorage.getAllImages();
      const filteredImages = images.filter(img => img.id !== id);
      
      if (filteredImages.length === images.length) return false; // Image not found
      
      localStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify(filteredImages));
      return true;
    } catch (error) {
      console.error('Error deleting image from localStorage:', error);
      return false;
    }
  },

  // Store multiple images and return their IDs
  storeMultipleImages: async (files: File[]): Promise<StoredImage[]> => {
    const promises = files.map(file => imageStorage.storeImage(file));
    return Promise.all(promises);
  },

  // Clear all images (for testing/development)
  clearAllImages: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(IMAGE_STORAGE_KEY);
  },

  // Get storage usage info
  getStorageInfo: () => {
    if (typeof window === 'undefined') return { count: 0, totalSize: 0 };
    
    const images = imageStorage.getAllImages();
    const totalSize = images.reduce((sum, img) => sum + img.size, 0);
    
    return {
      count: images.length,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
    };
  },

  // Clean up old images, keeping only the most recent ones
  cleanupOldImages: (keepCount: number = 5): number => {
    if (typeof window === 'undefined') return 0;
    
    try {
      const images = imageStorage.getAllImages();
      if (images.length <= keepCount) return 0;
      
      // Sort by creation date (newest first)
      const sortedImages = images.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      // Keep only the most recent images
      const imagesToKeep = sortedImages.slice(0, keepCount);
      const deletedCount = images.length - imagesToKeep.length;
      
      // Store the cleaned up images
      localStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify(imagesToKeep));
      
      console.log(`Cleaned up ${deletedCount} old images, kept ${imagesToKeep.length} most recent`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old images:', error);
      return 0;
    }
  }
};