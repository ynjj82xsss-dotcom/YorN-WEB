import React, { useRef, useState, useEffect } from 'react';
import { X, Eraser, Brush, Sparkles, RotateCcw, AlertCircle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onSave: (editedImageUrl: string, prompt: string) => void;
}

export function ImageEditorModal({ isOpen, onClose, imageUrl, onSave }: ImageEditorModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [canvasSize, setCanvasSize] = useState({ width: 512, height: 512 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(25);
  const [editorMode, setEditorMode] = useState<'draw' | 'erase'>('draw');
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const lastPos = useRef({ x: 0, y: 0 });
  const hue = useRef(0);

  // Initialize canvas when image or size changes
  useEffect(() => {
    if (isOpen) {
      clearCanvas();
    }
  }, [isOpen, canvasSize]);

  // Adjust canvas size to match rendered image dimensions
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { clientWidth, clientHeight } = e.currentTarget;
    if (clientWidth > 0 && clientHeight > 0) {
      setCanvasSize({ width: clientWidth, height: clientHeight });
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Canvas drawing handlers
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Check if touch event or mouse event
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getMousePos(e);
    lastPos.current = pos;
    
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (editorMode === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.shadowBlur = 0;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      hue.current = (hue.current + 1.5) % 360;
      ctx.strokeStyle = `hsla(${hue.current}, 90%, 60%, 0.75)`;
      ctx.shadowColor = `hsla(${hue.current}, 90%, 60%, 0.6)`;
      ctx.shadowBlur = brushSize * 0.4;
    }
    
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getMousePos(e);
    
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (editorMode === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.shadowBlur = 0;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      // Very small increment for perfectly seamless smooth transitions
      hue.current = (hue.current + 0.8) % 360;
      ctx.strokeStyle = `hsla(${hue.current}, 90%, 60%, 0.75)`;
      ctx.shadowColor = `hsla(${hue.current}, 90%, 60%, 0.6)`;
      ctx.shadowBlur = brushSize * 0.4;
    }

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastPos.current = pos;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const getMaskDataUrl = (): string => {
    const mainCanvas = canvasRef.current;
    if (!mainCanvas) return '';
    
    // Create black-and-white mask
    const offscreen = document.createElement('canvas');
    offscreen.width = mainCanvas.width;
    offscreen.height = mainCanvas.height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return '';

    // Solid black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);

    // Draw lines over it
    ctx.drawImage(mainCanvas, 0, 0);

    const imgData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
    const data = imgData.data;

    // Turn any drawn parts into solid white and rest into solid black
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i+3];
      if (alpha > 15) { // Non-transparent pixel (drawn)
        data[i] = 255;   // R
        data[i+1] = 255; // G
        data[i+2] = 255; // B
        data[i+3] = 255; // Full opaque
      } else {
        data[i] = 0;     // R
        data[i+1] = 0;   // G
        data[i+2] = 0;   // B
        data[i+3] = 255; // Full opaque black background
      }
    }
    
    ctx.putImageData(imgData, 0, 0);
    return offscreen.toDataURL('image/png');
  };

  const handleApplyChanges = async () => {
    if (!prompt.trim()) {
      setErrorText('Пожалуйста, напишите, что именно нужно изменить.');
      return;
    }
    
    setIsProcessing(true);
    setErrorText(null);

    const maskDataUrl = getMaskDataUrl();

    try {
      const response = await fetch('/api/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageUrl,
          mask: maskDataUrl,
          prompt: prompt
        })
      });

      const data = await response.json();

      if (response.ok && data.imageUrl) {
        onSave(data.imageUrl, prompt);
        onClose();
        setPrompt('');
        clearCanvas();
      } else {
        setErrorText(data.error || 'Произошла ошибка при изменении изображения.');
      }
    } catch (err: any) {
      setErrorText('Не удалось связаться с сервером. Попробуйте еще раз.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative max-w-4xl w-full bg-[#0A0A0A] border border-[#262626] rounded-2xl shadow-3xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main workspace */}
          <div className="flex-1 p-6 flex flex-col items-center justify-center relative min-h-[300px] bg-[#050505] border-b md:border-b-0 md:border-r border-[#262626]">
            <button
              onClick={onClose}
              className="absolute top-4 left-4 p-2 text-neutral-400 hover:text-white hover:bg-[#141414] rounded-lg transition-colors z-10"
              title="Закрыть"
            >
              <X size={20} />
            </button>

            <span className="absolute top-4 right-4 text-[10px] uppercase tracking-widest text-neutral-600 font-mono">
              AI IMAGE EDITOR
            </span>

            {/* Drawing core board */}
            <div className="relative border border-[#1F1F1F] rounded-lg overflow-hidden max-w-full max-h-[55vh] flex items-center justify-center bg-[#0d0d0d]">
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Source edit"
                className="max-w-full max-h-[52vh] object-contain select-none"
                referrerPolicy="no-referrer"
                onLoad={handleImageLoad}
              />
              
              <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className="absolute top-0 left-0 w-full h-full cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>

            <div className="mt-4 text-center">
              <p className="text-[11px] text-neutral-500 font-sans">
                {editorMode === 'draw' 
                  ? 'Закрасьте кистью место на фото, которое хотите изменить' 
                  : 'Используйте ластик для удаления выделенной маски'}
              </p>
            </div>
          </div>

          {/* Sidebar controls */}
          <div className="w-full md:w-[320px] bg-[#141414] p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-wide mb-1 font-sans">
                  Инструменты изменения
                </h3>
                <p className="text-xs text-neutral-400 font-sans">
                  Нарисуйте маску над заменяемым участком
                </p>
              </div>

              {/* Draw / Erase Toggle */}
              <div className="flex gap-2">
                <style dangerouslySetInnerHTML={{__html: `
                  @keyframes aura-rainbow-border {
                    0% { border-color: #ff3366; box-shadow: 0 0 10px rgba(255,51,102,0.15); }
                    20% { border-color: #9933ff; box-shadow: 0 0 10px rgba(153,51,255,0.15); }
                    40% { border-color: #33ccff; box-shadow: 0 0 10px rgba(51,204,255,0.15); }
                    60% { border-color: #33ff99; box-shadow: 0 0 10px rgba(51,255,153,0.15); }
                    80% { border-color: #ffcc00; box-shadow: 0 0 10px rgba(255,204,0,0.15); }
                    100% { border-color: #ff3366; box-shadow: 0 0 10px rgba(255,51,102,0.15); }
                  }
                  .aura-rainbow-active {
                    background-color: #0A0A0A !important;
                    animation: aura-rainbow-border 6s linear infinite !important;
                    border-width: 1px !important;
                    color: #FFFFFF !important;
                    box-shadow: 0 0 15px rgba(255,255,255,0.05);
                  }
                `}} />
                <button
                  type="button"
                  onClick={() => setEditorMode('draw')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs rounded-md transition-all font-semibold border ${
                    editorMode === 'draw'
                      ? 'aura-rainbow-active'
                      : 'bg-transparent text-neutral-400 border-[#262626] hover:bg-[#1A1A1A] hover:text-white'
                  }`}
                >
                  <Brush size={14} className={editorMode === 'draw' ? "animate-pulse text-purple-400" : ""} />
                  Кисть
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode('erase')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs rounded-md transition-all font-medium border ${
                    editorMode === 'erase'
                      ? 'bg-neutral-800 text-white border-neutral-700'
                      : 'bg-transparent text-neutral-400 border-[#262626] hover:bg-[#1A1A1A] hover:text-white'
                  }`}
                >
                  <Eraser size={14} />
                  Ластик
                </button>
              </div>

              {/* Brush size slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono text-neutral-400">
                  <span>Размер кисти:</span>
                  <span>{brushSize}px</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-full accent-neutral-200 cursor-pointer h-1.5 bg-[#262626] rounded-lg appearance-none"
                />
              </div>

              {/* Input for the prompt details */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-neutral-300 font-sans">
                  Что изменить на выделенном месте?
                </label>
                <textarea
                  className="w-full h-24 bg-[#0A0A0A] border border-[#262626] focus:border-neutral-500 rounded-lg p-3 text-xs text-white placeholder-neutral-600 focus:outline-none focus:ring-0 transition-colors font-sans resize-none"
                  placeholder="Пример: замени на оранжевого кота, добавь зеленую траву, сделай воду кристально чистой..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isProcessing}
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="p-2 bg-transparent text-neutral-400 hover:text-white hover:bg-[#1A1A1A] rounded-lg transition-colors border border-[#262626]"
                  title="Очистить выделение"
                  disabled={isProcessing}
                >
                  <RotateCcw size={16} />
                </button>
                
                <button
                  type="button"
                  onClick={handleApplyChanges}
                  disabled={isProcessing}
                  className="flex-1 bg-white hover:bg-neutral-200 text-black py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      <span>Изменение...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Применить ИИ</span>
                    </>
                  )}
                </button>
              </div>

              {/* Error logs */}
              {errorText && (
                <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg flex gap-2 items-start text-red-400 text-xs text-left leading-normal animate-shake">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{errorText}</span>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-[#262626] text-center mt-6">
              <span className="text-[10px] text-neutral-600 font-mono">
                POWERED BY HG INPAINTER
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
