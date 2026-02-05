export interface GenerateImageRequest {
  script?: string;
  theme: string;
  goal: string;
  atmosphere: string;
  brandColor?: string;
  subColor?: string;
  count?: number;
}

export interface GenerateImageResponse {
  images: Array<{
    id: string;
    url: string;
    prompt: string;
    slideNumber: number;
    resolution: string;
  }>;
}
