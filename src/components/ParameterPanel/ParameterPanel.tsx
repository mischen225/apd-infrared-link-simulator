import {
  Aperture,
  CircuitBoard,
  CloudSun,
  RadioTower,
  ScanLine,
  Telescope,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { SimulationParameters } from '../../models/types';
import { NumberField } from '../common/NumberField';

interface ParameterPanelProps {
  parameters: SimulationParameters;
  onChange: (parameters: SimulationParameters) => void;
}

function Section({
  icon,
  title,
  badge,
  children,
  open = false,
}: {
  icon: ReactNode;
  title: string;
  badge?: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="parameter-section" open={open}>
      <summary>
        <span>{icon}</span>
        <strong>{title}</strong>
        {badge && <span className="section-badge">{badge}</span>}
      </summary>
      <div className="parameter-fields">{children}</div>
    </details>
  );
}

export function ParameterPanel({ parameters, onChange }: ParameterPanelProps) {
  const update = <S extends keyof SimulationParameters, K extends keyof SimulationParameters[S]>(
    section: S,
    key: K,
    value: SimulationParameters[S][K],
  ) => {
    onChange({
      ...parameters,
      [section]: { ...parameters[section], [key]: value },
    });
  };

  return (
    <aside className="parameter-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">MODEL INPUTS</span>
          <h2>模型参数</h2>
        </div>
        <span className="live-pill"><i /> 实时联动</span>
      </div>

      <Section icon={<RadioTower size={15} />} title="红外光源" badge="用户输入" open>
        <label className="field-row">
          <span className="field-label">光源类型</span>
          <select
            value={parameters.source.type}
            onChange={(e) => update('source', 'type', e.target.value as SimulationParameters['source']['type'])}
          >
            <option>LED</option><option>激光器</option><option>自定义</option>
          </select>
        </label>
        <NumberField label="中心波长" value={parameters.source.wavelengthM * 1e9} unit="nm" min={200} onChange={(v) => update('source', 'wavelengthM', v * 1e-9)} />
        <NumberField label="光谱 FWHM" value={parameters.source.spectralFwhmM * 1e9} unit="nm" min={0.01} onChange={(v) => update('source', 'spectralFwhmM', v * 1e-9)} />
        <NumberField label="辐射强度" value={parameters.source.radiantIntensityWsr} unit="W/sr" min={0.000001} onChange={(v) => update('source', 'radiantIntensityWsr', v)} />
        <NumberField label="发散角" value={(parameters.source.divergenceRad * 180) / Math.PI} unit="°" min={0.001} onChange={(v) => update('source', 'divergenceRad', (v * Math.PI) / 180)} />
        <NumberField label="调制深度" value={parameters.source.modulationDepth * 100} unit="%" min={0} max={100} onChange={(v) => update('source', 'modulationDepth', v / 100)} />
      </Section>

      <Section icon={<CloudSun size={15} />} title="传播与大气" badge="近似模型" open>
        <NumberField label="水平距离" value={parameters.propagation.distanceM / 1000} unit="km" min={0.001} onChange={(v) => update('propagation', 'distanceM', v * 1000)} />
        <label className="field-row">
          <span className="field-label">大气输入</span>
          <select
            value={parameters.propagation.attenuationMode}
            onChange={(e) => update('propagation', 'attenuationMode', e.target.value as SimulationParameters['propagation']['attenuationMode'])}
          >
            <option value="transmission">直接透过率</option>
            <option value="dbPerKm">衰减系数</option>
          </select>
        </label>
        {parameters.propagation.attenuationMode === 'transmission' ? (
          <NumberField label="大气透过率" value={parameters.propagation.atmosphericTransmission} unit="0–1" min={0.0001} max={1} step={0.01} onChange={(v) => update('propagation', 'atmosphericTransmission', v)} />
        ) : (
          <NumberField label="大气衰减" value={parameters.propagation.attenuationDbPerKm} unit="dB/km" min={0} step={0.01} onChange={(v) => update('propagation', 'attenuationDbPerKm', v)} />
        )}
        <NumberField label="指向效率" value={parameters.propagation.pointingEfficiency * 100} unit="%" min={0} max={100} onChange={(v) => update('propagation', 'pointingEfficiency', v / 100)} />
        <NumberField label="平台抖动效率" value={parameters.propagation.jitterEfficiency * 100} unit="%" min={0} max={100} onChange={(v) => update('propagation', 'jitterEfficiency', v / 100)} />
        <NumberField label="湍流效率" value={parameters.propagation.turbulenceEfficiency * 100} unit="%" min={0} max={100} onChange={(v) => update('propagation', 'turbulenceEfficiency', v / 100)} />
        <NumberField label="其他损耗" value={parameters.propagation.otherLossDb} unit="dB" min={0} onChange={(v) => update('propagation', 'otherLossDb', v)} />
      </Section>

      <Section icon={<Telescope size={15} />} title="接收光学" badge="SI 内核">
        <NumberField label="透镜口径" value={parameters.optics.apertureDiameterM * 1000} unit="mm" min={0.01} onChange={(v) => update('optics', 'apertureDiameterM', v * 1e-3)} />
        <NumberField label="中心遮挡" value={parameters.optics.obscurationRatio * 100} unit="%" min={0} max={99} onChange={(v) => update('optics', 'obscurationRatio', v / 100)} />
        <NumberField label="透镜透过率" value={parameters.optics.lensTransmission * 100} unit="%" min={0} max={100} onChange={(v) => update('optics', 'lensTransmission', v / 100)} />
        <NumberField label="滤光片透过率" value={parameters.optics.filterTransmission * 100} unit="%" min={0} max={100} onChange={(v) => update('optics', 'filterTransmission', v / 100)} />
        <NumberField label="光谱匹配" value={parameters.optics.spectralEfficiency * 100} unit="%" min={0} max={100} onChange={(v) => update('optics', 'spectralEfficiency', v / 100)} />
        <NumberField label="耦合效率" value={parameters.optics.couplingEfficiency * 100} unit="%" min={0} max={100} onChange={(v) => update('optics', 'couplingEfficiency', v / 100)} />
        <NumberField label="对准效率" value={parameters.optics.alignmentEfficiency * 100} unit="%" min={0} max={100} onChange={(v) => update('optics', 'alignmentEfficiency', v / 100)} />
        <NumberField label="滤光片带宽" value={parameters.optics.filterFwhmM * 1e9} unit="nm" min={0.01} onChange={(v) => update('optics', 'filterFwhmM', v * 1e-9)} />
        <label className="switch-row">
          <span>精细光谱积分</span>
          <input type="checkbox" checked={parameters.optics.fineSpectrum} onChange={(e) => update('optics', 'fineSpectrum', e.target.checked)} />
        </label>
      </Section>

      <Section icon={<Aperture size={15} />} title="APD 探测器" badge="核心模型" open>
        <label className="field-row">
          <span className="field-label">型号库</span>
          <select value={parameters.apd.model} onChange={(e) => update('apd', 'model', e.target.value)}>
            <option>Hamamatsu S12023-10</option>
            <option>自定义 Si APD</option>
            <option>自定义 InGaAs APD</option>
          </select>
        </label>
        <NumberField label="响应度" value={parameters.apd.responsivityAW} unit="A/W" min={0.001} onChange={(v) => update('apd', 'responsivityAW', v)} />
        <NumberField label="雪崩增益 M" value={parameters.apd.gain} unit="×" min={1} onChange={(v) => update('apd', 'gain', v)} />
        <label className="field-row">
          <span className="field-label">过剩噪声</span>
          <select value={parameters.apd.excessNoiseMode} onChange={(e) => update('apd', 'excessNoiseMode', e.target.value as SimulationParameters['apd']['excessNoiseMode'])}>
            <option value="exponent">指数 F=Mˣ</option>
            <option value="mcintyre">McIntyre</option>
            <option value="direct">直接输入 F</option>
          </select>
        </label>
        {parameters.apd.excessNoiseMode === 'exponent' && <NumberField label="噪声指数 x" value={parameters.apd.excessNoiseExponent} unit="" min={0} onChange={(v) => update('apd', 'excessNoiseExponent', v)} />}
        {parameters.apd.excessNoiseMode === 'mcintyre' && <NumberField label="电离率比 k" value={parameters.apd.ionizationRatio} unit="" min={0} max={1} onChange={(v) => update('apd', 'ionizationRatio', v)} />}
        {parameters.apd.excessNoiseMode === 'direct' && <NumberField label="噪声因子 F" value={parameters.apd.directExcessNoiseFactor} unit="" min={1} onChange={(v) => update('apd', 'directExcessNoiseFactor', v)} />}
        <label className="field-row">
          <span className="field-label">暗电流定义</span>
          <select value={parameters.apd.darkCurrentMode} onChange={(e) => update('apd', 'darkCurrentMode', e.target.value as SimulationParameters['apd']['darkCurrentMode'])}>
            <option value="advanced">体倍增 / 表面不倍增</option>
            <option value="measuredAtGain">M 下实测总暗电流</option>
            <option value="preMultiplication">倍增前暗电流</option>
            <option value="conservative">保守：全部倍增</option>
          </select>
        </label>
        <NumberField label="典型暗电流" value={parameters.apd.darkCurrentA * 1e9} unit="nA" min={0} onChange={(v) => update('apd', 'darkCurrentA', v * 1e-9)} />
        <NumberField label="体暗电流" value={parameters.apd.bulkDarkCurrentA * 1e9} unit="nA" min={0} onChange={(v) => update('apd', 'bulkDarkCurrentA', v * 1e-9)} />
        <NumberField label="表面暗电流" value={parameters.apd.surfaceDarkCurrentA * 1e9} unit="nA" min={0} onChange={(v) => update('apd', 'surfaceDarkCurrentA', v * 1e-9)} />
        <NumberField label="结电容" value={parameters.apd.junctionCapacitanceF * 1e12} unit="pF" min={0} onChange={(v) => update('apd', 'junctionCapacitanceF', v * 1e-12)} />
        <NumberField label="APD 负载电阻" value={parameters.apd.loadResistanceOhm / 1e6} unit="MΩ" min={0.000001} onChange={(v) => update('apd', 'loadResistanceOhm', v * 1e6)} />
        <label className="switch-row">
          <span>计入负载热噪声</span>
          <input
            type="checkbox"
            checked={parameters.apd.includeLoadThermalNoise}
            onChange={(e) => update('apd', 'includeLoadThermalNoise', e.target.checked)}
          />
        </label>
        <p className="parameter-note">独立电阻负载时开启；TIA 结构通常关闭，以免与反馈电阻 Rf 的热噪声重复计算。</p>
      </Section>

      <Section icon={<ScanLine size={15} />} title="背景光与带宽" badge="噪声源">
        <NumberField label="背景光功率" value={parameters.background.directPowerW * 1e12} unit="pW" min={0} onChange={(v) => update('background', 'directPowerW', v * 1e-12)} />
        <NumberField label="等效噪声带宽" value={parameters.tia.enbwHz} unit="Hz ENBW" min={0.001} onChange={(v) => update('tia', 'enbwHz', v)} />
        <NumberField label="环境温度" value={parameters.apd.temperatureK - 273.15} unit="°C" onChange={(v) => update('apd', 'temperatureK', v + 273.15)} />
      </Section>

      <Section icon={<CircuitBoard size={15} />} title="TIA 与 ADC" badge="高级积分">
        <NumberField label="反馈电阻" value={parameters.tia.feedbackResistanceOhm / 1e6} unit="MΩ" min={0.0001} onChange={(v) => update('tia', 'feedbackResistanceOhm', v * 1e6)} />
        <NumberField label="反馈电容" value={parameters.tia.feedbackCapacitanceF * 1e12} unit="pF" min={0} onChange={(v) => update('tia', 'feedbackCapacitanceF', v * 1e-12)} />
        <NumberField label="运放电流噪声" value={parameters.tia.opAmpCurrentNoiseAHz * 1e15} unit="fA/√Hz" min={0} onChange={(v) => update('tia', 'opAmpCurrentNoiseAHz', v * 1e-15)} />
        <NumberField label="运放电压噪声" value={parameters.tia.opAmpVoltageNoiseVHz * 1e9} unit="nV/√Hz" min={0} onChange={(v) => update('tia', 'opAmpVoltageNoiseVHz', v * 1e-9)} />
        <NumberField label="后级电压增益" value={parameters.tia.postGain} unit="×" min={0.001} onChange={(v) => update('tia', 'postGain', v)} />
        <NumberField label="ADC 满量程" value={parameters.tia.adcFullScaleV} unit="V" min={0.001} onChange={(v) => update('tia', 'adcFullScaleV', v)} />
        <NumberField label="ADC 位数" value={parameters.tia.adcBits} unit="bit" min={1} max={32} onChange={(v) => update('tia', 'adcBits', Math.round(v))} />
      </Section>
    </aside>
  );
}
