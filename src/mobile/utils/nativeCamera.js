/**
 * Native Camera Utilities
 * 
 * Provides camera/gallery access for mobile apps.
 * Website never imports this file - ISOLATED.
 */

let Camera, CameraSource, CameraResultType;

const initCamera = async () => {
  if (!Camera && window.Capacitor) {
    const module = await import('@capacitor/camera');
    Camera = module.Camera;
    CameraSource = module.CameraSource;
    CameraResultType = module.CameraResultType;
  }
};

export const nativeCamera = {
  /**
   * Check if camera is available
   */
  async isAvailable() {
    return !!(window.Capacitor && window.Capacitor.Plugins?.Camera);
  },

  /**
   * Take photo with camera
   * @returns {Promise<string>} Base64 data URL
   */
  async takePhoto() {
    if (!window.Capacitor) {
      throw new Error('Camera only available in mobile app');
    }

    await initCamera();

    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      width: 1920,
      height: 1920,
      correctOrientation: true
    });

    return image.dataUrl;
  },

  /**
   * Pick image from gallery
   * @returns {Promise<string>} Base64 data URL
   */
  async pickFromGallery() {
    if (!window.Capacitor) {
      throw new Error('Gallery only available in mobile app');
    }

    await initCamera();

    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
      width: 1920,
      height: 1920
    });

    return image.dataUrl;
  },

  /**
   * Let user choose: Camera or Gallery
   * @returns {Promise<string>} Base64 data URL
   */
  async chooseSource() {
    if (!window.Capacitor) {
      throw new Error('Camera/Gallery only available in mobile app');
    }

    await initCamera();

    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,  // Asks user
      width: 1920,
      height: 1920,
      correctOrientation: true
    });

    return image.dataUrl;
  }
};
