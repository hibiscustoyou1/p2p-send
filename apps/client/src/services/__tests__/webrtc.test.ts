// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { WebRTCManager } from '../webrtc';
import { signalingService } from '../socket';

vi.mock('../socket', () => {
  return {
    signalingService: {
      sendICECandidate: vi.fn(),
      sendWebRTCOffer: vi.fn(),
      sendWebRTCAnswer: vi.fn(),
      onWebRTCOffer: vi.fn(),
      onWebRTCAnswer: vi.fn(),
      onICECandidate: vi.fn(),
      clearListeners: vi.fn(),
    }
  };
});

describe('WebRTCManager', () => {
  it('should initialize RTCPeerConnection and emit states', () => {
    const winAny = window as any;
    // JSDOM does not have RTCPeerConnection by default, we mock it
    winAny.RTCPeerConnection = class MockRTC {
      createDataChannel = vi.fn().mockReturnValue({ readyState: 'connecting' });
      onconnectionstatechange = null;
      onicecandidate = null;
    };

    const manager = new WebRTCManager('sender');
    manager.init();

    expect(manager.getChannel()).toBeDefined();
  });
});
