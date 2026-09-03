'use client'

import { useEffect, useState } from 'react'
import {
  AlignLeft,
  ChevronRight,
  Layout,
  Move,
  Square,
  Type,
} from 'lucide-react'

type ImageWrapType = 'inline' | 'wrap' | 'break' | 'behind' | 'front'

interface ImageContextMenuProps {
  x: number
  y: number
  onClose: () => void
  onSelect: (type: ImageWrapType) => void
  currentType?: ImageWrapType
}

interface WrappingOption {
  id: ImageWrapType
  label: string
  icon: typeof AlignLeft
}

const wrappingOptions: WrappingOption[] = [
  {
    id: 'inline',
    label: 'In line with text',
    icon: AlignLeft,
  },
  {
    id: 'wrap',
    label: 'Wrap text',
    icon: Layout,
  },
  {
    id: 'break',
    label: 'Break text',
    icon: Square,
  },
  {
    id: 'behind',
    label: 'Behind text',
    icon: Move,
  },
  {
    id: 'front',
    label: 'In front of text',
    icon: Type,
  },
]

export function ImageContextMenu({
  x,
  y,
  onClose,
  onSelect,
  currentType,
}: ImageContextMenuProps): React.JSX.Element {
  const [showSubmenu, setShowSubmenu] = useState(false)

  useEffect(() => {
    const handleWindowClick = (): void => {
      onClose()
    }

    window.addEventListener('click', handleWindowClick)

    return () => {
      window.removeEventListener('click', handleWindowClick)
    }
  }, [onClose])

  const handleSelect = (type: ImageWrapType): void => {
    onSelect(type)
    onClose()
  }

  return (
    <div
      className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-slate-200 py-2 w-56 animate-in fade-in zoom-in duration-150"
      style={{ left: x, top: y }}
      role="menu"
      aria-label="Image context menu"
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className="relative group"
        onMouseEnter={() => setShowSubmenu(true)}
        onMouseLeave={() => setShowSubmenu(false)}
      >
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          aria-haspopup="menu"
          aria-expanded={showSubmenu}
          onClick={() => setShowSubmenu((isOpen) => !isOpen)}
        >
          <span className="flex items-center gap-3">
            <Layout size={14} className="text-slate-400" />
            <span>Text Wrapping</span>
          </span>

          <ChevronRight size={14} className="text-slate-400" />
        </button>

        {showSubmenu && (
          <div
            className="absolute left-full top-0 ml-px bg-white rounded-xl shadow-2xl border border-slate-200 py-2 w-56 animate-in fade-in slide-in-from-left-1 duration-150"
            role="menu"
            aria-label="Text wrapping options"
          >
            {wrappingOptions.map((option) => {
              const Icon = option.icon
              const isActive = currentType === option.id

              return (
                <button
                  key={option.id}
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelect(option.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-bold transition-colors hover:bg-slate-50 ${
                    isActive
                      ? 'text-blue-600 bg-blue-50/50'
                      : 'text-slate-700'
                  }`}
                >
                  <Icon
                    size={14}
                    className={isActive ? 'text-blue-600' : 'text-slate-400'}
                  />
                  <span>{option.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="my-1 border-t border-slate-100" />

      <button
        type="button"
        onClick={onClose}
        className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span className="w-3.5 h-3.5 border border-slate-400 rounded-sm" />
        <span>Size & Rotation</span>
      </button>
    </div>
  )
}

export default ImageContextMenu