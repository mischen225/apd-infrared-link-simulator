import ReactECharts from 'echarts-for-react';
import {
  BarChart3,
  Boxes,
  Download,
  FlaskConical,
  Grid3X3,
  LineChart,
  Network,
  Plus,
  Table2,
  Trash2,
  Waves,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  defaultBatch,
  linearSpace,
  matrixSweep,
  monteCarlo,
  simulateMultiLinks,
  sweep,
} from '../../calculations/sweep';
import { spectralCurves } from '../../calculations/spectralIntegration';
import type {
  MultiLink,
  SimulationParameters,
  SimulationResult,
  SweepKey,
} from '../../models/types';
import { downloadText, toCsv } from '../../utils/export';
import { formatEngineering, formatNumber } from '../../utils/format';
import { NumberField } from '../common/NumberField';

type WorkspaceTab = 'scan' | 'noise' | 'spectrum' | 'matrix' | 'batch' | 'multi' | 'monte';
type FocusMode = 'single' | 'scan' | 'matrix' | 'multi';

interface AnalysisWorkspaceProps {
  parameters: SimulationParameters;
  result: SimulationResult;
  focusMode: FocusMode;
  links: MultiLink[];
  onLinksChange: (links: MultiLink[]) => void;
}

const axisText = { color: '#78959b', fontFamily: 'Inter, system-ui', fontSize: 10 };
const gridLine = { lineStyle: { color: '#173037' } };
const baseChart = {
  backgroundColor: 'transparent',
  textStyle: { color: '#9cb3b8' },
  toolbox: {
    right: 4,
    top: 0,
    iconStyle: { borderColor: '#809aa0' },
    emphasis: { iconStyle: { borderColor: '#f1a45a' } },
    feature: { saveAsImage: { title: '导出 PNG', pixelRatio: 2 } },
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#0b181b',
    borderColor: '#31515a',
    textStyle: { color: '#d9e8e9', fontSize: 11 },
  },
};

const sweepMeta: Record<SweepKey, { name: string; unit: string; factor: number; start: number; end: number }> = {
  distanceM: { name: '传播距离', unit: 'km', factor: 1e-3, start: 1000, end: 10000 },
  radiantIntensityWsr: { name: '辐射强度', unit: 'W/sr', factor: 1, start: 0.2, end: 5 },
  apertureDiameterM: { name: '透镜口径', unit: 'mm', factor: 1e3, start: 0.005, end: 0.05 },
  atmosphericTransmission: { name: '大气透过率', unit: '', factor: 1, start: 0.2, end: 1 },
  responsivityAW: { name: 'APD 响应度', unit: 'A/W', factor: 1, start: 0.1, end: 1 },
  gain: { name: 'APD 增益', unit: '×', factor: 1, start: 1, end: 300 },
  darkCurrentA: { name: '暗电流', unit: 'nA', factor: 1e9, start: 0.01e-9, end: 5e-9 },
  directPowerW: { name: '背景光功率', unit: 'pW', factor: 1e12, start: 0, end: 100e-12 },
  enbwHz: { name: 'ENBW', unit: 'Hz', factor: 1, start: 10, end: 3000 },
  feedbackResistanceOhm: { name: 'TIA 反馈电阻', unit: 'MΩ', factor: 1e-6, start: 1e6, end: 30e6 },
  modulationDepth: { name: '调制深度', unit: '%', factor: 100, start: 0.05, end: 1 },
};

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={active ? 'active' : ''} onClick={onClick}>
      {icon}<span>{label}</span>
    </button>
  );
}

function ScanView({ parameters, result }: { parameters: SimulationParameters; result: SimulationResult }) {
  const [key, setKey] = useState<SweepKey>('distanceM');
  const [start, setStart] = useState(sweepMeta.distanceM.start);
  const [end, setEnd] = useState(sweepMeta.distanceM.end);
  const [count, setCount] = useState(41);
  const [logarithmic, setLogarithmic] = useState(false);
  const meta = sweepMeta[key];
  const points = useMemo(() => sweep(parameters, key, start, end, count), [parameters, key, start, end, count]);

  const option = {
    ...baseChart,
    legend: { data: ['接收光功率', '总噪声', 'SNR dB'], top: 2, left: 0, textStyle: axisText },
    grid: { left: 58, right: 58, top: 48, bottom: 46 },
    dataZoom: [{ type: 'inside' }],
    xAxis: {
      type: logarithmic ? 'log' : 'value',
      name: `${meta.name} / ${meta.unit}`,
      nameTextStyle: axisText,
      axisLabel: axisText,
      axisLine: { lineStyle: { color: '#35535b' } },
      splitLine: gridLine,
    },
    yAxis: [
      {
        type: logarithmic ? 'log' : 'value',
        name: '光功率 / pW · 噪声 / pA',
        nameTextStyle: axisText,
        axisLabel: axisText,
        splitLine: gridLine,
      },
      {
        type: 'value',
        name: 'SNR / dB',
        nameTextStyle: axisText,
        axisLabel: axisText,
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '接收光功率',
        type: 'line',
        showSymbol: false,
        smooth: true,
        lineStyle: { width: 2, color: '#ef9f58' },
        itemStyle: { color: '#ef9f58' },
        data: points.map((p) => [p.x * meta.factor, p.result.signalPowerW * 1e12]),
        markPoint: {
          symbolSize: 38,
          label: { show: false },
          data: [[currentSweepValue(parameters, key) * meta.factor, result.signalPowerW * 1e12]],
        },
      },
      {
        name: '总噪声',
        type: 'line',
        showSymbol: false,
        smooth: true,
        lineStyle: { width: 1.5, color: '#72c5d4' },
        itemStyle: { color: '#72c5d4' },
        data: points.map((p) => [p.x * meta.factor, p.result.noises.totalA * 1e12]),
      },
      {
        name: 'SNR dB',
        type: 'line',
        yAxisIndex: 1,
        showSymbol: false,
        lineStyle: { width: 2, color: '#76d69c' },
        areaStyle: { color: 'rgba(90, 227, 159, .08)' },
        itemStyle: { color: '#76d69c' },
        data: points.map((p) => [p.x * meta.factor, p.result.snrDb]),
        markLine: {
          silent: true,
          label: { formatter: 'SNR = 10', color: '#94a9ad' },
          lineStyle: { color: '#637e84', type: 'dashed' },
          data: [{ yAxis: 20 }],
        },
      },
    ],
  };

  return (
    <div className="analysis-view">
      <div className="analysis-toolbar">
        <label>
          扫描参数
          <select
            value={key}
            onChange={(e) => {
              const next = e.target.value as SweepKey;
              setKey(next);
              setStart(sweepMeta[next].start);
              setEnd(sweepMeta[next].end);
            }}
          >
            {Object.entries(sweepMeta).map(([id, item]) => <option key={id} value={id}>{item.name}</option>)}
          </select>
        </label>
        <NumberField label="起点" value={start * meta.factor} unit={meta.unit} onChange={(v) => setStart(v / meta.factor)} />
        <NumberField label="终点" value={end * meta.factor} unit={meta.unit} onChange={(v) => setEnd(v / meta.factor)} />
        <NumberField label="采样" value={count} unit="点" min={2} max={300} onChange={(v) => setCount(Math.round(v))} />
        <label className="mini-switch"><input type="checkbox" checked={logarithmic} onChange={(e) => setLogarithmic(e.target.checked)} /> 对数坐标</label>
      </div>
      <ReactECharts option={option} style={{ height: 365 }} notMerge />
      <div className="chart-footnote">
        <span>当前工作点已标记</span><span>滚轮缩放 · 悬停查看 SI 换算值 · 右上角导出 PNG</span>
      </div>
    </div>
  );
}

function currentSweepValue(parameters: SimulationParameters, key: SweepKey): number {
  switch (key) {
    case 'distanceM': return parameters.propagation.distanceM;
    case 'radiantIntensityWsr': return parameters.source.radiantIntensityWsr;
    case 'apertureDiameterM': return parameters.optics.apertureDiameterM;
    case 'atmosphericTransmission': return parameters.propagation.atmosphericTransmission;
    case 'responsivityAW': return parameters.apd.responsivityAW;
    case 'gain': return parameters.apd.gain;
    case 'darkCurrentA': return parameters.apd.darkCurrentA;
    case 'directPowerW': return parameters.background.directPowerW;
    case 'enbwHz': return parameters.tia.enbwHz;
    case 'feedbackResistanceOhm': return parameters.tia.feedbackResistanceOhm;
    case 'modulationDepth': return parameters.source.modulationDepth;
  }
}

function NoiseView({ result, parameters }: { result: SimulationResult; parameters: SimulationParameters }) {
  const components = [
    ['信号散粒', result.noises.signalShotA],
    ['背景散粒', result.noises.backgroundShotA],
    ['体暗电流', result.noises.bulkDarkShotA],
    ['表面暗电流', result.noises.surfaceDarkShotA],
    ['反馈热噪声', result.noises.feedbackThermalA],
    ['运放电流', result.noises.opAmpCurrentA],
    ['运放电压', result.noises.opAmpVoltageA],
    ['ADC量化', result.noises.adcA],
  ] as const;
  const gainPoints = sweep(parameters, 'gain', 1, 300, 80);
  const option = {
    ...baseChart,
    tooltip: { ...baseChart.tooltip, trigger: 'item', formatter: (p: { name: string; value: number }) => `${p.name}<br/><b>${formatEngineering(p.value, 'A')}</b> RMS` },
    grid: { left: 54, right: 20, top: 36, bottom: 72 },
    xAxis: { type: 'category', data: components.map((c) => c[0]), axisLabel: { ...axisText, rotate: 28 }, axisLine: { lineStyle: { color: '#35535b' } } },
    yAxis: { type: 'log', name: 'RMS 噪声 / A', nameTextStyle: axisText, axisLabel: { ...axisText, formatter: (v: number) => v.toExponential(0) }, splitLine: gridLine },
    series: [{
      type: 'bar',
      data: components.map((c, i) => ({ value: c[1], itemStyle: { color: ['#e99955', '#df6c5b', '#9b7ec8', '#756aa9', '#5dacc2', '#65c8a0', '#d6bc62', '#7795a2'][i] } })),
      barMaxWidth: 38,
    }],
  };
  const gainOption = {
    ...baseChart,
    legend: { data: ['倍增信号', '体暗电流噪声', '总噪声'], top: 2, left: 0, textStyle: axisText },
    grid: { left: 58, right: 24, top: 45, bottom: 42 },
    xAxis: { type: 'value', name: 'APD 增益 M', nameTextStyle: axisText, axisLabel: axisText, splitLine: gridLine },
    yAxis: { type: 'log', name: '电流 / A', nameTextStyle: axisText, axisLabel: axisText, splitLine: gridLine },
    series: [
      { name: '倍增信号', type: 'line', showSymbol: false, data: gainPoints.map((p) => [p.x, p.result.signalCurrentA]), itemStyle: { color: '#ed9c58' } },
      { name: '体暗电流噪声', type: 'line', showSymbol: false, data: gainPoints.map((p) => [p.x, p.result.noises.bulkDarkShotA]), itemStyle: { color: '#ad7dd1' } },
      { name: '总噪声', type: 'line', showSymbol: false, data: gainPoints.map((p) => [p.x, p.result.noises.totalA]), itemStyle: { color: '#6fc8d5' } },
    ],
  };
  return (
    <div className="analysis-split">
      <div className="subchart">
        <div className="subchart-title"><span>噪声预算</span><strong>总计 {formatEngineering(result.noises.totalA, 'A')}</strong></div>
        <ReactECharts option={option} style={{ height: 330 }} />
      </div>
      <div className="subchart">
        <div className="subchart-title"><span>增益权衡</span><strong>F(M) = {result.excessNoiseFactor.toFixed(2)}</strong></div>
        <ReactECharts option={gainOption} style={{ height: 330 }} />
      </div>
    </div>
  );
}

function SpectrumView({ parameters, result }: { parameters: SimulationParameters; result: SimulationResult }) {
  const curves = spectralCurves(
    parameters.source.wavelengthM,
    parameters.source.spectralFwhmM,
    parameters.optics.filterCenterM,
    parameters.optics.filterFwhmM,
    parameters.optics.filterTransmission,
    parameters.apd.responsivityAW,
  );
  const option = {
    ...baseChart,
    legend: { data: ['LED 光谱', '滤光片', 'APD 响应度', '有效重叠'], top: 2, left: 0, textStyle: axisText },
    grid: { left: 52, right: 55, top: 48, bottom: 45 },
    xAxis: { type: 'value', name: '波长 / nm', nameTextStyle: axisText, axisLabel: axisText, splitLine: gridLine },
    yAxis: [
      { type: 'value', name: '归一化 / 透过率', min: 0, max: 1.05, nameTextStyle: axisText, axisLabel: axisText, splitLine: gridLine },
      { type: 'value', name: '响应度 / A/W', nameTextStyle: axisText, axisLabel: axisText, splitLine: { show: false } },
    ],
    series: [
      { name: 'LED 光谱', type: 'line', showSymbol: false, data: curves.data.map((p) => [p.wavelengthM * 1e9, p.source]), itemStyle: { color: '#ef9b57' }, areaStyle: { color: 'rgba(239,155,87,.08)' } },
      { name: '滤光片', type: 'line', showSymbol: false, data: curves.data.map((p) => [p.wavelengthM * 1e9, p.filter]), itemStyle: { color: '#71bfd0' } },
      { name: 'APD 响应度', type: 'line', yAxisIndex: 1, showSymbol: false, data: curves.data.map((p) => [p.wavelengthM * 1e9, p.responsivity]), itemStyle: { color: '#a482cb' } },
      { name: '有效重叠', type: 'line', showSymbol: false, data: curves.data.map((p) => [p.wavelengthM * 1e9, p.overlap / parameters.apd.responsivityAW]), itemStyle: { color: '#6bd49b' }, lineStyle: { width: 2.5 } },
    ],
  };
  return (
    <div className="analysis-view">
      <div className="spectrum-stats">
        <div><span>中心波长</span><strong>{parameters.source.wavelengthM * 1e9} nm</strong></div>
        <div><span>数值积分响应度</span><strong>{curves.effectiveResponsivityAW.toFixed(3)} A/W</strong></div>
        <div><span>当前采用</span><strong>{parameters.optics.fineSpectrum ? '积分结果' : '中心点简化值'}</strong></div>
        <div><span>初级光电流</span><strong>{formatEngineering(result.primaryCurrentA, 'A')}</strong></div>
      </div>
      <ReactECharts option={option} style={{ height: 365 }} />
      <p className="model-note">LED 与滤光片使用高斯 FWHM 模型；APD 曲线为围绕中心响应度的工程近似。可在左侧启用“精细光谱积分”。</p>
    </div>
  );
}

function MatrixView({ parameters }: { parameters: SimulationParameters }) {
  const [kind, setKind] = useState<'distanceIntensity' | 'gainBandwidth'>('distanceIntensity');
  const xValues = kind === 'distanceIntensity' ? linearSpace(1000, 10000, 24) : linearSpace(1, 300, 24);
  const yValues = kind === 'distanceIntensity' ? linearSpace(0.2, 5, 18) : linearSpace(10, 3000, 18);
  const xKey: SweepKey = kind === 'distanceIntensity' ? 'distanceM' : 'gain';
  const yKey: SweepKey = kind === 'distanceIntensity' ? 'radiantIntensityWsr' : 'enbwHz';
  const matrix = matrixSweep(parameters, xKey, xValues, yKey, yValues);
  const best = matrix.reduce((a, b) => (b.snrDb > a.snrDb ? b : a), matrix[0]);
  const option = {
    ...baseChart,
    tooltip: {
      ...baseChart.tooltip,
      trigger: 'item',
      formatter: (p: { value: [number, number, number] }) =>
        `${kind === 'distanceIntensity' ? '距离' : '增益'}：${formatNumber(p.value[0])}<br/>${kind === 'distanceIntensity' ? '辐射强度' : 'ENBW'}：${formatNumber(p.value[1])}<br/><b>SNR ${p.value[2].toFixed(2)} dB</b>`,
    },
    grid: { left: 66, right: 86, top: 35, bottom: 52 },
    xAxis: {
      type: 'value',
      name: kind === 'distanceIntensity' ? '距离 / km' : 'APD 增益 M',
      nameTextStyle: axisText,
      axisLabel: axisText,
      splitLine: gridLine,
    },
    yAxis: {
      type: 'value',
      name: kind === 'distanceIntensity' ? '辐射强度 / W·sr⁻¹' : 'ENBW / Hz',
      nameTextStyle: axisText,
      axisLabel: axisText,
      splitLine: gridLine,
    },
    visualMap: {
      min: Math.floor(Math.min(...matrix.map((p) => p.snrDb))),
      max: Math.ceil(Math.max(...matrix.map((p) => p.snrDb))),
      orient: 'vertical',
      right: 0,
      top: 'middle',
      textStyle: axisText,
      calculable: true,
      inRange: { color: ['#112a35', '#3f5979', '#b56565', '#efad62', '#f6df98'] },
    },
    series: [{
      type: 'heatmap',
      data: matrix.map((p) => [
        kind === 'distanceIntensity' ? p.x / 1000 : p.x,
        p.y,
        p.snrDb,
      ]),
      progressive: 1000,
      emphasis: { itemStyle: { borderColor: '#fff', borderWidth: 1 } },
      markPoint: {
        symbol: 'pin',
        symbolSize: 48,
        label: { show: false },
        itemStyle: { color: '#54d99b' },
        data: [{ coord: [kind === 'distanceIntensity' ? best.x / 1000 : best.x, best.y] }],
      },
    }],
  };
  return (
    <div className="analysis-view">
      <div className="analysis-toolbar">
        <label>矩阵组合
          <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="distanceIntensity">距离 × 辐射强度</option>
            <option value="gainBandwidth">APD 增益 × 带宽</option>
          </select>
        </label>
        <div className="matrix-legend">
          <span><i className="threshold t5" /> ≥5 可检测</span>
          <span><i className="threshold t10" /> ≥10 可靠</span>
          <span><i className="threshold t20" /> ≥20 高可靠</span>
        </div>
      </div>
      <ReactECharts option={option} style={{ height: 400 }} />
      <div className="chart-footnote"><span>绿色标记为网格内最优工作点</span><span>{matrix.length} 个参数组合，本地实时计算</span></div>
    </div>
  );
}

function BatchView({ parameters }: { parameters: SimulationParameters }) {
  const [filter, setFilter] = useState('');
  const [descending, setDescending] = useState(true);
  const rows = useMemo(() => defaultBatch(parameters), [parameters]);
  const filtered = rows
    .filter((row) => !filter || row.typical.detectionLabel.includes(filter))
    .sort((a, b) => (descending ? b.typical.modulatedSnr - a.typical.modulatedSnr : a.typical.modulatedSnr - b.typical.modulatedSnr));
  const exportRows = () => {
    const data = rows.map((row) => ({
      距离_km: row.distanceM / 1000,
      辐射强度_W每sr: row.radiantIntensityWsr,
      镜头入口功率_W: row.typical.lensPowerW,
      APD接收功率_W: row.typical.signalPowerW,
      初级光电流_A: row.typical.primaryCurrentA,
      APD倍增电流_A: row.typical.signalCurrentA,
      TIA输出_V: row.typical.tiaSignalV,
      总噪声_A: row.typical.noises.totalA,
      典型暗电流SNR: row.typical.modulatedSnr,
      最大暗电流SNR: row.maximum.modulatedSnr,
      SNR_dB: row.typical.snrDb,
      检测等级: row.typical.detectionLabel,
    }));
    downloadText('APD批量工况.csv', toCsv(data), 'text/csv;charset=utf-8');
  };
  return (
    <div className="table-view">
      <div className="analysis-toolbar">
        <label>检测等级筛选
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">全部 9 组</option><option>高可靠</option><option>可靠</option><option>可以</option><option>勉强</option>
          </select>
        </label>
        <button className="secondary-button" onClick={() => setDescending(!descending)}>SNR {descending ? '↓' : '↑'}</button>
        <button className="primary-button compact" onClick={exportRows}><Download size={14} /> 导出 CSV</button>
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>距离</th><th>光强</th><th>镜头入口</th><th>APD 接收</th><th>初级电流</th><th>倍增电流</th><th>TIA 输出</th><th>总噪声</th><th>典型 SNR</th><th>最大暗流 SNR</th><th>SNR dB</th><th>结论</th></tr></thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={`${row.distanceM}-${row.radiantIntensityWsr}`}>
                <td>{row.distanceM / 1000} km</td>
                <td>{row.radiantIntensityWsr} W/sr</td>
                <td>{formatEngineering(row.typical.lensPowerW, 'W')}</td>
                <td>{formatEngineering(row.typical.signalPowerW, 'W')}</td>
                <td>{formatEngineering(row.typical.primaryCurrentA, 'A')}</td>
                <td>{formatEngineering(row.typical.signalCurrentA, 'A')}</td>
                <td>{formatEngineering(row.typical.tiaSignalV, 'V')}</td>
                <td>{formatEngineering(row.typical.noises.totalA, 'A')}</td>
                <td>{row.typical.modulatedSnr.toFixed(2)}</td>
                <td>{row.maximum.modulatedSnr.toFixed(2)}</td>
                <td>{row.typical.snrDb.toFixed(2)}</td>
                <td><span className={`status-chip ${row.typical.modulatedSnr >= 10 ? 'good' : row.typical.modulatedSnr >= 3 ? 'warn' : 'bad'}`}>{row.typical.detectionLabel}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MultiView({
  parameters,
  links,
  onLinksChange,
}: {
  parameters: SimulationParameters;
  links: MultiLink[];
  onLinksChange: (links: MultiLink[]) => void;
}) {
  const multi = simulateMultiLinks(parameters, links);
  const update = (id: string, key: keyof MultiLink, value: string | number | boolean) =>
    onLinksChange(links.map((link) => (link.id === id ? { ...link, [key]: value } : link)));
  const add = () => {
    const index = links.length + 1;
    onLinksChange([...links, { id: `L${Date.now()}`, sourceName: `LED-${index}`, detectorName: `APD-${(index % 2) + 1}`, distanceM: 5000, radiantIntensityWsr: 1, transmission: 0.9, enabled: true }]);
  };
  const option = {
    ...baseChart,
    tooltip: { ...baseChart.tooltip, trigger: 'item' },
    grid: { left: 110, right: 35, top: 22, bottom: 42 },
    xAxis: { type: 'value', name: 'APD 接收光功率 / pW', nameTextStyle: axisText, axisLabel: axisText, splitLine: gridLine },
    yAxis: { type: 'category', data: multi.rows.map((r) => `${r.link.sourceName} → ${r.link.detectorName}`), axisLabel: axisText },
    series: [{ type: 'bar', data: multi.rows.map((r) => r.result.signalPowerW * 1e12), itemStyle: { color: '#e99555', borderRadius: [0, 4, 4, 0] }, barMaxWidth: 24 }],
  };
  return (
    <div className="multi-view">
      <div className="multi-editor">
        <div className="subchart-title"><span>链路配置</span><button className="secondary-button compact" onClick={add}><Plus size={13} /> 新增链路</button></div>
        <div className="link-list">
          {links.map((link) => (
            <div className="link-row" key={link.id}>
              <input type="checkbox" checked={link.enabled} onChange={(e) => update(link.id, 'enabled', e.target.checked)} />
              <input value={link.sourceName} aria-label="光源名称" onChange={(e) => update(link.id, 'sourceName', e.target.value)} />
              <span>→</span>
              <select value={link.detectorName} onChange={(e) => update(link.id, 'detectorName', e.target.value)}><option>APD-1</option><option>APD-2</option><option>APD-3</option></select>
              <label><input type="number" value={link.distanceM / 1000} min=".001" onChange={(e) => update(link.id, 'distanceM', Number(e.target.value) * 1000)} /><span>km</span></label>
              <label><input type="number" value={link.radiantIntensityWsr} min="0" onChange={(e) => update(link.id, 'radiantIntensityWsr', Number(e.target.value))} /><span>W/sr</span></label>
              <button className="icon-button danger" title="删除链路" onClick={() => onLinksChange(links.filter((item) => item.id !== link.id))}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      </div>
      <div className="subchart">
        <div className="subchart-title"><span>非相干功率叠加</span><strong>{formatEngineering(multi.totalPowerW, 'W')}</strong></div>
        <ReactECharts option={option} style={{ height: 290 }} />
      </div>
    </div>
  );
}

function MonteCarloView({ parameters }: { parameters: SimulationParameters }) {
  const [samples, setSamples] = useState(500);
  const [uncertainty, setUncertainty] = useState(10);
  const result = useMemo(() => monteCarlo(parameters, samples, uncertainty / 100), [parameters, samples, uncertainty]);
  const buckets = 30;
  const min = result.values[0];
  const max = result.values[result.values.length - 1];
  const width = (max - min) / buckets || 1;
  const histogram = Array.from({ length: buckets }, (_, index) => {
    const lower = min + index * width;
    const count = result.values.filter((v) => v >= lower && (index === buckets - 1 ? v <= lower + width : v < lower + width)).length;
    return [lower + width / 2, count];
  });
  const option = {
    ...baseChart,
    grid: { left: 54, right: 20, top: 35, bottom: 45 },
    xAxis: { type: 'value', name: 'SNR / dB', nameTextStyle: axisText, axisLabel: axisText, splitLine: gridLine },
    yAxis: { type: 'value', name: '样本数', nameTextStyle: axisText, axisLabel: axisText, splitLine: gridLine },
    series: [{ type: 'bar', data: histogram, barWidth: '92%', itemStyle: { color: '#658ea1', borderColor: '#8fb3bd', borderWidth: 0.5 } }],
  };
  return (
    <div className="analysis-view">
      <div className="analysis-toolbar">
        <NumberField label="随机样本" value={samples} unit="次" min={100} max={5000} onChange={(v) => setSamples(Math.round(v))} />
        <NumberField label="组合不确定度" value={uncertainty} unit="%" min={0} max={80} onChange={setUncertainty} />
        <div className="percentiles"><span>P05 <b>{result.p05.toFixed(1)} dB</b></span><span>中位 <b>{result.median.toFixed(1)} dB</b></span><span>P95 <b>{result.p95.toFixed(1)} dB</b></span></div>
      </div>
      <ReactECharts option={option} style={{ height: 365 }} />
      <p className="model-note">对光源强度、大气透过率与对准效率施加合成随机扰动，用于工程敏感度评估；结果不替代实测统计分布。</p>
    </div>
  );
}

export function AnalysisWorkspace({
  parameters,
  result,
  focusMode,
  links,
  onLinksChange,
}: AnalysisWorkspaceProps) {
  const [tab, setTab] = useState<WorkspaceTab>('scan');
  useEffect(() => {
    if (focusMode === 'scan') setTab('scan');
    if (focusMode === 'matrix') setTab('matrix');
    if (focusMode === 'multi') setTab('multi');
  }, [focusMode]);

  return (
    <section className="analysis-card">
      <div className="analysis-tabs">
        <TabButton active={tab === 'scan'} icon={<LineChart size={14} />} label="参数扫描" onClick={() => setTab('scan')} />
        <TabButton active={tab === 'noise'} icon={<BarChart3 size={14} />} label="噪声分解" onClick={() => setTab('noise')} />
        <TabButton active={tab === 'spectrum'} icon={<Waves size={14} />} label="光谱匹配" onClick={() => setTab('spectrum')} />
        <TabButton active={tab === 'matrix'} icon={<Grid3X3 size={14} />} label="矩阵热图" onClick={() => setTab('matrix')} />
        <TabButton active={tab === 'batch'} icon={<Table2 size={14} />} label="批量工况" onClick={() => setTab('batch')} />
        <TabButton active={tab === 'multi'} icon={<Network size={14} />} label="多链路" onClick={() => setTab('multi')} />
        <TabButton active={tab === 'monte'} icon={<FlaskConical size={14} />} label="蒙特卡洛" onClick={() => setTab('monte')} />
        <span className="analysis-local"><Boxes size={13} /> 本地计算</span>
      </div>
      {tab === 'scan' && <ScanView parameters={parameters} result={result} />}
      {tab === 'noise' && <NoiseView parameters={parameters} result={result} />}
      {tab === 'spectrum' && <SpectrumView parameters={parameters} result={result} />}
      {tab === 'matrix' && <MatrixView parameters={parameters} />}
      {tab === 'batch' && <BatchView parameters={parameters} />}
      {tab === 'multi' && <MultiView parameters={parameters} links={links} onLinksChange={onLinksChange} />}
      {tab === 'monte' && <MonteCarloView parameters={parameters} />}
    </section>
  );
}
