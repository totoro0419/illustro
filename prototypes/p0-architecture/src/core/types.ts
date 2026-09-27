export type PointSample = Readonly<{
  sequence: number;
  time: number;
  x: number;
  y: number;
  pressure: number;
  pointerType: string;
}>;

export type Rect = Readonly<{ x: number; y: number; width: number; height: number }>;

export type MetricSample = Readonly<{
  name: string;
  value: number;
  unit: 'ms' | 'count' | 'bytes';
  timestamp: number;
}>;
