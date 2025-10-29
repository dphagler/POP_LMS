export type YouTubePlayerEvent = {
  data: number;
};

export type YouTubePlayer = {
  playVideo?: () => void;
  pauseVideo?: () => void;
  stopVideo?: () => void;
  destroy: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  mute?: () => void;
  unMute?: () => void;
  isMuted?: () => boolean;
};

export type YouTubePlayerReadyEvent = {
  target: YouTubePlayer;
};

export type YouTubePlayerOptions = {
  videoId: string;
  playerVars?: Record<string, unknown>;
  events?: {
    onReady?: (event: YouTubePlayerReadyEvent) => void;
    onStateChange?: (event: YouTubePlayerEvent) => void;
  };
};

export type YouTubePlayerState = {
  PLAYING: number;
  PAUSED: number;
  ENDED: number;
};

export type YouTubeNamespace = {
  Player: new (element: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayer;
  PlayerState: YouTubePlayerState;
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export {};
