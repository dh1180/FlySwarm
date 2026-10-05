import type { CSSProperties } from 'react';
import type { SkillKey } from '../game/types';

type Props = {
  skill: SkillKey;
  size?: number;
  className?: string;
};

export const skillAccent: Record<SkillKey, string> = {
  damage: '#ff745f',
  firerate: '#ffe36e',
  multishot: '#ffcf57',
  speed: '#7ef0b1',
  health: '#ff6673',
  pierce: '#ffa75b',
  magnet: '#5beaff',
  bulletSpeed: '#7ce8ff',
  bulletSize: '#c990ff',
  crit: '#ffd45c',
  regen: '#70ec8b',
  armor: '#b8c7d5',
  knockback: '#f2a56b',
  orbital: '#5beaff',
  nova: '#76f3ff',
  xpGain: '#c7ff45',
  bossDamage: '#ff9c38',
  critPower: '#ffc94d',
  leech: '#ff4e73',
  toxinAura: '#9ce84d',
  chain: '#68e1ff',
  shield: '#98eeff',
  adrenaline: '#ff783d',
  bulletLife: '#b9a2ff',
  overclock: '#ff58bb',
  manualLance: '#eefcff',
  targetLightning: '#d9f7ff',
  synapticField: '#a9ff68',
  meteor: '#ffd063',
  ricochet: '#91f2db',
  execute: '#ff4766',
  stormLance: '#ffffff',
  ionCataclysm: '#e7fbff',
  neuralSingularity: '#ffffff',
};

export default function SkillIcon({
  skill,
  size = 36,
  className,
}: Props) {
  const color = skillAccent[skill];
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const style = { '--skill-accent': color } as CSSProperties;

  const glyph = (() => {
    switch (skill) {
      case 'damage':
        return <>
          <circle cx="16" cy="16" r="4.5" {...common}/>
          <path d="M16 3.5v6M16 22.5v6M3.5 16h6M22.5 16h6" {...common}/>
          <path d="M7.4 7.4l4.1 4.1M20.5 20.5l4.1 4.1M24.6 7.4l-4.1 4.1M11.5 20.5l-4.1 4.1" {...common}/>
        </>;
      case 'firerate':
        return <>
          <path d="M18 3L8 18h7l-1 11L25 13h-7z" {...common}/>
          <path d="M5 9h5M4 14h4M23 21h5" {...common}/>
        </>;
      case 'multishot':
        return <>
          <circle cx="6" cy="16" r="2.2" {...common}/>
          <path d="M8.4 16h6M14.5 16l9-8M14.5 16l9 0M14.5 16l9 8" {...common}/>
          <path d="M22 6l3 2-3 2M23 14l3 2-3 2M22 22l3 2-3 2" {...common}/>
        </>;
      case 'speed':
        return <>
          <path d="M7 22c2-7 6-12 13-14l4 5-6 4-2 7z" {...common}/>
          <path d="M6 8h7M3 13h8M4 18h5" {...common}/>
        </>;
      case 'health':
        return <>
          <path d="M16 27S5 21 5 12c0-4 2.8-7 6.4-7 2.2 0 3.8 1.2 4.6 3 0.8-1.8 2.4-3 4.6-3C24.2 5 27 8 27 12c0 9-11 15-11 15z" {...common}/>
          <path d="M10 16h4l2-5 2.5 9 2-4H24" {...common}/>
        </>;
      case 'pierce':
        return <>
          <path d="M5 24L24 5" {...common}/>
          <path d="M18 5h6v6M7 19l6 6M4 27l4-4" {...common}/>
          <circle cx="12" cy="17" r="3" {...common}/>
        </>;
      case 'magnet':
        return <>
          <path d="M8 6v11a8 8 0 0016 0V6" {...common}/>
          <path d="M8 6h6v7H8zM18 6h6v7h-6z" {...common}/>
          <circle cx="4" cy="22" r="1.5" {...common}/>
          <circle cx="28" cy="22" r="1.5" {...common}/>
        </>;
      case 'bulletSpeed':
        return <>
          <path d="M4 16h17" {...common}/>
          <path d="M18 9l9 7-9 7" {...common}/>
          <path d="M4 10h8M2 22h10" {...common}/>
        </>;
      case 'bulletSize':
        return <>
          <circle cx="16" cy="16" r="8" {...common}/>
          <circle cx="16" cy="16" r="3" {...common}/>
          <path d="M16 2v5M16 25v5M2 16h5M25 16h5" {...common}/>
        </>;
      case 'crit':
        return <>
          <path d="M16 3l2.3 7 7.4-2.5-4.5 6 6.3 4.5-7.7-.2.2 7.7-4.5-6.3-6 4.5 2.5-7.4-7-2.3 7-2.3-2.5-7.4 6 4.5z" {...common}/>
        </>;
      case 'regen':
        return <>
          <path d="M8 20c0-8 5-13 15-14-1 10-6 15-14 15" {...common}/>
          <path d="M8 27v-7c0-5 3-8 8-10" {...common}/>
          <path d="M20 23h7M23.5 19.5v7" {...common}/>
        </>;
      case 'armor':
        return <>
          <path d="M16 3l10 4v8c0 7-4 11-10 14-6-3-10-7-10-14V7z" {...common}/>
          <path d="M11 16l3 3 7-8" {...common}/>
        </>;
      case 'knockback':
        return <>
          <circle cx="9" cy="16" r="4" {...common}/>
          <path d="M13 16h10M20 11l6 5-6 5" {...common}/>
          <path d="M4 8l3 3M4 24l3-3" {...common}/>
        </>;
      case 'orbital':
        return <>
          <circle cx="16" cy="16" r="4" {...common}/>
          <ellipse cx="16" cy="16" rx="12" ry="6" transform="rotate(-25 16 16)" {...common}/>
          <circle cx="25" cy="11" r="2" {...common}/>
        </>;
      case 'nova':
        return <>
          <circle cx="16" cy="16" r="4" {...common}/>
          <circle cx="16" cy="16" r="9" {...common}/>
          <path d="M16 2v5M16 25v5M2 16h5M25 16h5M6 6l4 4M22 22l4 4M26 6l-4 4M10 22l-4 4" {...common}/>
        </>;
      case 'xpGain':
        return <>
          <path d="M16 4c6 0 10 4 10 9 0 4-2 6-5 8v5H11v-5c-3-2-5-4-5-8 0-5 4-9 10-9z" {...common}/>
          <path d="M11 13h10M13 9v8M19 9v8M11 26h10" {...common}/>
        </>;
      case 'bossDamage':
        return <>
          <circle cx="16" cy="16" r="11" {...common}/>
          <circle cx="16" cy="16" r="5" {...common}/>
          <path d="M23 5l4 4-8 8M24 5h4v4" {...common}/>
        </>;
      case 'critPower':
        return <>
          <path d="M16 3l3.2 8.4L28 12l-6.7 5.7L23 27l-7-5-7 5 1.7-9.3L4 12l8.8-.6z" {...common}/>
          <circle cx="16" cy="16" r="3" {...common}/>
        </>;
      case 'leech':
        return <>
          <path d="M16 3c5 7 8 11 8 16a8 8 0 01-16 0c0-5 3-9 8-16z" {...common}/>
          <path d="M12 20c1.2 2 2.6 3 4.5 3" {...common}/>
        </>;
      case 'toxinAura':
        return <>
          <circle cx="16" cy="16" r="4" {...common}/>
          <circle cx="16" cy="16" r="10" {...common}/>
          <path d="M16 6l-3-4M9 10L4 8M9 22l-5 2M23 10l5-2M23 22l5 2M16 26l3 4" {...common}/>
        </>;
      case 'chain':
        return <>
          <path d="M10 20l-3 3a5 5 0 107 7l4-4" {...common}/>
          <path d="M22 12l3-3a5 5 0 10-7-7l-4 4" {...common}/>
          <path d="M11 21l10-10" {...common}/>
          <path d="M15 12l-3 7h5l-2 7 7-10h-5l2-4" {...common}/>
        </>;
      case 'shield':
        return <>
          <path d="M16 3l10 4v8c0 7-4 11-10 14-6-3-10-7-10-14V7z" {...common}/>
          <path d="M9 16h14M16 9v14" {...common}/>
        </>;
      case 'adrenaline':
        return <>
          <path d="M6 18h5l2-8 4 14 3-9 2 3h5" {...common}/>
          <path d="M16 3c7 0 12 5 12 12" {...common}/>
        </>;
      case 'bulletLife':
        return <>
          <path d="M8 16h13" {...common}/>
          <path d="M18 11l6 5-6 5" {...common}/>
          <circle cx="8" cy="16" r="4" {...common}/>
          <path d="M6 5h4M8 5v4M5 27h6M8 23v4" {...common}/>
        </>;
      case 'overclock':
        return <>
          <circle cx="16" cy="16" r="11" {...common}/>
          <path d="M16 16l6-5M16 7v2M25 16h2M7 16H5" {...common}/>
          <path d="M13 13l2-5h4l-2 5h3l-6 8 1-5z" {...common}/>
        </>;
      case 'manualLance':
        return <>
          <path d="M5 27L25 7" {...common}/>
          <path d="M19 6l7 7M7 22l3 3M4 28l4-1-3-3z" {...common}/>
          <path d="M14 10l8 8" {...common}/>
        </>;
      case 'targetLightning':
        return <>
          <circle cx="16" cy="16" r="10" {...common}/>
          <path d="M16 2v5M16 25v5M2 16h5M25 16h5" {...common}/>
          <path d="M18 7l-6 9h5l-3 9 8-11h-5z" {...common}/>
        </>;
      case 'synapticField':
        return <>
          <ellipse cx="16" cy="22" rx="12" ry="5" {...common}/>
          <ellipse cx="16" cy="22" rx="7" ry="2.5" {...common}/>
          <path d="M10 17l2-8 4 4 4-7 2 11" {...common}/>
        </>;
      case 'meteor':
        return <>
          <circle cx="20" cy="20" r="6" {...common}/>
          <path d="M5 5l10 10M4 12l8 5M12 4l5 8" {...common}/>
          <path d="M17 18l6 6M20 15l7 7" {...common}/>
        </>;
      case 'ricochet':
        return <>
          <path d="M5 24l8-8 6 4 8-10" {...common}/>
          <path d="M22 10h5v5M5 8l6 3-3 6" {...common}/>
          <circle cx="13" cy="16" r="2" {...common}/>
        </>;
      case 'execute':
        return <>
          <path d="M16 4v24M8 8l8 8 8-8M8 24l8-8 8 8" {...common}/>
          <circle cx="16" cy="16" r="4" {...common}/>
        </>;
      case 'stormLance':
        return <>
          <circle cx="16" cy="16" r="13" {...common}/>
          <path d="M6 26L25 7M19 6l7 7" {...common}/>
          <path d="M19 3l-6 9h5l-3 9 8-11h-5z" {...common}/>
          <path d="M5 16h4M23 16h4" {...common}/>
        </>;
      case 'ionCataclysm':
        return <>
          <ellipse cx="16" cy="23" rx="13" ry="5" {...common}/>
          <path d="M7 6l7 7M12 3l5 8M24 5l-7 8" {...common}/>
          <path d="M17 10l-5 8h5l-3 8 8-11h-5z" {...common}/>
        </>;
      case 'neuralSingularity':
        return <>
          <circle cx="16" cy="16" r="3" {...common}/>
          <path d="M16 5c7 0 11 4 11 9 0 7-7 13-15 11-6-2-9-10-4-15 4-4 11-2 12 3 2 7-7 10-11 5" {...common}/>
          <path d="M3 16h5M24 16h5" {...common}/>
        </>;
    }
  })();

  return (
    <span
      className={`skill-icon ${className ?? ''}`}
      style={style}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        role="presentation"
      >
        {glyph}
      </svg>
    </span>
  );
}
