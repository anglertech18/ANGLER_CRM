import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: number;
  children: React.ReactNode;
}

const KEYFRAME_STYLE = `
@keyframes drawerSlideIn {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}
@keyframes modalPopIn {
  from { transform: translate(-50%, -48%) scale(0.96); opacity: 0; }
  to   { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}
`;

export function DetailDrawer({ isOpen, onClose, title, subtitle, width = 480, children }: Props) {
  const [isCentered, setIsCentered] = useState(false);
  const [currentWidth, setCurrentWidth] = useState(width);
  const isResizing = useRef(false);

  // Sync width prop when isOpen changes
  useEffect(() => {
    if (isOpen) {
      setCurrentWidth(width);
    } else {
      setIsCentered(false);
    }
  }, [isOpen, width]);

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Resize window mouse listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      // Anchor is right-side, width is viewport width minus mouse X coordinate
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 360 && newWidth <= window.innerWidth * 0.9) {
        setCurrentWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  if (!isOpen) return null;

  const panelStyle: React.CSSProperties = isCentered
    ? {
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: '800px',
        height: 'auto',
        maxHeight: '85vh',
        background: '#ffffff',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        borderRadius: '16px',
        zIndex: 201,
        display: 'flex',
        flexDirection: 'column',
        animation: 'modalPopIn 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      }
    : {
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: currentWidth,
        background: '#ffffff',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.12)',
        zIndex: 201,
        display: 'flex',
        flexDirection: 'column',
        animation: 'drawerSlideIn 250ms ease-out',
      };

  return createPortal(
    <>
      {/* Inject animations style */}
      <style>{KEYFRAME_STYLE}</style>

      {/* Backdrop Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.15)',
          backdropFilter: 'blur(4px)',
          zIndex: 200,
        }}
      />

      {/* Main Panel */}
      <div style={panelStyle}>
        {/* Resize Handle - only visible when not centered/modal mode */}
        {!isCentered && (
          <div
            onMouseDown={handleMouseDown}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '6px',
              cursor: 'ew-resize',
              zIndex: 210,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            className="group"
          >
            <div
              style={{
                width: '2px',
                height: '100%',
                background: 'transparent',
                transition: 'background 0.15s',
              }}
              className="group-hover:bg-indigo-400 group-active:bg-indigo-600"
            />
          </div>
        )}

        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>
              {title}
            </p>
            {subtitle && (
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, margin: 0 }}>
                {subtitle}
              </p>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* Center / Side Toggle Button */}
            <button
              onClick={() => setIsCentered(!isCentered)}
              title={isCentered ? "Dock to Side" : "Expand to Center View"}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                flexShrink: 0,
                marginRight: 8,
                transition: 'all 0.15s',
              }}
              className="hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50"
            >
              {isCentered ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                color: '#64748b',
                flexShrink: 0,
                transition: 'all 0.15s',
              }}
              className="hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
          }}
        >
          {children}
        </div>
      </div>
    </>,
    document.body,
  );
}
