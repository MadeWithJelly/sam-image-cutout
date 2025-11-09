export interface Segment {
  id: string;
  mask: ImageData;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  position: {
    x: number;
    y: number;
  };
  imageData: ImageData;
  zIndex: number;
  opacity: number;
  rotation: number;
  scale: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface SAMInput {
  image: ImageData;
  points: Point[];
}

export interface SAMOutput {
  masks: Float32Array[];
  scores: number[];
}
