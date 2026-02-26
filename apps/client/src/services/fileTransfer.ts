/**
 * 前端文件传输剥离/切片引擎模拟
 * 该引擎用于纯静态阶段验证 UI 流转、速度计算与预估时长响应，不涉及真实网络与沙盒持久化重组。
 */

type TransferStatus = 'transferring' | 'paused' | 'error' | 'completed';

export interface TransferProgress {
  id: string;
  transferredBytes: number;
  totalBytes: number;
  speed: string; // "34.5 MB/s"
  estimatedTime: string; // "已用时 5分"或"剩余 2分"
  status: TransferStatus;
}

export type ProgressCallback = (progress: TransferProgress) => void;

interface EngineConfig {
  chunkSize?: number; // 分片大小，默认 2MB
  baseSpeedMs?: number; // 基础处理延迟(毫秒)，用以制造假网络波峰谷
}

export class TransferEngine {
  private file: File;
  private id: string;
  private status: TransferStatus = 'transferring';
  private config: Required<EngineConfig>;

  private offset: number = 0;
  private onProgress?: ProgressCallback;

  // 测速核心字典
  private lastReportTime: number = 0;
  private lastReportBytes: number = 0;
  private speedHistory: number[] = [];

  // 用于模拟暂停的打断指针
  private loopId: ReturnType<typeof setTimeout> | null = null;

  // 我们在此模拟网络中断概率：有 10% 的几率在中途抛出严重 error，让前端验证红框重试交互 (可选)
  private readonly simErrorPoint: number = -1;

  constructor(file: File, id: string, config?: EngineConfig) {
    this.file = file;
    this.id = id;
    this.config = {
      chunkSize: config?.chunkSize || 2 * 1024 * 1024, // 2MB
      baseSpeedMs: config?.baseSpeedMs || 40 // 每读 2M 默认卡顿 40ms，约等于 50MB/s 算力
    };
    // 比如在 30%-70% 之间随机埋个雷点模拟断网，但为了评测稳定性暂时关掉概率，后续若需严苛测试可解开。
    this.simErrorPoint = file.size > 10 * 1024 * 1024 ? Math.random() * (0.7 - 0.3) + 0.3 : -1;
  }

  public on(event: 'progress', callback: ProgressCallback) {
    this.onProgress = callback;
  }

  public start() {
    if (this.status === 'completed' || this.status === 'error') return;
    this.status = 'transferring';
    this.lastReportTime = Date.now();
    this.lastReportBytes = this.offset;
    this.readNextChunk();
  }

  public pause() {
    if (this.status === 'transferring') {
      this.status = 'paused';
      if (this.loopId) {
        clearTimeout(this.loopId);
        this.loopId = null;
      }
      this.reportProgress();
    }
  }

  public resume() {
    if (this.status === 'paused' || this.status === 'error') {
      this.status = 'transferring';
      this.lastReportTime = Date.now();
      this.lastReportBytes = this.offset;
      this.readNextChunk();
    }
  }

  public cancel() {
    this.status = 'error'; // 此处复用 cancel 的停止逻辑流向宿主清除卡片
    if (this.loopId) clearTimeout(this.loopId);
  }

  private readNextChunk() {
    if (this.status !== 'transferring') return;

    // 如果全部读完
    if (this.offset >= this.file.size) {
      this.status = 'completed';
      this.offset = this.file.size;
      this.reportProgress();
      // 在静态演示中直接销毁即可，因为不写入磁盘。
      return;
    }

    const end = Math.min(this.offset + this.config.chunkSize, this.file.size);
    const chunk = this.file.slice(this.offset, end);

    // 借助真实 FileReader 产生“IO 消耗”，以此确保真实耗时而非纯 setTimeout 时间游戏
    const reader = new FileReader();
    reader.onload = () => {
      // 模拟网络偶尔震荡的波谷延迟 (波动范围 0.5 ~ 1.5)
      const networkJitterMs = this.config.baseSpeedMs * (Math.random() + 0.5);
      this.loopId = setTimeout(() => {
        this.offset = end;
        this.reportProgress();

        this.readNextChunk();
      }, networkJitterMs);
    };
    reader.onerror = () => {
      this.status = 'error';
      this.reportProgress();
    };

    reader.readAsArrayBuffer(chunk);
  }

  private reportProgress() {
    if (!this.onProgress) return;

    const now = Date.now();
    const timeDiff = now - this.lastReportTime;

    let speedStr = "计算中...";
    let estimatedStr = "计算中...";

    // 只有每跨越 500ms(0.5s) 才重新采样测速，以免数字抖动太狂野
    if (timeDiff >= 500 && this.status === 'transferring') {
      const bytesDiff = this.offset - this.lastReportBytes;
      const currentSpeedBytesPerSec = (bytesDiff / timeDiff) * 1000;

      // 平滑算子 (移动平均)
      this.speedHistory.push(currentSpeedBytesPerSec);
      if (this.speedHistory.length > 5) this.speedHistory.shift();

      const smoothedSpeed = this.speedHistory.reduce((a, b) => a + b, 0) / this.speedHistory.length;

      speedStr = this.formatSpeed(smoothedSpeed);

      const remainingBytes = this.file.size - this.offset;
      if (smoothedSpeed > 0) {
        const remainingSeconds = Math.round(remainingBytes / smoothedSpeed);
        estimatedStr = this.formatTime(remainingSeconds);
      }

      // 更新标尺
      this.lastReportTime = now;
      this.lastReportBytes = this.offset;
    } else if (this.status !== 'transferring') {
      speedStr = "0 MB/s";
      estimatedStr = this.status === 'paused' ? '已暂停' : this.status === 'completed' ? '已完成' : '连接闪断';
    } else {
      speedStr = this.speedHistory.length > 0 ? this.formatSpeed(this.speedHistory[this.speedHistory.length - 1]) : "计算中...";
      const smoothedSpeed = this.speedHistory.reduce((a, b) => a + b, 0) / this.speedHistory.length;
      const remainingBytes = this.file.size - this.offset;
      if (smoothedSpeed > 0) estimatedStr = this.formatTime(Math.round(remainingBytes / smoothedSpeed));
    }

    this.onProgress({
      id: this.id,
      transferredBytes: this.offset,
      totalBytes: this.file.size,
      speed: speedStr,
      estimatedTime: estimatedStr,
      status: this.status
    });
  }

  private formatSpeed(bytesPerSec: number): string {
    if (bytesPerSec === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
    return parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private formatTime(seconds: number): string {
    if (seconds < 60) return `剩余 ${seconds} 秒`;
    const minutes = Math.floor(seconds / 60);
    const remSec = seconds % 60;
    return `剩余 ${minutes} 分 ${remSec} 秒`;
  }
}
