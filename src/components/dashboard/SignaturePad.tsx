'use client';

import { useRef, useEffect, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { RotateCcw, CheckCircle2 } from 'lucide-react';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  savedSignature?: string;
}

export default function SignaturePad({ onSave, onClear, savedSignature }: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    if (savedSignature && sigCanvas.current && sigCanvas.current.isEmpty()) {
      sigCanvas.current.fromDataURL(savedSignature);
      setIsConfirmed(true);
    }
  }, [savedSignature]);

  const clear = () => {
    sigCanvas.current?.clear();
    setIsConfirmed(false);
    if (onClear) onClear();
    onSave('');
  };

  const handleConfirm = () => {
    if (sigCanvas.current?.isEmpty()) return;
    const dataUrl = sigCanvas.current?.getCanvas().toDataURL('image/png');
    if (dataUrl) {
      onSave(dataUrl);
      setIsConfirmed(true);
    }
  };

  const handleBegin = () => {
    if (isConfirmed) {
      setIsConfirmed(false);
      onSave('');
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative border-2 border-slate-200 rounded-2xl overflow-hidden bg-slate-50 group">
        <SignatureCanvas
          ref={sigCanvas}
          onBegin={handleBegin}
          penColor="#0f172a"
          canvasProps={{
            className: `w-full h-40 cursor-crosshair bg-white ${isConfirmed ? 'opacity-50 pointer-events-none' : ''}`,
          }}
        />
        <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            type="button"
            onClick={clear}
            className="p-4 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 hover:text-red-700 transition-colors"
            title="Clear Signature"
          >
            <RotateCcw size={16} />
          </button>
        </div>
        
        {isConfirmed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
             <div className="bg-white/90 backdrop-blur-[1px] px-4 py-3 rounded-xl flex items-center gap-2 shadow-sm border border-emerald-200">
               <CheckCircle2 size={16} className="text-emerald-700" />
               <span className="text-xs font-black uppercase tracking-widest text-emerald-700">Signature Confirmed</span>
             </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-bold text-slate-400">Draw your signature in the box above</p>
        <button
          type="button"
          disabled={isConfirmed}
          onClick={handleConfirm}
          className="px-3 py-3 bg-blue-600 text-white text-[10px] font-bold tracking-wider uppercase rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:bg-emerald-500 disabled:text-white transition-colors"
        >
          {isConfirmed ? 'Confirmed' : 'Confirm Signature'}
        </button>
      </div>
    </div>
  );
}