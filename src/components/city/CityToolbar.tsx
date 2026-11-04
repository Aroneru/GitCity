import { PixelIcon, type IconName } from '@/components/ui/PixelIcon';

interface CityToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onShare: () => void;
  onExport: () => void;
  exporting: boolean;
  /** A short confirmation, e.g. "Link copied". */
  message: string | null;
}

export function CityToolbar({ onZoomIn, onZoomOut, onReset, onShare, onExport, exporting, message }: CityToolbarProps) {
  return (
    <div className="absolute bottom-3 right-3 flex flex-col items-end gap-2">
      <p role="status" className={message ? 'border-2 border-night-600 bg-night-900/95 px-3 py-2 font-dot text-sm text-paper' : 'sr-only'}>
        {message}
      </p>
      <div role="toolbar" aria-label="City controls" className="flex gap-1 border-2 border-night-600 bg-night-900/90 p-1">
        <ToolButton icon="plus" label="Zoom in (+)" onClick={onZoomIn} />
        <ToolButton icon="minus" label="Zoom out (−)" onClick={onZoomOut} />
        <ToolButton icon="fit" label="Reset the view (0)" onClick={onReset} />
        <ToolButton icon="link" label="Share a link to this city" onClick={onShare} />
        <ToolButton icon="download" label={exporting ? 'Saving the PNG…' : 'Save the whole street as a PNG'} onClick={onExport} disabled={exporting} />
      </div>
    </div>
  );
}

function ToolButton({ icon, label, onClick, disabled }: { icon: IconName; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 w-10 items-center justify-center text-paper transition-colors hover:bg-night-700 hover:text-neon-amber focus-visible:outline-2 focus-visible:outline-neon-cyan disabled:opacity-50 motion-reduce:transition-none"
    >
      <PixelIcon name={icon} />
    </button>
  );
}
