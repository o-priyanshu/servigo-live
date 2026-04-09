type CloudinaryResourceType = "image" | "raw" | "auto";

type CloudinaryUploadOptions = {
  folder?: string;
  publicIdPrefix?: string;
  onProgress?: (progress: number) => void;
  resourceType?: CloudinaryResourceType;
};

type CloudinaryUploadResponse = {
  secure_url?: string;
  url?: string;
  error?: {
    message?: string;
  };
};

function getCloudinaryConfig() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET."
    );
  }

  return { cloudName, uploadPreset };
}

function sanitizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function resolveResourceType(_file: File, explicit?: CloudinaryResourceType): CloudinaryResourceType {
  if (explicit) return explicit;
  return "auto";
}

async function uploadWithProgress(
  endpoint: string,
  formData: FormData,
  onProgress: (progress: number) => void
): Promise<CloudinaryUploadResponse> {
  return await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const progress = Math.round((event.loaded / event.total) * 100);
      onProgress(progress);
    };

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error("Cloudinary upload failed."));
        return;
      }
      try {
        resolve(JSON.parse(xhr.responseText) as CloudinaryUploadResponse);
      } catch {
        reject(new Error("Invalid Cloudinary response."));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during Cloudinary upload."));
    xhr.send(formData);
  });
}

export async function uploadFileToCloudinary(
  file: File,
  options: CloudinaryUploadOptions = {}
): Promise<string> {
  if (!(file instanceof File)) {
    throw new Error("Please provide a valid file.");
  }

  const { cloudName, uploadPreset } = getCloudinaryConfig();
  const resourceType = resolveResourceType(file, options.resourceType);
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const folder = options.folder ?? process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER;
  if (folder) formData.append("folder", folder);

  if (options.publicIdPrefix) {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    formData.append("public_id", `${sanitizeName(options.publicIdPrefix)}-${unique}`);
  }

  const response = options.onProgress
    ? await uploadWithProgress(endpoint, formData, options.onProgress)
    : await fetch(endpoint, {
        method: "POST",
        body: formData,
      }).then(async (res) => {
        if (!res.ok) {
          throw new Error("Cloudinary upload failed.");
        }
        return (await res.json()) as CloudinaryUploadResponse;
      });

  if (response.error?.message) {
    throw new Error(response.error.message);
  }

  const fileUrl = response.secure_url ?? response.url;
  if (!fileUrl) {
    throw new Error("Cloudinary did not return a file URL.");
  }

  return fileUrl;
}
