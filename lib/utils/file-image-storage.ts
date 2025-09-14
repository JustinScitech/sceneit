export interface StoredImage {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  type: string;
  createdAt: string;
}

export interface ImageUploadResponse {
  success: boolean;
  images: StoredImage[];
  error?: string;
}

class FileImageStorage {
  private readonly uploadEndpoint = '/api/upload-image';

  /**
   * Store images using the file system API endpoint
   */
  async storeImages(files: File[]): Promise<StoredImage[]> {
    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append('images', file);
    });

    try {
      const response = await fetch(this.uploadEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const result: ImageUploadResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      return result.images;
    } catch (error) {
      console.error('Failed to store images:', error);
      throw error;
    }
  }

  /**
   * Store a single image
   */
  async storeImage(file: File): Promise<StoredImage> {
    const images = await this.storeImages([file]);
    return images[0];
  }

  /**
   * Get all stored images metadata (from localStorage for now, could be enhanced with API)
   */
  getStoredImages(): StoredImage[] {
    try {
      const stored = localStorage.getItem('file_image_metadata');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get stored images metadata:', error);
      return [];
    }
  }

  /**
   * Save image metadata to localStorage for quick access
   */
  private saveImageMetadata(images: StoredImage[]): void {
    try {
      const existing = this.getStoredImages();
      const updated = [...existing, ...images];
      localStorage.setItem('file_image_metadata', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save image metadata:', error);
    }
  }

  /**
   * Enhanced store method that also saves metadata
   */
  async storeImagesWithMetadata(files: File[]): Promise<StoredImage[]> {
    const images = await this.storeImages(files);
    this.saveImageMetadata(images);
    return images;
  }

  /**
   * Remove image metadata from localStorage
   */
  removeImageMetadata(imageId: string): void {
    try {
      const existing = this.getStoredImages();
      const filtered = existing.filter(img => img.id !== imageId);
      localStorage.setItem('file_image_metadata', JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove image metadata:', error);
    }
  }

  /**
   * Clear all image metadata
   */
  clearAllMetadata(): void {
    try {
      localStorage.removeItem('file_image_metadata');
    } catch (error) {
      console.error('Failed to clear image metadata:', error);
    }
  }

  /**
   * Get image by ID from metadata
   */
  getImageById(imageId: string): StoredImage | null {
    const images = this.getStoredImages();
    return images.find(img => img.id === imageId) || null;
  }

  /**
   * Delete an image from the file system
   */
  async deleteImage(filename: string): Promise<void> {
    try {
      const response = await fetch('/api/delete-image', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Delete failed with status ${response.status}`);
      }

      // Remove from metadata as well
      const images = this.getStoredImages();
      const imageToDelete = images.find(img => img.filename === filename);
      if (imageToDelete) {
        this.removeImageMetadata(imageToDelete.id);
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
      throw error;
    }
  }
}

export const fileImageStorage = new FileImageStorage();
