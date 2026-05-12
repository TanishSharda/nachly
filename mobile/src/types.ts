/**
 * Mobile App TypeScript Configuration
 * Shared types between web and mobile apps
 */

import type { ReactNode } from 'react';

// Auth Types
export interface AuthUser {
  id: string;
  email: string;
  role: 'student' | 'choreographer' | 'admin';
  full_name: string;
  avatar_url: string | null;
}

// Navigation Types
export interface NavigationProps {
  navigation: any;
  route: any;
}

// Screen Component Types
export type ScreenComponent = (props: NavigationProps) => ReactNode;

// Practice Types
export interface PracticeStep {
  index: number;
  name: string;
  duration: number;
  cues: string[];
  slowMotion?: boolean;
}

export interface RecordingData {
  sessionId: string;
  stepIndex: number;
  video: {
    uri: string;
    type: string;
    duration: number;
  };
  poseData: Record<string, any>;
  scores: {
    accuracy: number;
    timing: number;
    energy: number;
    expression: number;
  };
}

// Camera Types
export interface CameraRef {
  recordAsync: (options?: any) => Promise<{ uri: string }>;
  takePictureAsync: (options?: any) => Promise<{ uri: string }>;
}

// Video Types
export interface VideoData {
  uri: string;
  duration: number;
  type: string;
  size?: number;
}
