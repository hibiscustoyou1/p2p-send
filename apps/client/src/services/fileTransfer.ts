export type TransferStatus = 'transferring' | 'paused' | 'error' | 'completed';

export interface TransferProgress {
  id: string;
  transferredBytes: number;
  totalBytes: number;
  speed: string;
  estimatedTime: string;
  status: TransferStatus;
}

export type ProgressCallback = (progress: TransferProgress) => void;

interface EngineConfig {
  chunkSize?: number; // 默认 64KB, WebRTC 最佳实践
}

export class __BaseEngine {
  public id: string;
  protected status: TransferStatus = 'transferring';
  protected config: Required<EngineConfig>;
  protected offset: number = 0;
  protected onProgress?: ProgressCallback;

  protected lastReportTime: number = 0;
  protected lastReportBytes: number = 0;
  protected speedHistory: number[] = [];

  // 必须由子类决定
  public totalBytes: number = 0;

  constructor(id: string, config?: EngineConfig) {
    this.id = id;
    this.config = {
      chunkSize: config?.chunkSize || 64 * 1024,
    };
  }

  public on(event: 'progress', callback: ProgressCallback) {
    this.onProgress = callback;
  }

  public cancel() {
    this.status = 'error';
    this.reportProgress();
  }

  protected reportProgress() {
    if (!this.onProgress) return;
    const now = Date.now();
    const timeDiff = now - this.lastReportTime;

    let speedStr = "计算中...";
    let estimatedStr = "计算中...";

    if (timeDiff >= 500 && this.status === 'transferring') {
      const bytesDiff = this.offset - this.lastReportBytes;
      const currentSpeedBytesPerSec = (bytesDiff / timeDiff) * 1000;

      this.speedHistory.push(currentSpeedBytesPerSec);
      if (this.speedHistory.length > 5) this.speedHistory.shift();
      const smoothedSpeed = this.speedHistory.reduce((a, b) => a + b, 0) / this.speedHistory.length;

      speedStr = this.formatSpeed(smoothedSpeed);

      const remainingBytes = this.totalBytes - this.offset;
      if (smoothedSpeed > 0) {
        const remainingSeconds = Math.round(remainingBytes / smoothedSpeed);
        estimatedStr = this.formatTime(remainingSeconds);
      }

      this.lastReportTime = now;
      this.lastReportBytes = this.offset;
    } else if (this.status !== 'transferring') {
      speedStr = "0 MB/s";
      estimatedStr = this.status === 'paused' ? '已暂停' : this.status === 'completed' ? '已完成' : '连接中断';
    } else {
      speedStr = this.speedHistory.length > 0 ? this.formatSpeed(this.speedHistory[this.speedHistory.length - 1] ?? 0) : "计算中...";
      const smoothedSpeed = this.speedHistory.reduce((a, b) => a + b, 0) / this.speedHistory.length;
      const remainingBytes = this.totalBytes - this.offset;
      if (smoothedSpeed > 0) estimatedStr = this.formatTime(Math.round(remainingBytes / smoothedSpeed));
    }

    this.onProgress({
      id: this.id,
      transferredBytes: this.offset,
      totalBytes: this.totalBytes,
      speed: speedStr,
      estimatedTime: estimatedStr,
      status: this.status
    });
  }

  protected formatSpeed(bytesPerSec: number): string {
    if (bytesPerSec <= 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
    return parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  protected formatTime(seconds: number): string {
    if (seconds < 0) return '剩余 0 秒';
    if (seconds < 60) return `剩余 ${seconds} 秒`;
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remSec = seconds % 60;
      return `剩余 ${minutes} 分 ${remSec} 秒`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remSec = seconds % 60;
    return `剩余 ${hours} 小时 ${minutes} 分 ${remSec} 秒`;
  }
}

/**
 * 真实的 WebRTC 文件发送引擎
 */
export class TransferEngine extends __BaseEngine {
  private file: File;
  private channel: RTCDataChannel | null = null;
  private isPaused: boolean = false;

  constructor(file: File, id: string, config?: EngineConfig) {
    super(id, config);
    this.file = file;
    this.totalBytes = file.size;
  }

  // 开始发送逻辑，需要传入 WebRTC 的通道
  public startWithChannel(channel: RTCDataChannel) {
    this.channel = channel;
    this.status = 'transferring';
    this.lastReportTime = Date.now();
    this.lastReportBytes = this.offset;

    // 如果通道没开，等待开打
    if (this.channel.readyState === 'open') {
      this.readNextChunk();
    } else {
      this.channel.onopen = () => this.readNextChunk();
    }
  }

  public pause() {
    if (this.status === 'transferring') {
      this.status = 'paused';
      this.isPaused = true;
      this.reportProgress();
    }
  }

  public resume() {
    if (this.status === 'paused' || this.status === 'error') {
      this.status = 'transferring';
      this.isPaused = false;
      this.lastReportTime = Date.now();
      this.lastReportBytes = this.offset;
      this.readNextChunk();
    }
  }

  private readNextChunk() {
    if (this.status !== 'transferring' || !this.channel || this.isPaused) return;

    if (this.offset >= this.file.size) {
      this.status = 'completed';
      this.offset = this.file.size;
      this.reportProgress();
      return;
    }

    // 控制缓冲，过大时等待 drain
    // WebRTC 带宽饱和防御机制
    if (this.channel.bufferedAmount > this.channel.bufferedAmountLowThreshold || this.channel.bufferedAmount > 16 * 1024 * 1024) {
      this.channel.onbufferedamountlow = () => {
        this.channel!.onbufferedamountlow = null;
        this.readNextChunk();
      };
      return;
    }

    const end = Math.min(this.offset + this.config.chunkSize, this.file.size);
    const chunk = this.file.slice(this.offset, end);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (reader.result && this.channel?.readyState === 'open') {
          this.channel.send(reader.result as ArrayBuffer);
          this.offset = end;
          this.reportProgress();

          // 极速队列机制
          setTimeout(() => this.readNextChunk(), 0);
        } else {
          this.status = 'error';
          this.reportProgress();
        }
      } catch (err) {
        console.error('DataChannel buffer 出错', err);
        this.status = 'error';
        this.reportProgress();
      }
    };
    reader.onerror = () => {
      this.status = 'error';
      this.reportProgress();
    };
    reader.readAsArrayBuffer(chunk);
  }
}

/**
 * 真实的文件接收引擎
 * 在此模拟进度，并把二进制流重组在内存中，完成后抛出 Blob
 */
export class FileReceiverEngine extends __BaseEngine {
  public filename: string;
  private receiveBuffer: ArrayBuffer[] = [];
  public completedFile?: File;

  constructor(id: string, filename: string, totalBytes: number) {
    super(id, { chunkSize: 64 * 1024 });
    this.filename = filename;
    this.totalBytes = totalBytes;
  }

  public updateProgress(chunk: ArrayBuffer) {
    if (this.status === 'error' || this.status === 'completed') return;

    this.receiveBuffer.push(chunk);
    this.offset += chunk.byteLength;

    this.reportProgress();

    if (this.offset >= this.totalBytes) {
      this.status = 'completed';
      this.reportProgress();

      // 重组 File (生产环境应使用 FileSystem Access API 落盘以节省内存，这里为了简单起见先转 Blob)
      const blob = new Blob(this.receiveBuffer);
      this.completedFile = new File([blob], this.filename);
      this.receiveBuffer = []; // 释放内存

      // 触发自动下载
      const url = window.URL.createObjectURL(this.completedFile);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = this.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    }
  }
}
