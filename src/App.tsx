import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { COLOR_SETS, DEFAULT_COLOR_SET } from './data/colorSets';
import { hexToHsv, hsvToHex } from './lib/colorPicker';
import { normalizeHex } from './lib/color';
import { findClosestColors } from './lib/match';
import type { ColorSetId } from './types';

const COLOR_SET_ORDER: ColorSetId[] = ['large', 'medium', 'small'];
const DEFAULT_PICKER_COLOR = '#156B74';
const MATCH_DEBOUNCE_MS_BY_SET: Record<ColorSetId, number> = {
  large: 30,
  medium: 3,
  small: 3
};
const GITHUB_REPO_URL = 'https://github.com/fabianwesterbeek/Colorfinder';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hasCoarsePointer(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  if (typeof window.matchMedia === 'function') {
    return window.matchMedia('(pointer: coarse)').matches;
  }

  return navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
}

export default function App() {
  const [query, setQuery] = useState('');
  const [activeSetId, setActiveSetId] = useState<ColorSetId>(DEFAULT_COLOR_SET);
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState(hasCoarsePointer);
  const [pickerHsv, setPickerHsv] = useState(() => hexToHsv(DEFAULT_PICKER_COLOR) ?? { h: 190, s: 0.8, v: 0.46 });

  const pickerRootRef = useRef<HTMLDivElement | null>(null);
  const saturationValueRef = useRef<HTMLDivElement | null>(null);
  const nativeColorInputRef = useRef<HTMLInputElement | null>(null);

  const normalizedHex = useMemo(() => normalizeHex(query), [query]);
  const [debouncedNormalizedHex, setDebouncedNormalizedHex] = useState<string | null>(normalizedHex);
  const activeSet = COLOR_SETS[activeSetId];
  const matchDebounceMs = MATCH_DEBOUNCE_MS_BY_SET[activeSetId];
  const pickerHex = useMemo(() => hsvToHex(pickerHsv), [pickerHsv]);
  const hueColor = useMemo(() => hsvToHex({ h: pickerHsv.h, s: 1, v: 1 }), [pickerHsv.h]);
  const swatchColor = normalizedHex ?? pickerHex;
  const isMobileSheet = isCoarsePointer && isCustomPickerOpen;

  const matches = useMemo(() => {
    if (!debouncedNormalizedHex) {
      return [];
    }

    return findClosestColors(debouncedNormalizedHex, activeSet.colors, 10);
  }, [debouncedNormalizedHex, activeSet]);

  const isEmpty = query.trim().length === 0;
  const isInvalid = !isEmpty && normalizedHex === null;

  const updateFromHsv = useCallback((updater: (current: typeof pickerHsv) => typeof pickerHsv) => {
    setPickerHsv((current) => {
      const next = updater(current);
      setQuery(hsvToHex(next));
      return next;
    });
  }, []);

  const openNativePicker = useCallback(() => {
    const nativeInput = nativeColorInputRef.current;

    if (!nativeInput) {
      return;
    }

    nativeInput.value = swatchColor;
    const withShowPicker = nativeInput as HTMLInputElement & { showPicker?: () => void };

    if (typeof withShowPicker.showPicker === 'function') {
      withShowPicker.showPicker();
      return;
    }

    nativeInput.click();
  }, [swatchColor]);

  const updateSaturationValue = useCallback(
    (clientX: number, clientY: number) => {
      const surface = saturationValueRef.current;

      if (!surface) {
        return;
      }

      const bounds = surface.getBoundingClientRect();
      const saturation = clamp((clientX - bounds.left) / bounds.width, 0, 1);
      const value = clamp(1 - (clientY - bounds.top) / bounds.height, 0, 1);
      updateFromHsv((current) => ({ ...current, s: saturation, v: value }));
    },
    [updateFromHsv],
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const media = window.matchMedia('(pointer: coarse)');
    const handleChange = () => {
      setIsCoarsePointer(media.matches);
    };

    handleChange();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (!normalizedHex) {
      setDebouncedNormalizedHex(null);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedNormalizedHex(normalizedHex);
    }, matchDebounceMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [matchDebounceMs, normalizedHex]);

  useEffect(() => {
    if (!isCustomPickerOpen) {
      return;
    }

    const handleOutsidePointer = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (pickerRootRef.current?.contains(target)) {
        return;
      }

      setIsCustomPickerOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCustomPickerOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsidePointer);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointer);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isCustomPickerOpen]);

  const handleSwatchClick = () => {
    setIsCustomPickerOpen((open) => !open);
  };

  const handleNativeColorInput = (value: string) => {
    const normalized = normalizeHex(value);

    if (!normalized) {
      return;
    }

    setQuery(normalized);
    const next = hexToHsv(normalized);

    if (next) {
      setPickerHsv(next);
    }
  };

  const handleHexInputChange = (value: string) => {
    setQuery(value);

    const normalized = normalizeHex(value);
    if (!normalized) {
      return;
    }

    const next = hexToHsv(normalized);
    if (next) {
      setPickerHsv(next);
    }
  };

  const saturationPercent = pickerHsv.s * 100;
  const valuePercent = (1 - pickerHsv.v) * 100;

  return (
    <main className="app-shell">
      <section className="tool-intro" aria-label="Colorfinder controls">
        <p className="eyebrow">Delta E (CIEDE2000)</p>
        <h1>Colorfinder</h1>
        <p className="lede">
          Enter a hex color and compare against the three curated libraries. Results are ranked by smallest ΔE00.
        </p>

        <div className="control-block">
          <label htmlFor="hex-input">Hex color</label>
          <div className="picker-root" ref={pickerRootRef}>
            <input
              ref={nativeColorInputRef}
              aria-label="Native system color picker"
              className="native-color-input"
              type="color"
              value={swatchColor}
              tabIndex={-1}
              onInput={(event) => handleNativeColorInput((event.target as HTMLInputElement).value)}
              onChange={(event) => handleNativeColorInput(event.target.value)}
            />
            <div className="input-row">
              <input
                id="hex-input"
                name="hex-input"
                value={query}
                onChange={(event) => handleHexInputChange(event.target.value)}
                placeholder="#1A2B3C"
                autoComplete="off"
                spellCheck={false}
                inputMode="text"
              />
              <button
                type="button"
                className="live-swatch swatch-trigger"
                aria-label="Open color picker"
                title={normalizedHex ?? 'Invalid hex'}
                onClick={handleSwatchClick}
                style={{ background: swatchColor }}
              />
            </div>
            {isCustomPickerOpen && (
              <div className={isMobileSheet ? 'picker-panel mobile' : 'picker-panel'} role="dialog" aria-label="Color picker">
                <div className="picker-panel-head">
                  <p className="picker-title">Color picker</p>
                  <code>{swatchColor}</code>
                  {isMobileSheet && (
                    <button type="button" className="picker-close-button" onClick={() => setIsCustomPickerOpen(false)}>
                      Close
                    </button>
                  )}
                </div>
                <div
                  ref={saturationValueRef}
                  className="saturation-value-surface"
                  tabIndex={0}
                  aria-label="Saturation and brightness"
                  style={{
                    backgroundImage: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`,
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    updateSaturationValue(event.clientX, event.clientY);
                  }}
                  onPointerMove={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      updateSaturationValue(event.clientX, event.clientY);
                    }
                  }}
                  onPointerUp={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      event.currentTarget.releasePointerCapture(event.pointerId);
                    }
                  }}
                  onPointerCancel={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      event.currentTarget.releasePointerCapture(event.pointerId);
                    }
                  }}
                  onKeyDown={(event) => {
                    const step = event.shiftKey ? 0.05 : 0.01;
                    let saturationStep = 0;
                    let valueStep = 0;

                    if (event.key === 'ArrowLeft') {
                      saturationStep = -step;
                    }
                    if (event.key === 'ArrowRight') {
                      saturationStep = step;
                    }
                    if (event.key === 'ArrowUp') {
                      valueStep = step;
                    }
                    if (event.key === 'ArrowDown') {
                      valueStep = -step;
                    }

                    if (saturationStep === 0 && valueStep === 0) {
                      return;
                    }

                    event.preventDefault();
                    updateFromHsv((current) => ({
                      ...current,
                      s: clamp(current.s + saturationStep, 0, 1),
                      v: clamp(current.v + valueStep, 0, 1),
                    }));
                  }}
                >
                  <span className="picker-thumb" style={{ left: `${saturationPercent}%`, top: `${valuePercent}%` }} />
                </div>
                <label className="picker-slider-wrap" htmlFor="hue-slider">
                  <span>Hue</span>
                  <input
                    id="hue-slider"
                    className="hue-slider"
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={Math.round(pickerHsv.h)}
                    onChange={(event) => {
                      const nextHue = Number(event.target.value);
                      updateFromHsv((current) => ({ ...current, h: nextHue }));
                    }}
                  />
                </label>
                {!isCoarsePointer && (
                  <div className="picker-actions">
                    <button
                      type="button"
                      className="system-picker-button"
                      onClick={() => {
                        setIsCustomPickerOpen(false);
                        openNativePicker();
                      }}
                    >
                      Use system picker
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="input-hint">
            {isEmpty && 'Use #RGB, RGB, #RRGGBB, or RRGGBB.'}
            {isInvalid && 'Invalid hex format. Please enter 3 or 6 hexadecimal characters.'}
            {!isEmpty && !isInvalid && `Normalized input: ${normalizedHex}`}
          </p>
        </div>

        <div className="control-block">
          <p className="label-like">Color set</p>
          <div className="set-switcher" role="radiogroup" aria-label="Choose color set">
            {COLOR_SET_ORDER.map((setId) => {
              const set = COLOR_SETS[setId];
              const active = setId === activeSetId;
              return (
                <button
                  key={setId}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={active ? 'set-button active' : 'set-button'}
                  onClick={() => setActiveSetId(setId)}
                >
                  <span>{set.label}</span>
                  <strong>{set.count.toLocaleString()}</strong>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="results-pane" aria-live="polite">
        <header className="results-header">
          <h2>Closest Matches</h2>
          <p>Top 10 for {activeSet.label}</p>
        </header>

        {normalizedHex ? (
          <ol className="result-list">
            {matches.map((match) => (
              <li key={`${match.name}-${match.hex}`} className="result-row">
                <span className="swatch" style={{ backgroundColor: match.hex }} aria-hidden="true" />
                <span className="name">{match.name}</span>
                <span className="hex">{match.hex}</span>
                <span className="delta">ΔE {match.deltaE.toFixed(2)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="empty-state">
            <p>Start by entering a valid hex color to see your 10 closest matches.</p>
          </div>
        )}
      </section>

      <footer className="app-footer">
        <a
          className="github-link"
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="View Colorfinder on GitHub"
        >
          <svg className="github-logo" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M8 0C3.58 0 0 3.67 0 8.2c0 3.63 2.29 6.7 5.47 7.79.4.08.55-.18.55-.4 0-.2-.01-.86-.01-1.56-2.01.38-2.53-.5-2.69-.96-.09-.24-.48-.96-.82-1.15-.28-.16-.68-.56-.01-.57.63-.01 1.08.59 1.23.84.72 1.24 1.87.89 2.33.68.07-.54.28-.89.51-1.09-1.78-.21-3.64-.91-3.64-4.03 0-.89.31-1.62.82-2.2-.08-.21-.36-1.04.08-2.17 0 0 .67-.22 2.2.84a7.35 7.35 0 0 1 4 0c1.53-1.06 2.2-.84 2.2-.84.44 1.13.16 1.96.08 2.17.51.58.82 1.3.82 2.2 0 3.13-1.87 3.82-3.65 4.03.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .22.15.49.55.4A8.22 8.22 0 0 0 16 8.2C16 3.67 12.42 0 8 0Z" />
          </svg>
          <span>View on GitHub</span>
        </a>
      </footer>
    </main>
  );
}
