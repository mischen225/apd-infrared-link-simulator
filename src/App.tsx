import {
  Activity,
  Braces,
  Check,
  ChevronDown,
  CircleDot,
  Copy,
  Database,
  Download,
  FileDown,
  FileUp,
  FlaskConical,
  Gauge,
  Info,
  Network,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { simulate } from './calculations/simulate';
import { AnalysisWorkspace } from './components/Charts/AnalysisWorkspace';
import { FormulaViewer } from './components/FormulaViewer/FormulaViewer';
import { ParameterPanel } from './components/ParameterPanel/ParameterPanel';
import { ResultCards } from './components/ResultCards/ResultCards';
import { SceneView } from './components/SceneView/SceneView';
import { cloneDefaults, DEFAULT_MULTI_LINKS } from './data/defaults';
import type { CustomParameter, MultiLink, SimulationParameters } from './models/types';
import { downloadText } from './utils/export';
import { formatEngineering } from './utils/format';
import { safeParseConfiguration, validateParameters } from './utils/validation';
import './styles.css';

type Mode = 'single' | 'scan' | 'matrix' | 'multi';
interface SavedScenario {
  id: string;
  name: string;
  parameters: SimulationParameters;
}

const MODE_ITEMS: { id: Mode; label: string; caption: string; icon: React.ReactNode }[] = [
  { id: 'single', label: '单场景', caption: '实时工作点', icon: <CircleDot size={14} /> },
  { id: 'scan', label: '参数扫描', caption: '一维灵敏度', icon: <Activity size={14} /> },
  { id: 'matrix', label: '参数矩阵', caption: '二维热力图', icon: <Database size={14} /> },
  { id: 'multi', label: '多源 / 多 APD', caption: '链路阵列', icon: <Network size={14} /> },
];

function loadSavedScenarios(): SavedScenario[] {
  try {
    return JSON.parse(localStorage.getItem('apd-scenarios') ?? '[]') as SavedScenario[];
  } catch {
    return [];
  }
}

export default function App() {
  const [parameters, setParameters] = useState<SimulationParameters>(() => cloneDefaults());
  const [mode, setMode] = useState<Mode>('single');
  const [links, setLinks] = useState<MultiLink[]>(() => structuredClone(DEFAULT_MULTI_LINKS));
  const [jsonOpen, setJsonOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [jsonDraft, setJsonDraft] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [scenarios, setScenarios] = useState<SavedScenario[]>(loadSavedScenarios);
  const [scenarioMenu, setScenarioMenu] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const result = useMemo(() => simulate(parameters), [parameters]);
  const validation = useMemo(() => validateParameters(parameters), [parameters]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    localStorage.setItem('apd-scenarios', JSON.stringify(scenarios));
  }, [scenarios]);

  const exportConfiguration = () => {
    downloadText('APD光链路配置.json', JSON.stringify(parameters, null, 2), 'application/json');
    setToast('模型配置已导出');
  };

  const importConfiguration = async (file: File) => {
    const parsed = safeParseConfiguration(await file.text());
    if (!parsed.valid || !parsed.value) {
      setError(parsed.errors.join('；'));
      return;
    }
    setParameters(parsed.value);
    setError('');
    setToast('模型配置已载入并通过校验');
  };

  const copySummary = async () => {
      const text = [
        'APD红外光链路综合仿真结果',
        `P_fs = Ie·Aeff/R² = ${result.freeSpaceCapturePowerW.toExponential(6)} W`,
        `P_lens = P_fs·η_propagation = ${result.lensPowerW.toExponential(6)} W`,
        `P_sig = P_lens·η_receiver = ${result.signalPowerW.toExponential(6)} W`,
        `η_propagation = ${result.propagationEfficiency.toExponential(6)}`,
        `η_receiver = ${result.receiverOpticalEfficiency.toExponential(6)}`,
        `功率账本闭合误差 = ${result.reconciliationErrorFraction.toExponential(6)}`,
        `I_p = Rλ·P_sig = ${result.primaryCurrentA.toExponential(6)} A`,
        `I_sig = M·I_p = ${result.signalCurrentA.toExponential(6)} A`,
        `i_th,rms = ${result.apdThermalNoise.currentRmsA.toExponential(6)} A`,
        `i_th,density = ${result.apdThermalNoise.currentDensityAHz.toExponential(6)} A/√Hz`,
        `v_th,rms = ${result.apdThermalNoise.voltageRmsV.toExponential(6)} V`,
        `v_th,density = ${result.apdThermalNoise.voltageDensityVHz.toExponential(6)} V/√Hz`,
        `i_APD,shot+thermal = ${result.apdThermalNoise.shotAndThermalRmsA.toExponential(6)} A`,
        `i_total = √Σi² = ${result.noises.totalA.toExponential(6)} A RMS`,
        `SNR_mod = m·I_sig/i_total = ${result.modulatedSnr.toFixed(6)}`,
      `SNR_dB = 20log10(SNR_mod) = ${result.snrDb.toFixed(3)} dB`,
      `结论：${result.detectionLabel}`,
    ].join('\n');
    await navigator.clipboard.writeText(text);
    setToast('公式与当前结果已复制');
  };

  const openJsonEditor = () => {
    setJsonDraft(JSON.stringify(parameters, null, 2));
    setJsonOpen(true);
    setError('');
  };

  const applyJson = () => {
    const parsed = safeParseConfiguration(jsonDraft);
    if (!parsed.valid || !parsed.value) {
      setError(parsed.errors.join('；'));
      return;
    }
    setParameters(parsed.value);
    setJsonOpen(false);
    setError('');
    setToast('高级 JSON 已应用');
  };

  const saveScenario = () => {
    const name = `场景 ${scenarios.length + 1} · ${(parameters.propagation.distanceM / 1000).toFixed(1)} km`;
    setScenarios([...scenarios, { id: crypto.randomUUID(), name, parameters: structuredClone(parameters) }]);
    setToast(`已保存“${name}”`);
  };

  const addCustomParameter = (parameter: CustomParameter) => {
    setParameters({ ...parameters, customParameters: [...parameters.customParameters, parameter] });
    setCustomOpen(false);
    setToast('自定义参数已加入模型');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Sparkles size={19} /></div>
          <div>
            <h1>APD红外光链路综合仿真平台</h1>
            <p>APD INFRARED LINK ENGINEERING SIMULATOR</p>
          </div>
        </div>
        <div className="system-status">
          <span><i /> 计算内核在线</span>
          <span>v1.0.0</span>
          <span>SI UNIT CORE</span>
        </div>
      </header>

      <nav className="modebar">
        <div className="mode-tabs">
          {MODE_ITEMS.map((item) => (
            <button key={item.id} className={mode === item.id ? 'active' : ''} onClick={() => setMode(item.id)}>
              {item.icon}
              <span><strong>{item.label}</strong><small>{item.caption}</small></span>
            </button>
          ))}
        </div>
        <div className="toolbar-actions">
          <button className="toolbar-button" onClick={() => fileInput.current?.click()} title="导入 JSON 配置"><FileUp size={14} /> 导入</button>
          <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && void importConfiguration(e.target.files[0])} />
          <button className="toolbar-button" onClick={exportConfiguration} title="导出 JSON 配置"><FileDown size={14} /> 导出</button>
          <button className="toolbar-button" onClick={saveScenario} title="保存当前场景"><Save size={14} /> 保存场景</button>
          <div className="scenario-dropdown">
            <button className="toolbar-button icon-only" onClick={() => setScenarioMenu(!scenarioMenu)} title="管理已保存场景"><ChevronDown size={15} /></button>
            {scenarioMenu && (
              <div className="scenario-menu">
                <div className="scenario-menu-title">本地场景</div>
                {scenarios.length === 0 && <p>尚未保存场景</p>}
                {scenarios.map((scenario) => (
                  <div className="scenario-item" key={scenario.id}>
                    <button onClick={() => { setParameters(structuredClone(scenario.parameters)); setScenarioMenu(false); }}>{scenario.name}</button>
                    <button className="icon-button danger" title="删除场景" onClick={() => setScenarios(scenarios.filter((s) => s.id !== scenario.id))}><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="toolbar-button" onClick={openJsonEditor} title="高级 JSON 编辑器"><Braces size={14} /> JSON</button>
          <button className="toolbar-button" onClick={() => setCustomOpen(true)} title="新增高级自定义参数"><Plus size={14} /> 自定义</button>
          <button className="toolbar-button" onClick={() => { setParameters(cloneDefaults()); setToast('已恢复默认演示工况'); }} title="恢复默认参数"><RefreshCcw size={14} /></button>
        </div>
      </nav>

      {!validation.valid && <div className="global-error"><Info size={14} /> {validation.errors.join('；')}</div>}
      {error && <div className="global-error"><Info size={14} /> {error}<button onClick={() => setError('')}><X size={13} /></button></div>}

      <main className="dashboard-grid">
        <ParameterPanel parameters={parameters} onChange={setParameters} />
        <div className="center-column">
          <div className="context-strip">
            <div><SlidersHorizontal size={14} /><span>当前工况</span><strong>{parameters.propagation.weather}</strong></div>
            <div><span>波长</span><strong>{parameters.source.wavelengthM * 1e9} nm</strong></div>
            <div><span>距离</span><strong>{(result.distanceM / 1000).toFixed(2)} km</strong></div>
            <div><span>APD</span><strong>{parameters.apd.model}</strong></div>
            <div><span>ENBW</span><strong>{parameters.tia.enbwHz} Hz</strong></div>
          </div>
          <SceneView parameters={parameters} result={result} links={links} multiMode={mode === 'multi'} />
        </div>
        <ResultCards result={result} />
      </main>

      <div className="lower-content">
        <AnalysisWorkspace
          parameters={parameters}
          result={result}
          focusMode={mode}
          links={links}
          onLinksChange={setLinks}
        />
        <FormulaViewer parameters={parameters} result={result} onCopy={() => void copySummary()} />

        <section className="engineering-summary">
          <div>
            <span className="summary-icon"><Gauge size={17} /></span>
            <p><small>连续光 SNR</small><strong>{result.snr.toFixed(2)}</strong></p>
          </div>
          <div>
            <span className="summary-icon"><FlaskConical size={17} /></span>
            <p><small>APD 平均输出</small><strong>{formatEngineering(result.meanOutputCurrentA, 'A')}</strong></p>
          </div>
          <div>
            <span className="summary-icon"><Settings2 size={17} /></span>
            <p><small>ADC 有效码值</small><strong>{result.adcCode.toLocaleString('zh-CN')}</strong></p>
          </div>
          <div className="summary-actions">
            <button className="secondary-button" onClick={() => void copySummary()}><Copy size={14} /> 复制结果</button>
            <button className="secondary-button" onClick={() => window.print()}><Printer size={14} /> 打印报告</button>
            <button className="primary-button" onClick={exportConfiguration}><Download size={14} /> 导出配置</button>
          </div>
        </section>
      </div>

      <footer>
        <div><span className="footer-mark">APD</span><p><strong>工程估算声明</strong>本工具用于光链路预算和工程预估，最终性能需结合器件实测、实际大气条件、光谱数据、光学杂散光、PCB漏电、偏置噪声和前置放大器实测结果验证。</p></div>
        <span>纯浏览器本地计算 · 无服务器 · 可离线运行</span>
      </footer>

      {jsonOpen && (
        <div className="modal-backdrop" onMouseDown={() => setJsonOpen(false)}>
          <div className="modal json-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-title"><div><Braces size={17} /><span><strong>高级 JSON 编辑器</strong><small>完整 SI 单位模型 · 保存自定义字段</small></span></div><button className="icon-button" onClick={() => setJsonOpen(false)}><X size={17} /></button></div>
            <textarea spellCheck={false} value={jsonDraft} onChange={(e) => setJsonDraft(e.target.value)} />
            {error && <div className="inline-error">{error}</div>}
            <div className="modal-actions"><button className="secondary-button" onClick={() => setJsonDraft(JSON.stringify(cloneDefaults(), null, 2))}>载入默认值</button><span /><button className="secondary-button" onClick={() => setJsonOpen(false)}>取消</button><button className="primary-button" onClick={applyJson}><Check size={14} /> 校验并应用</button></div>
          </div>
        </div>
      )}

      {customOpen && <CustomParameterModal onClose={() => setCustomOpen(false)} onAdd={addCustomParameter} />}
      {toast && <div className="toast"><Check size={15} /> {toast}</div>}
    </div>
  );
}

function CustomParameterModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (parameter: CustomParameter) => void;
}) {
  const [draft, setDraft] = useState<Omit<CustomParameter, 'id'>>({
    name: '自定义损耗系数',
    symbol: 'η_custom',
    value: 1,
    unit: '',
    min: 0,
    max: 1,
    category: '传播',
  });
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal custom-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-title"><div><Plus size={17} /><span><strong>新增自定义参数</strong><small>参数会随 JSON 配置一起保存</small></span></div><button className="icon-button" onClick={onClose}><X size={17} /></button></div>
        <div className="custom-grid">
          <label>参数名称<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
          <label>变量符号<input value={draft.symbol} onChange={(e) => setDraft({ ...draft, symbol: e.target.value })} /></label>
          <label>数值<input type="number" value={draft.value} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })} /></label>
          <label>单位<input value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} /></label>
          <label>最小值<input type="number" value={draft.min} onChange={(e) => setDraft({ ...draft, min: Number(e.target.value) })} /></label>
          <label>最大值<input type="number" value={draft.max} onChange={(e) => setDraft({ ...draft, max: Number(e.target.value) })} /></label>
          <label className="wide">分类<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as CustomParameter['category'] })}><option>光源</option><option>传播</option><option>光学</option><option>APD</option><option>背景光</option><option>电子学</option></select></label>
        </div>
        <div className="modal-actions"><span /><button className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" onClick={() => onAdd({ ...draft, id: crypto.randomUUID() })}><Plus size={14} /> 添加参数</button></div>
      </div>
    </div>
  );
}
