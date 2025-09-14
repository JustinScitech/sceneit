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
          
          // Store updated images
          try {
            localStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify(updatedImages));
            resolve(storedImage);
          } catch (storageError) {
            // Handle localStorage quota exceeded error
            console.warn('localStorage quota exceeded, attempting cleanup...');
            
            // Try to clear some old images and retry
            const sortedImages = existingImages.sort((a, b) => 
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
            
            // Remove oldest 50% of images
            const keepImages = sortedImages.slice(Math.floor(sortedImages.length / 2));
            const updatedImagesAfterCleanup = [...keepImages, storedImage];
            
            try {
              localStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify(updatedImagesAfterCleanup));
              console.log(`Cleaned up ${sortedImages.length - keepImages.length} old images`);
              resolve(storedImage);
            } catch (retryError) {
              reject(new Error('Failed to store image: localStorage quota exceeded'));
            }
          }
        } catch (error) {
          reject(new Error('Failed to store image'));
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
  }
};