import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

function mockCoarsePointer(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('App interaction flow', () => {
  it('renders a footer link to the GitHub repository', () => {
    mockCoarsePointer(false);
    render(<App />);

    const githubLink = screen.getByRole('link', { name: /view colorfinder on github/i });
    expect(githubLink).toHaveAttribute('href', 'https://github.com/fabianwesterbeek/Colorfinder');
  });

  it('shows guidance for invalid input', async () => {
    mockCoarsePointer(false);
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByLabelText(/hex color/i);
    await user.type(input, 'zzzzzz');

    expect(screen.getByText(/invalid hex format/i)).toBeInTheDocument();
  });

  it('shows 10 closest matches for valid input', async () => {
    mockCoarsePointer(false);
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByLabelText(/hex color/i);
    await user.type(input, '#ff0000');

    const rows = await screen.findAllByRole('listitem');
    expect(rows).toHaveLength(10);
  });

  it('switches color sets and keeps a single active option', async () => {
    mockCoarsePointer(false);
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByLabelText(/hex color/i);
    await user.type(input, '#3366cc');

    const medium = screen.getByRole('radio', { name: /medium · xkcd/i });
    const large = screen.getByRole('radio', { name: /large · meodai\/color-names/i });

    expect(medium).toHaveAttribute('aria-checked', 'true');
    expect(large).toHaveAttribute('aria-checked', 'false');

    await user.click(large);

    expect(large).toHaveAttribute('aria-checked', 'true');
    expect(medium).toHaveAttribute('aria-checked', 'false');
    expect(await screen.findAllByRole('listitem')).toHaveLength(10);
  });

  it('opens and closes custom picker on desktop', async () => {
    mockCoarsePointer(false);
    const user = userEvent.setup();
    render(<App />);

    const swatchTrigger = screen.getByRole('button', { name: /open color picker/i });
    await user.click(swatchTrigger);

    expect(screen.getByRole('dialog', { name: /color picker/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use system picker/i })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /color picker/i })).not.toBeInTheDocument();

    await user.click(swatchTrigger);
    await user.click(document.body);
    expect(screen.queryByRole('dialog', { name: /color picker/i })).not.toBeInTheDocument();
  });

  it('updates results while hue slider changes', async () => {
    mockCoarsePointer(false);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /open color picker/i }));

    const hueSlider = screen.getByLabelText(/hue/i);
    fireEvent.change(hueSlider, { target: { value: '120' } });

    const input = screen.getByLabelText(/hex color/i) as HTMLInputElement;
    expect(input.value).toMatch(/^#[0-9A-F]{6}$/);
    expect(await screen.findAllByRole('listitem')).toHaveLength(10);
  });

  it('keeps hue stable when changing saturation/value only', async () => {
    mockCoarsePointer(false);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /open color picker/i }));
    const hueSlider = screen.getByLabelText(/hue/i) as HTMLInputElement;
    fireEvent.change(hueSlider, { target: { value: '120' } });
    expect(hueSlider.value).toBe('120');

    const saturationValueSurface = screen.getByLabelText(/saturation and brightness/i);
    for (let i = 0; i < 50; i += 1) {
      fireEvent.keyDown(saturationValueSurface, { key: 'ArrowDown' });
    }

    expect((screen.getByLabelText(/hue/i) as HTMLInputElement).value).toBe('120');
  });

  it('debounces closest-match updates while picker changes are happening', async () => {
    vi.useFakeTimers();
    mockCoarsePointer(false);
    render(<App />);

    fireEvent.click(screen.getByRole('radio', { name: /small · css/i }));
    const input = screen.getByLabelText(/hex color/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '#FF0000' } });

    act(() => {
      vi.advanceTimersByTime(3);
    });

    const initialFirstRowText = screen.getAllByRole('listitem')[0]?.textContent;
    expect(initialFirstRowText).toContain('#FF0000');

    fireEvent.click(screen.getByRole('button', { name: /open color picker/i }));
    const hueSlider = screen.getByLabelText(/hue/i);
    fireEvent.change(hueSlider, { target: { value: '120' } });

    expect(input.value).toBe('#00FF00');
    expect(screen.getAllByRole('listitem')[0]?.textContent).toBe(initialFirstRowText);

    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(screen.getAllByRole('listitem')[0]?.textContent).toBe(initialFirstRowText);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getAllByRole('listitem')[0]?.textContent).not.toBe(initialFirstRowText);
  });

  it('uses a 30ms debounce cadence for the large dataset', () => {
    vi.useFakeTimers();
    mockCoarsePointer(false);
    render(<App />);

    fireEvent.click(screen.getByRole('radio', { name: /large · meodai\/color-names/i }));
    const input = screen.getByLabelText(/hex color/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '#FF0000' } });

    act(() => {
      vi.advanceTimersByTime(29);
    });
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
  });

  it('restarts debounce timing when switching datasets mid-flight', () => {
    vi.useFakeTimers();
    mockCoarsePointer(false);
    render(<App />);

    fireEvent.click(screen.getByRole('radio', { name: /small · css/i }));
    const input = screen.getByLabelText(/hex color/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '#FF0000' } });

    act(() => {
      vi.advanceTimersByTime(1);
    });

    fireEvent.click(screen.getByRole('radio', { name: /large · meodai\/color-names/i }));

    act(() => {
      vi.advanceTimersByTime(29);
    });
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
  });

  it('opens custom picker directly on coarse pointers without advanced or system picker options', async () => {
    mockCoarsePointer(true);
    const user = userEvent.setup();
    render(<App />);

    const nativePicker = screen.getByLabelText(/native system color picker/i) as HTMLInputElement & {
      showPicker?: () => void;
    };
    const showPicker = vi.fn();
    nativePicker.showPicker = showPicker;

    await user.click(screen.getByRole('button', { name: /open color picker/i }));

    expect(showPicker).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: /color picker/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /advanced picker/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /use system picker/i })).not.toBeInTheDocument();
  });

  it('syncs native color input changes to normalized hex', () => {
    mockCoarsePointer(true);
    render(<App />);

    const nativePicker = screen.getByLabelText(/native system color picker/i);
    fireEvent.change(nativePicker, { target: { value: '#00ff00' } });

    expect(screen.getByText(/normalized input: #00FF00/i)).toBeInTheDocument();
  });
});
