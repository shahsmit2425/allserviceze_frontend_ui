import { useState, useRef } from "react";
import logger from "@/utils/logger";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Camera, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { usePlatform } from "@/mobile/hooks/usePlatform";
import { nativeCamera } from "@/mobile/utils/nativeCamera";
import { haptic } from "@/mobile/utils/haptics";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

export const ImageUpload = ({ 
  currentImage, 
  onUpload, 
  type = "profile",
  className = ""
}) => {
  const { getAuthHeader } = useAuth();
  const { isNative } = usePlatform();
  const [uploading, setUploading] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const fileInputRef = useRef(null);

  // Handle native camera/gallery
  const handleNativePhoto = async (source = 'prompt') => {
    try {
      await haptic.light();
      setUploading(true);
      setShowSourcePicker(false);

      let dataUrl;
      if (source === 'camera') {
        dataUrl = await nativeCamera.takePhoto();
      } else if (source === 'gallery') {
        dataUrl = await nativeCamera.pickFromGallery();
      } else {
        dataUrl = await nativeCamera.chooseSource();
      }

      // Convert data URL to blob then to File
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });

      // Upload to server
      await uploadImage(file);
      await haptic.success();
    } catch (error) {
      if (error.message !== 'User cancelled photos app') {
        logger.error('Native camera error:', error);
        toast.error('Failed to capture photo');
        await haptic.error();
      }
    } finally {
      setUploading(false);
    }
  };

  // Upload image to server
  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const endpoint = type === "profile" ? "/upload/profile-image" : "/upload/image";
    const response = await axios.post(`${API_URL}${endpoint}`, formData, {
      headers: {
        ...getAuthHeader(),
        "Content-Type": "multipart/form-data"
      }
    });
    
    const imageUrl = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${response.data.url}`;
    onUpload(imageUrl);
    toast.success("Image uploaded successfully");
  };

  // Handle web file input
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);

    try {
      await uploadImage(file);
    } catch (error) {
      toast.error("Failed to upload image");
      logger.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  // Handle click - show options on mobile, file picker on web
  const handleClick = () => {
    if (isNative) {
      setShowSourcePicker(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
        data-testid="image-upload-input"
      />
      
      {type === "profile" ? (
        <div className="relative group">
          <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
            <AvatarImage src={currentImage} />
            <AvatarFallback className="bg-primary text-white text-2xl">
              {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : "?"}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={handleClick}
            disabled={uploading}
            className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
            data-testid="profile-image-upload-btn"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </button>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={handleClick}
          disabled={uploading}
          className="w-full h-32 border-dashed"
          data-testid="service-image-upload-btn"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Camera className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {isNative ? 'Take photo or choose from gallery' : 'Click to upload image'}
              </span>
            </div>
          )}
        </Button>
      )}

      {/* Mobile source picker */}
      {isNative && showSourcePicker && (
        <div className="fixed inset-0 bg-copper-600/50 z-50 flex items-end" onClick={() => setShowSourcePicker(false)}>
          <div className="bg-white w-full rounded-t-2xl p-4 space-y-2" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-center mb-4">Choose Photo Source</h3>
            <Button
              variant="outline"
              className="w-full h-12 text-base"
              onClick={() => handleNativePhoto('camera')}
              disabled={uploading}
            >
              <Camera className="w-5 h-5 mr-2" />
              Take Photo
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 text-base"
              onClick={() => handleNativePhoto('gallery')}
              disabled={uploading}
            >
              <ImageIcon className="w-5 h-5 mr-2" />
              Choose from Gallery
            </Button>
            <Button
              variant="ghost"
              className="w-full h-12 text-base"
              onClick={() => setShowSourcePicker(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export const ServiceImageGallery = ({ images = [], onImagesChange, maxImages = 5 }) => {
  const { getAuthHeader } = useAuth();
  const { isNative } = usePlatform();
  const [uploading, setUploading] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const fileInputRef = useRef(null);

  // Handle native camera/gallery
  const handleNativePhoto = async (source = 'prompt') => {
    try {
      if (images.length >= maxImages) {
        toast.error(`Maximum ${maxImages} images allowed`);
        return;
      }

      await haptic.light();
      setUploading(true);
      setShowSourcePicker(false);

      let dataUrl;
      if (source === 'camera') {
        dataUrl = await nativeCamera.takePhoto();
      } else if (source === 'gallery') {
        dataUrl = await nativeCamera.pickFromGallery();
      } else {
        dataUrl = await nativeCamera.chooseSource();
      }

      // Convert data URL to blob then to File
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });

      // Upload to server
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await axios.post(`${API_URL}/upload/image`, formData, {
        headers: {
          ...getAuthHeader(),
          "Content-Type": "multipart/form-data"
        }
      });

      const imageUrl = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${uploadResponse.data.url}`;
      onImagesChange([...images, imageUrl]);
      toast.success("Image uploaded successfully");
      await haptic.success();
    } catch (error) {
      if (error.message !== 'User cancelled photos app') {
        logger.error('Native camera error:', error);
        toast.error('Failed to capture photo');
        await haptic.error();
      }
    } finally {
      setUploading(false);
    }
  };

  // Handle web file input
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (images.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);
    const newImages = [...images];

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 5 * 1024 * 1024) continue;

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await axios.post(`${API_URL}/upload/image`, formData, {
          headers: {
            ...getAuthHeader(),
            "Content-Type": "multipart/form-data"
          }
        });
        newImages.push(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${response.data.url}`);
      } catch (error) {
        logger.error("Upload error:", error);
      }
    }

    onImagesChange(newImages);
    setUploading(false);
    toast.success("Images uploaded");
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const handleClick = () => {
    if (isNative) {
      setShowSourcePicker(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        multiple
        className="hidden"
      />
      
      <div className="grid grid-cols-3 gap-4">
        {images.map((image, index) => (
          <div key={index} className="relative aspect-video rounded-lg overflow-hidden group">
            <img src={image} alt={`Service ${index + 1}`} className="w-full h-full object-cover" />
            <button
              onClick={() => removeImage(index)}
              className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
            >
              ×
            </button>
          </div>
        ))}
        
        {images.length < maxImages && (
          <button
            onClick={handleClick}
            disabled={uploading}
            className="aspect-video border-2 border-dashed rounded-lg flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : (
              <Camera className="w-8 h-8 text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      {/* Mobile source picker */}
      {isNative && showSourcePicker && (
        <div className="fixed inset-0 bg-copper-600/50 z-50 flex items-end" onClick={() => setShowSourcePicker(false)}>
          <div className="bg-white w-full rounded-t-2xl p-4 space-y-2" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-center mb-4">Choose Photo Source</h3>
            <Button
              variant="outline"
              className="w-full h-12 text-base"
              onClick={() => handleNativePhoto('camera')}
              disabled={uploading}
            >
              <Camera className="w-5 h-5 mr-2" />
              Take Photo
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 text-base"
              onClick={() => handleNativePhoto('gallery')}
              disabled={uploading}
            >
              <ImageIcon className="w-5 h-5 mr-2" />
              Choose from Gallery
            </Button>
            <Button
              variant="ghost"
              className="w-full h-12 text-base"
              onClick={() => setShowSourcePicker(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        {images.length}/{maxImages} images • Max 5MB each
      </p>
    </div>
  );
};
