import { BookOpen, ChevronDown, Copy, Info } from 'lucide-react';
import type { SimulationParameters, SimulationResult } from '../../models/types';
import { resolveDarkCurrent } from '../../calculations/apd';
import { formatEngineering } from '../../utils/format';

export function FormulaViewer({
  parameters,
  result,
  onCopy,
}: {
  parameters: SimulationParameters;
  result: SimulationResult;
  onCopy: () => void;
}) {
  const dark = resolveDarkCurrent(parameters.apd);
  return (
    <section className="formula-card">
      <details>
        <summary>
          <span className="formula-title"><BookOpen size={16} /> 公式与本次计算过程</span>
          <span className="formula-summary">
            7 阶段 · 高级 APD 噪声模型
            <ChevronDown size={15} />
          </span>
        </summary>
        <div className="formula-content">
          <div className="formula-grid">
            <div className="formula-step">
              <span>01 / 几何接收</span>
              <code>A<sub>eff</sub> = πD²(1−ε)/4</code>
              <p>D = {(parameters.optics.apertureDiameterM * 1000).toFixed(2)} mm → A<sub>eff</sub> = {(result.effectiveAreaM2 * 1e6).toFixed(3)} mm²</p>
            </div>
            <div className="formula-step">
              <span>02 / 入口光功率</span>
              <code>P<sub>lens</sub> = I<sub>e</sub>A<sub>eff</sub>/R²</code>
              <p>{parameters.source.radiantIntensityWsr} W/sr × A<sub>eff</sub> ÷ {(result.distanceM / 1000).toFixed(2)}² km → {formatEngineering(result.lensPowerW, 'W')}</p>
            </div>
            <div className="formula-step">
              <span>03 / 链路效率</span>
              <code>P<sub>sig</sub> = P<sub>lens</sub>∏η<sub>i</sub></code>
              <p>大气、镜头、滤光片、光谱、耦合、对准与抖动逐项相乘 → {formatEngineering(result.signalPowerW, 'W')}</p>
            </div>
            <div className="formula-step">
              <span>04 / APD 倍增</span>
              <code>I<sub>p</sub> = R<sub>λ</sub>P<sub>sig</sub>；I<sub>sig</sub> = MI<sub>p</sub></code>
              <p>{result.responsivityAW.toFixed(3)} A/W × P<sub>sig</sub> → {formatEngineering(result.primaryCurrentA, 'A')} → ×{parameters.apd.gain} = {formatEngineering(result.signalCurrentA, 'A')}</p>
            </div>
            <div className="formula-step">
              <span>05 / 散粒噪声</span>
              <code>i² = 2qB[M²F(I<sub>p</sub>+I<sub>bg</sub>+I<sub>db</sub>)+I<sub>ds</sub>]</code>
              <p>F(M) = {result.excessNoiseFactor.toFixed(3)}，ENBW = {parameters.tia.enbwHz} Hz；{dark.definition}</p>
            </div>
            <div className="formula-step">
              <span>06 / 总 RMS 噪声</span>
              <code>i<sub>total</sub> = √Σi<sub>n</sub>²</code>
              <p>散粒、热噪声、运放频域积分、偏置、ADC 与其他噪声 → {formatEngineering(result.noises.totalA, 'A')}</p>
            </div>
            <div className="formula-step">
              <span>07 / 调制 SNR</span>
              <code>SNR = mI<sub>sig</sub>/i<sub>total</sub>；SNR<sub>dB</sub> = 20log₁₀(SNR)</code>
              <p>m = {(parameters.source.modulationDepth * 100).toFixed(1)}% → {result.modulatedSnr.toFixed(3)} / {result.snrDb.toFixed(2)} dB</p>
            </div>
          </div>
          <div className="formula-callout">
            <Info size={15} />
            <p><strong>定义一致性：</strong>此处使用信号电流幅值与 RMS 噪声电流的幅度比，因此 dB 形式采用 20log₁₀。若改用信号功率与噪声功率之比，应采用 10log₁₀。</p>
          </div>
          <button className="secondary-button" onClick={onCopy}><Copy size={14} /> 复制公式与当前结果</button>
        </div>
      </details>
    </section>
  );
}
