import { AlertTriangle, CheckCircle2, CircleHelp, Gauge, Zap } from 'lucide-react';
import type { SimulationResult } from '../../models/types';
import { formatEngineering, formatNumber } from '../../utils/format';

function Metric({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className={`metric-row ${accent ? 'accent' : ''}`}>
      <span>{label}<span title={hint}><CircleHelp size={11} /></span></span>
      <strong>{value}</strong>
    </div>
  );
}

export function ResultCards({ result }: { result: SimulationResult }) {
  const good = result.modulatedSnr >= 10;
  const moderate = result.modulatedSnr >= 3;
  return (
    <aside className="results-panel">
      <div className="result-hero" data-status={good ? 'good' : moderate ? 'warn' : 'bad'}>
        <div className="result-hero-top">
          <span className="eyebrow">MODULATED SNR</span>
          <span className="model-badge">高级噪声</span>
        </div>
        <div className="snr-value">
          <strong>{formatNumber(result.modulatedSnr, 2)}</strong>
          <span>线性</span>
        </div>
        <div className="snr-db">{result.snrDb.toFixed(2)} <small>dB</small></div>
        <div className="snr-scale"><i style={{ width: `${Math.min(100, Math.max(2, result.modulatedSnr * 4))}%` }} /></div>
        <div className="detection-verdict">
          {good ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <strong>{result.detectionLabel}</strong>
          <span>{result.saturated ? '输出已接近/达到饱和' : '动态范围正常'}</span>
        </div>
      </div>

      <div className="result-group">
        <div className="result-group-title"><Gauge size={14} /> 光学链路</div>
        <Metric label="APD 信号光功率" value={formatEngineering(result.signalPowerW, 'W')} hint="镜头入口功率乘以全部可编辑的传播、光学与耦合效率。" accent />
        <Metric label="镜头入口功率" value={formatEngineering(result.lensPowerW, 'W')} hint="P = Ie·Aeff/R²，定向辐射强度近似。" />
        <Metric label="背景光功率" value={formatEngineering(result.backgroundPowerW, 'W')} hint="直接输入值或光谱辐亮度积分近似。" />
        <Metric label="有效接收面积" value={`${(result.effectiveAreaM2 * 1e6).toFixed(2)} mm²`} hint="Aeff = πD²(1-ε)/4。" />
        <Metric label="总链路损耗" value={`${result.linkLossDb.toFixed(2)} dB`} hint="由总链路效率按 -10log10(η) 换算。" />
      </div>

      <div className="result-group">
        <div className="result-group-title"><Zap size={14} /> APD 与前端</div>
        <Metric label="初级光电流" value={formatEngineering(result.primaryCurrentA, 'A')} hint="倍增前电流 Ip = Rλ·Psig。pA/nA 是电流单位。" accent />
        <Metric label="倍增后信号电流" value={formatEngineering(result.signalCurrentA, 'A')} hint="Isig = M·Ip，与初级电流分开显示。" />
        <Metric label="总 RMS 噪声" value={formatEngineering(result.noises.totalA, 'A')} hint="所有独立 RMS 噪声分量平方和开根号。" />
        <Metric label="过剩噪声因子" value={result.excessNoiseFactor.toFixed(3)} hint="当前 APD 过剩噪声模型计算值。" />
        <Metric label="TIA 信号输出" value={formatEngineering(result.tiaSignalV, 'V')} hint="VTIA = -Isig·Rf，此处显示幅值。" />
        <Metric label="TIA 噪声输出" value={formatEngineering(result.tiaNoiseV, 'V')} hint="输入等效总噪声乘以反馈电阻。" />
        <Metric label="直流偏置" value={formatEngineering(result.tiaDcV, 'V')} hint="背景光与暗电流形成的 TIA 直流输出。" />
      </div>

      <div className={`health-note ${result.saturated ? 'danger' : ''}`}>
        <span>{result.saturated ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}</span>
        <p>
          <strong>{result.saturated ? '检查饱和风险' : '工作点在线性区'}</strong>
          输出余量 {formatEngineering(result.outputHeadroomV, 'V')} · ADC {result.adcCode} code
        </p>
      </div>
    </aside>
  );
}
