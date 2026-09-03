'use client'

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type KeyboardEvent,
} from 'react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eraser,
  File as FileIcon,
  Highlighter,
  Image as ImageIcon,
  Indent,
  Italic,
  Layout,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Move,
  Outdent,
  Plus,
  Printer,
  Quote,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Search,
  Square,
  Table as TableIcon,
  Type,
  Underline,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { ImageContextMenu } from '@/components/dashboard/ImageContextMenu'

interface GoogleDocsEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

type Alignment = 'left' | 'center' | 'right' | 'justify'

type ImageWrapType = 'inline' | 'wrap' | 'break' | 'behind' | 'front'

type ResizeType =
  | 'col'
  | 'row'
  | 'img-resize'
  | 'img-rotate'
  | 'img-move'
  | null

interface ContextMenuState {
  x: number
  y: number
  currentType: ImageWrapType
}

interface ImageRect {
  top: number
  left: number
  width: number
  height: number
  rotation: number
}

interface ResizeState {
  type: ResizeType
  element: HTMLElement | null
  startX: number
  startY: number
  startWidth: number
  startHeight: number
  startLeft: number
  startTop: number
  startRotation: number
  manipulationType?: string
}

interface ImageHandle {
  type: string
  cursor: string
  top?: string | number
  right?: string | number
  bottom?: string | number
  left?: string | number
}

const IMAGE_HANDLES: ImageHandle[] = [
  { type: 'nw', cursor: 'nwse-resize', top: -5, left: -5 },
  { type: 'ne', cursor: 'nesw-resize', top: -5, right: -5 },
  { type: 'sw', cursor: 'nesw-resize', bottom: -5, left: -5 },
  { type: 'se', cursor: 'nwse-resize', bottom: -5, right: -5 },
  { type: 'n', cursor: 'ns-resize', top: -5, left: 'calc(50% - 5px)' },
  { type: 's', cursor: 'ns-resize', bottom: -5, left: 'calc(50% - 5px)' },
  { type: 'w', cursor: 'ew-resize', top: 'calc(50% - 5px)', left: -5 },
  { type: 'e', cursor: 'ew-resize', top: 'calc(50% - 5px)', right: -5 },
]

const TEXT_COLORS = [
  '#1e293b',
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#d97706',
  '#9333ea',
  '#0891b2',
  '#000000',
  '#475569',
  '#ea580c',
]

const HIGHLIGHT_COLORS = [
  '#fef08a',
  '#bbf7d0',
  '#bfdbfe',
  '#fbcfe8',
  '#fed7aa',
  'transparent',
]

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function formatInitialContent(value: string): string {
  if (!value) {
    return '<p><br></p>'
  }

  const isHtmlContent =
    value.includes('<p>') ||
    value.includes('<div>') ||
    value.includes('<br>') ||
    value.includes('<span>') ||
    value.includes('<b>') ||
    value.includes('<i>') ||
    value.includes('<u>') ||
    value.includes('<h1>') ||
    value.includes('<h2>') ||
    value.includes('<h3>') ||
    value.includes('<ul>') ||
    value.includes('<ol>') ||
    value.includes('blockquote')

  if (isHtmlContent) {
    return value
  }

  return value
    .split('\n')
    .map((line) =>
      line.trim() ? `<p>${escapeHtml(line)}</p>` : '<p><br></p>',
    )
    .join('')
}

function sanitizeContent(html: string): string {
  if (!html) {
    return ''
  }

  const parser = new DOMParser()
  const documentContent = parser.parseFromString(html, 'text/html')

  documentContent
    .querySelectorAll(
      '.image-handle, .rotation-handle, .rotation-line, .image-selection-overlay',
    )
    .forEach((element) => element.remove())

  return documentContent.body.innerHTML
}

function getZoomScale(zoom: string): number {
  const parsedZoom = Number.parseInt(zoom, 10)

  if (Number.isNaN(parsedZoom)) {
    return 1
  }

  return parsedZoom / 100
}

export function GoogleDocsEditor({
  value,
  onChange,
  placeholder = 'Type @ to insert, or start writing lesson content...',
}: GoogleDocsEditorProps): React.JSX.Element {
  const [zoom, setZoom] = useState('100%')
  const [textStyle, setTextStyle] = useState('Normal text')
  const [fontFamily, setFontFamily] = useState('Arial')
  const [fontSize, setFontSize] = useState(14)
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [textColor, setTextColor] = useState('#1e293b')
  const [highlightColor, setHighlightColor] = useState('transparent')
  const [alignment, setAlignment] = useState<Alignment>('left')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)

  const [showSearchBar, setShowSearchBar] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [matchCount, setMatchCount] = useState(0)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)

  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')

  const [showInsertMenu, setShowInsertMenu] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [tableGrid, setTableGrid] = useState({ rows: 1, cols: 1 })
  const [isUploading, setIsUploading] = useState(false)

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(
    null,
  )

  const [selectedImage, setSelectedImage] =
    useState<HTMLImageElement | null>(null)

  const [imageRect, setImageRect] = useState<ImageRect | null>(null)

  const editorRef = useRef<HTMLDivElement>(null)
  const savedRangeRef = useRef<Range | null>(null)
  const insertMenuRef = useRef<HTMLDivElement>(null)
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef(-1)
  const isUpdatingRef = useRef(false)
  const onChangeRef = useRef(onChange)

  const resizingRef = useRef<ResizeState>({
    type: null,
    element: null,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    startLeft: 0,
    startTop: 0,
    startRotation: 0,
  })

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const updateImageRect = (): void => {
    const editor = editorRef.current

    if (!selectedImage || !editor) {
      setImageRect(null)
      return
    }

    const rect = selectedImage.getBoundingClientRect()
    const editorRect = editor.getBoundingClientRect()
    const transform = selectedImage.style.transform
    const rotateMatch = transform.match(/rotate\(([^deg]+)deg\)/)
    const rotation = rotateMatch ? Number.parseFloat(rotateMatch[1]) : 0

    setImageRect({
      top: rect.top - editorRect.top + editor.scrollTop,
      left: rect.left - editorRect.left + editor.scrollLeft,
      width: rect.width,
      height: rect.height,
      rotation,
    })
  }

  useEffect(() => {
    const editor = editorRef.current

    if (!editor) {
      return
    }

    const handleMouseDown = (event: MouseEvent): void => {
      const target = event.target as HTMLElement

      if (target.tagName === 'IMG') {
        const image = target as HTMLImageElement
        setSelectedImage(image)

        if (image.style.position === 'absolute') {
          const imageBounds = image.getBoundingClientRect()
          const editorBounds = editor.getBoundingClientRect()

          resizingRef.current = {
            ...resizingRef.current,
            type: 'img-move',
            element: image,
            startX: event.clientX,
            startY: event.clientY,
            startLeft:
              imageBounds.left - editorBounds.left + editor.scrollLeft,
            startTop: imageBounds.top - editorBounds.top + editor.scrollTop,
          }
        }

        event.preventDefault()
        return
      }

      const imageHandle = target.closest(
        '.image-handle, .rotation-handle',
      ) as HTMLElement | null

      if (imageHandle && selectedImage) {
        const handleType = imageHandle.dataset.type || ''
        const imageBounds = selectedImage.getBoundingClientRect()
        const transform = selectedImage.style.transform
        const rotateMatch = transform.match(/rotate\(([^deg]+)deg\)/)
        const rotation = rotateMatch ? Number.parseFloat(rotateMatch[1]) : 0

        resizingRef.current = {
          type: handleType === 'rotate' ? 'img-rotate' : 'img-resize',
          element: selectedImage,
          startX: event.clientX,
          startY: event.clientY,
          startWidth: imageBounds.width,
          startHeight: imageBounds.height,
          startLeft: Number.parseFloat(selectedImage.style.left || '0'),
          startTop: Number.parseFloat(selectedImage.style.top || '0'),
          startRotation: rotation,
          manipulationType: handleType,
        }

        event.preventDefault()
        event.stopPropagation()
        return
      }

      if (selectedImage && target !== selectedImage) {
        setSelectedImage(null)
      }

      const tableCell = target.closest('td') as HTMLTableCellElement | null

      if (!tableCell) {
        return
      }

      const cellBounds = tableCell.getBoundingClientRect()
      const edgeThreshold = 8

      if (Math.abs(event.clientX - cellBounds.right) < edgeThreshold) {
        resizingRef.current = {
          type: 'col',
          element: tableCell,
          startX: event.clientX,
          startY: event.clientY,
          startWidth: cellBounds.width,
          startHeight: cellBounds.height,
          startLeft: 0,
          startTop: 0,
          startRotation: 0,
        }

        document.body.classList.add('resizing-col')
        event.preventDefault()
        return
      }

      if (Math.abs(event.clientY - cellBounds.bottom) < edgeThreshold) {
        resizingRef.current = {
          type: 'row',
          element: tableCell,
          startX: event.clientX,
          startY: event.clientY,
          startWidth: cellBounds.width,
          startHeight: cellBounds.height,
          startLeft: 0,
          startTop: 0,
          startRotation: 0,
        }

        document.body.classList.add('resizing-row')
        event.preventDefault()
      }
    }

    const handleMouseMove = (event: MouseEvent): void => {
      const { type, element, startX, startY, startWidth, startHeight } =
        resizingRef.current

      if (!type || !element) {
        const target = event.target as HTMLElement
        const tableCell = target.closest('td') as HTMLTableCellElement | null

        if (!tableCell) {
          return
        }

        const cellBounds = tableCell.getBoundingClientRect()
        const edgeThreshold = 8

        if (Math.abs(event.clientX - cellBounds.right) < edgeThreshold) {
          tableCell.style.cursor = 'col-resize'
        } else if (
          Math.abs(event.clientY - cellBounds.bottom) < edgeThreshold
        ) {
          tableCell.style.cursor = 'row-resize'
        } else {
          tableCell.style.cursor = 'text'
        }

        return
      }

      const deltaX = event.clientX - startX
      const deltaY = event.clientY - startY

      if (type === 'col') {
        element.style.width = `${Math.max(40, startWidth + deltaX)}px`
        return
      }

      if (type === 'row') {
        element.style.height = `${Math.max(30, startHeight + deltaY)}px`
        return
      }

      if (type === 'img-move') {
        const image = element as HTMLImageElement

        image.style.left = `${resizingRef.current.startLeft + deltaX}px`
        image.style.top = `${resizingRef.current.startTop + deltaY}px`
        updateImageRect()
        return
      }

      if (type === 'img-resize' && selectedImage) {
        const manipulationType = resizingRef.current.manipulationType || 'se'
        let width = startWidth
        let height = startHeight
        let left = resizingRef.current.startLeft
        let top = resizingRef.current.startTop

        if (manipulationType.includes('e')) {
          width = Math.max(20, startWidth + deltaX)
        }

        if (manipulationType.includes('w')) {
          const resizedWidth = Math.max(20, startWidth - deltaX)
          left += startWidth - resizedWidth
          width = resizedWidth
        }

        if (manipulationType.includes('s')) {
          height = Math.max(20, startHeight + deltaY)
        }

        if (manipulationType.includes('n')) {
          const resizedHeight = Math.max(20, startHeight - deltaY)
          top += startHeight - resizedHeight
          height = resizedHeight
        }

        selectedImage.style.width = `${width}px`
        selectedImage.style.height = `${height}px`

        if (selectedImage.style.position === 'absolute') {
          selectedImage.style.left = `${left}px`
          selectedImage.style.top = `${top}px`
        }

        updateImageRect()
        return
      }

      if (type === 'img-rotate' && selectedImage) {
        const imageBounds = selectedImage.getBoundingClientRect()
        const centerX = imageBounds.left + imageBounds.width / 2
        const centerY = imageBounds.top + imageBounds.height / 2
        const angle =
          Math.atan2(event.clientY - centerY, event.clientX - centerX) *
          (180 / Math.PI)

        selectedImage.style.transform = `rotate(${angle + 90}deg)`
        updateImageRect()
      }
    }

    const handleMouseUp = (): void => {
      if (!resizingRef.current.type) {
        return
      }

      document.body.classList.remove('resizing-col', 'resizing-row')

      resizingRef.current = {
        type: null,
        element: null,
        startX: 0,
        startY: 0,
        startWidth: 0,
        startHeight: 0,
        startLeft: 0,
        startTop: 0,
        startRotation: 0,
      }

      if (editorRef.current) {
        onChangeRef.current(sanitizeContent(editorRef.current.innerHTML))
      }
    }

    const handleScroll = (): void => {
      updateImageRect()
    }

    document.addEventListener('mousedown', handleMouseDown)
    editor.addEventListener('scroll', handleScroll)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    updateImageRect()

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      editor.removeEventListener('scroll', handleScroll)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [selectedImage])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        insertMenuRef.current &&
        !insertMenuRef.current.contains(event.target as Node)
      ) {
        setShowInsertMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const editor = editorRef.current

    if (!editor || isUpdatingRef.current) {
      return
    }

    const formattedContent = formatInitialContent(value)

    if (editor.innerHTML !== formattedContent) {
      editor.innerHTML = formattedContent
    }

    if (historyRef.current.length === 0) {
      historyRef.current = [formattedContent]
      historyIndexRef.current = 0
    }
  }, [value])

  const clearSearchHighlights = (): void => {
    const editor = editorRef.current

    if (!editor) {
      return
    }

    editor
      .querySelectorAll('mark.doc-search-highlight')
      .forEach((highlight) => {
        const parent = highlight.parentNode

        if (!parent) {
          return
        }

        parent.replaceChild(
          document.createTextNode(highlight.textContent || ''),
          highlight,
        )

        parent.normalize()
      })
  }

  const focusMatchIndex = (targetIndex: number): void => {
    const editor = editorRef.current

    if (!editor) {
      return
    }

    const highlights = Array.from(
      editor.querySelectorAll('mark.doc-search-highlight'),
    ) as HTMLElement[]

    highlights.forEach((highlight, index) => {
      if (index === targetIndex) {
        highlight.className =
          'doc-search-highlight bg-amber-400 text-slate-900 font-bold rounded-xs px-1 border border-amber-500 ring-2 ring-amber-300 cursor-pointer shadow-xs transition-all'
        highlight.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      } else {
        highlight.className =
          'doc-search-highlight bg-yellow-300 text-slate-900 rounded-xs px-0.5 border border-yellow-400 cursor-pointer font-medium transition-all hover:bg-yellow-400'
      }
    })
  }

  const performSearch = (queryText: string, targetIndex = 0): void => {
    clearSearchHighlights()

    const editor = editorRef.current

    if (!queryText.trim() || !editor) {
      setMatchCount(0)
      setCurrentMatchIndex(0)
      return
    }

    const normalizedQuery = queryText.trim().toLowerCase()

    const treeWalker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT,
    )

    const textNodes: Text[] = []
    let currentNode = treeWalker.nextNode()

    while (currentNode) {
      textNodes.push(currentNode as Text)
      currentNode = treeWalker.nextNode()
    }

    let count = 0

    textNodes.forEach((textNode) => {
      const originalText = textNode.nodeValue || ''
      const normalizedText = originalText.toLowerCase()
      let matchIndex = normalizedText.indexOf(normalizedQuery)

      if (matchIndex === -1) {
        return
      }

      const parent = textNode.parentNode

      if (!parent || (parent as HTMLElement).tagName === 'MARK') {
        return
      }

      const fragment = document.createDocumentFragment()
      let lastIndex = 0

      while (matchIndex !== -1) {
        if (matchIndex > lastIndex) {
          fragment.appendChild(
            document.createTextNode(
              originalText.substring(lastIndex, matchIndex),
            ),
          )
        }

        const highlight = document.createElement('mark')
        highlight.className =
          'doc-search-highlight bg-yellow-300 text-slate-900 rounded-xs px-0.5 border border-yellow-400 cursor-pointer font-medium transition-all hover:bg-yellow-400'
        highlight.setAttribute('data-match-idx', String(count))
        highlight.textContent = originalText.substring(
          matchIndex,
          matchIndex + normalizedQuery.length,
        )

        fragment.appendChild(highlight)
        count += 1
        lastIndex = matchIndex + normalizedQuery.length
        matchIndex = normalizedText.indexOf(normalizedQuery, lastIndex)
      }

      if (lastIndex < originalText.length) {
        fragment.appendChild(
          document.createTextNode(originalText.substring(lastIndex)),
        )
      }

      parent.replaceChild(fragment, textNode)
    })

    setMatchCount(count)

    if (count > 0) {
      const validIndex = (targetIndex + count) % count
      setCurrentMatchIndex(validIndex)
      focusMatchIndex(validIndex)
    } else {
      setCurrentMatchIndex(0)
    }
  }

  useEffect(() => {
    if (showSearchBar) {
      performSearch(searchQuery)
      return
    }

    clearSearchHighlights()
  }, [searchQuery, showSearchBar])

  const handleNextMatch = (): void => {
    if (matchCount <= 0) {
      return
    }

    const nextIndex = (currentMatchIndex + 1) % matchCount
    setCurrentMatchIndex(nextIndex)
    focusMatchIndex(nextIndex)
  }

  const handlePreviousMatch = (): void => {
    if (matchCount <= 0) {
      return
    }

    const previousIndex = (currentMatchIndex - 1 + matchCount) % matchCount
    setCurrentMatchIndex(previousIndex)
    focusMatchIndex(previousIndex)
  }

  const handleCloseSearch = (): void => {
    setShowSearchBar(false)
    setSearchQuery('')
    clearSearchHighlights()
  }

  const pushHistory = (content: string): void => {
    if (
      historyIndexRef.current >= 0 &&
      historyRef.current[historyIndexRef.current] === content
    ) {
      return
    }

    const updatedHistory = historyRef.current.slice(
      0,
      historyIndexRef.current + 1,
    )

    updatedHistory.push(content)

    if (updatedHistory.length > 50) {
      updatedHistory.shift()
    }

    historyRef.current = updatedHistory
    historyIndexRef.current = updatedHistory.length - 1
  }

  const updateSelectionState = (): void => {
    try {
      setIsBold(document.queryCommandState('bold'))
      setIsItalic(document.queryCommandState('italic'))
      setIsUnderline(document.queryCommandState('underline'))
    } catch {
      return
    }
  }

  const handleInput = (): void => {
    const editor = editorRef.current

    if (editor) {
      isUpdatingRef.current = true

      const content = sanitizeContent(editor.innerHTML)

      onChange(content)
      pushHistory(content)

      window.setTimeout(() => {
        isUpdatingRef.current = false
      }, 0)
    }

    updateSelectionState()
  }

  const handleUndo = (): void => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1

      const previousContent = historyRef.current[historyIndexRef.current]
      const editor = editorRef.current

      if (editor && previousContent !== undefined) {
        isUpdatingRef.current = true
        editor.innerHTML = previousContent
        onChange(previousContent)

        window.setTimeout(() => {
          isUpdatingRef.current = false
        }, 0)
      }

      return
    }

    document.execCommand('undo')
  }

  const handleRedo = (): void => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1

      const nextContent = historyRef.current[historyIndexRef.current]
      const editor = editorRef.current

      if (editor && nextContent !== undefined) {
        isUpdatingRef.current = true
        editor.innerHTML = nextContent
        onChange(nextContent)

        window.setTimeout(() => {
          isUpdatingRef.current = false
        }, 0)
      }

      return
    }

    document.execCommand('redo')
  }

  const handlePrint = (): void => {
    const editor = editorRef.current

    if (!editor) {
      return
    }

    const printWindow = window.open('', '_blank', 'width=800,height=900')

    if (!printWindow) {
      toast.error('Unable to open the print window.')
      return
    }

    const documentContent = sanitizeContent(editor.innerHTML)

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Document</title>
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }

            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #1e293b;
              line-height: 1.6;
              padding: 20px;
            }

            h1, h2, h3 {
              color: #0f172a;
            }

            blockquote {
              border-left: 4px solid #3b82f6;
              padding-left: 12px;
              color: #475569;
              font-style: italic;
              margin: 12px 0;
            }

            ul {
              list-style-type: disc;
              margin-left: 24px;
            }

            ol {
              list-style-type: decimal;
              margin-left: 24px;
            }

            a {
              color: #2563eb;
              text-decoration: underline;
            }

            img {
              max-width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body>
          <div>${documentContent}</div>
          <script>
            window.onload = function () {
              window.print()
              window.close()
            }
          </script>
        </body>
      </html>
    `)

    printWindow.document.close()
  }

  const executeCommand = (
    command: string,
    value?: string,
  ): void => {
    editorRef.current?.focus()

    document.execCommand('styleWithCSS', false, 'true')
    document.execCommand(command, false, value)

    handleInput()
  }

  const handleBulletedList = (): void => {
    editorRef.current?.focus()
    document.execCommand('styleWithCSS', false, 'false')
    document.execCommand('insertUnorderedList', false)
    handleInput()
  }

  const handleNumberedList = (): void => {
    editorRef.current?.focus()
    document.execCommand('styleWithCSS', false, 'false')
    document.execCommand('insertOrderedList', false)
    handleInput()
  }

  const handleBlockquote = (): void => {
    editorRef.current?.focus()

    const selection = window.getSelection()
    let insideBlockquote = false

    if (selection?.anchorNode) {
      let parent: Node | null = selection.anchorNode

      while (parent && parent !== editorRef.current) {
        if (parent.nodeName === 'BLOCKQUOTE') {
          insideBlockquote = true
          break
        }

        parent = parent.parentNode
      }
    }

    document.execCommand(
      'formatBlock',
      false,
      insideBlockquote ? '<p>' : '<blockquote>',
    )

    handleInput()
  }

  const handleOpenLinkModal = (): void => {
    editorRef.current?.focus()

    const selection = window.getSelection()
    let selectedText = ''
    let selectedUrl = ''

    if (selection && selection.rangeCount > 0) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange()
      selectedText = selection.toString()

      let parent: Node | null = selection.anchorNode?.parentNode ?? null

      while (parent && parent !== editorRef.current) {
        if (parent.nodeName === 'A') {
          const anchor = parent as HTMLAnchorElement
          selectedUrl = anchor.getAttribute('href') || ''
          selectedText ||= anchor.textContent || ''
          break
        }

        parent = parent.parentNode
      }
    }

    setLinkText(selectedText)
    setLinkUrl(selectedUrl)
    setShowLinkModal(true)
  }

  const restoreSavedRange = (): void => {
    const selection = window.getSelection()

    if (!selection || !savedRangeRef.current) {
      return
    }

    selection.removeAllRanges()
    selection.addRange(savedRangeRef.current)
  }

  const handleApplyLink = (event?: FormEvent<HTMLFormElement>): void => {
    event?.preventDefault()

    setShowLinkModal(false)

    const editor = editorRef.current

    if (!editor) {
      return
    }

    editor.focus()
    restoreSavedRange()

    const rawUrl = linkUrl.trim()

    if (!rawUrl || rawUrl === 'https://' || rawUrl === 'http://') {
      return
    }

    const finalUrl =
      rawUrl.startsWith('http://') ||
      rawUrl.startsWith('https://') ||
      rawUrl.startsWith('mailto:')
        ? rawUrl
        : `https://${rawUrl}`

    const displayText = linkText.trim() || finalUrl

    const linkHtml = `<a href="${escapeHtml(
      finalUrl,
    )}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">${escapeHtml(
      displayText,
    )}</a>&nbsp;`

    document.execCommand('styleWithCSS', false, 'false')
    document.execCommand('insertHTML', false, linkHtml)

    handleInput()
    setLinkUrl('')
    setLinkText('')
    savedRangeRef.current = null
  }

  const handleInsertImage = (url: string): void => {
    if (!url.trim()) {
      toast.error('Please provide an image URL.')
      return
    }

    editorRef.current?.focus()
    restoreSavedRange()

    const imageHtml = `<img src="${escapeHtml(
      url.trim(),
    )}" alt="Inserted image" style="max-width: 100%; height: auto; border-radius: 12px; margin: 12px 0; display: block;" />`

    executeCommand('insertHTML', imageHtml)

    setShowImageModal(false)
    setImageUrl('')
    savedRangeRef.current = null
  }

  const handleImageUpload = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image is too large. The maximum allowed size is 2 MB.')
      return
    }

    setIsUploading(true)

    const reader = new FileReader()

    reader.onload = async (): Promise<void> => {
      const result = reader.result

      if (typeof result !== 'string') {
        setIsUploading(false)
        toast.error('Unable to process this image.')
        return
      }

      const base64Content = result.split(',')[1]

      try {
        const response = await fetch('/api/upload-document', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileData: base64Content,
            fileName: file.name,
            mimeType: file.type,
          }),
        })

        if (!response.ok) {
          throw new Error('Image upload failed.')
        }

        const responseData = (await response.json()) as {
          fileUrl?: string
        }

        if (!responseData.fileUrl) {
          throw new Error('The upload response did not include a file URL.')
        }

        handleInsertImage(responseData.fileUrl)
        toast.success('Image uploaded successfully.')
      } catch (error) {
        console.error('Image upload error:', error)
        toast.error('Failed to upload the image.')
      } finally {
        setIsUploading(false)
      }
    }

    reader.onerror = (): void => {
      setIsUploading(false)
      toast.error('Unable to read the selected image.')
    }

    reader.readAsDataURL(file)
  }

  const handleFileUpload = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File is too large. The maximum allowed size is 10 MB.')
      return
    }

    setIsUploading(true)

    const reader = new FileReader()

    reader.onload = async (): Promise<void> => {
      const result = reader.result

      if (typeof result !== 'string') {
        setIsUploading(false)
        toast.error('Unable to process this file.')
        return
      }

      const base64Content = result.split(',')[1]

      try {
        const response = await fetch('/api/upload-document', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileData: base64Content,
            fileName: file.name,
            mimeType: file.type,
          }),
        })

        if (!response.ok) {
          throw new Error('File upload failed.')
        }

        const responseData = (await response.json()) as {
          fileUrl?: string
        }

        if (!responseData.fileUrl) {
          throw new Error('The upload response did not include a file URL.')
        }

        const fileHtml = `
          <a
            href="${escapeHtml(responseData.fileUrl)}"
            target="_blank"
            rel="noopener noreferrer"
            class="file-attachment-link"
            style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; text-decoration: none; color: #1e293b; font-weight: 600; margin: 8px 0; font-size: 13px;"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span>${escapeHtml(file.name)}</span>
          </a>&nbsp;
        `

        executeCommand('insertHTML', fileHtml)
        toast.success('File uploaded and linked successfully.')
      } catch (error) {
        console.error('File upload error:', error)
        toast.error('Failed to upload the file.')
      } finally {
        setIsUploading(false)
      }
    }

    reader.onerror = (): void => {
      setIsUploading(false)
      toast.error('Unable to read the selected file.')
    }

    reader.readAsDataURL(file)
  }

  const handleInsertTable = (rows: number, columns: number): void => {
    editorRef.current?.focus()

    let tableHtml =
      '<table style="width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #cbd5e1; margin: 16px 0; border-radius: 8px; overflow: hidden; table-layout: fixed;"><tbody>'

    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      tableHtml += '<tr>'

      for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
        tableHtml +=
          '<td style="border: 1px solid #cbd5e1; padding: 12px; min-height: 40px; vertical-align: top;"><br></td>'
      }

      tableHtml += '</tr>'
    }

    tableHtml += '</tbody></table><p><br></p>'

    executeCommand('insertHTML', tableHtml)
    setShowInsertMenu(false)
  }

  const applySpanStyleToSelection = (
    styleProperty: keyof CSSStyleDeclaration,
    styleValue: string,
  ): void => {
    editorRef.current?.focus()

    const selection = window.getSelection()

    if (!selection || selection.rangeCount === 0) {
      return
    }

    const range = selection.getRangeAt(0)

    if (range.collapsed) {
      const span = document.createElement('span')
      span.style[styleProperty] = styleValue
      span.innerHTML = '&#8203;'
      range.insertNode(span)

      const newRange = document.createRange()
      newRange.setStart(span, 1)
      newRange.collapse(true)

      selection.removeAllRanges()
      selection.addRange(newRange)

      handleInput()
      return
    }

    const span = document.createElement('span')
    span.style[styleProperty] = styleValue

    try {
      const fragment = range.extractContents()
      span.appendChild(fragment)
      range.insertNode(span)

      const newRange = document.createRange()
      newRange.selectNodeContents(span)

      selection.removeAllRanges()
      selection.addRange(newRange)
    } catch {
      executeCommand(
        styleProperty === 'color' ? 'foreColor' : 'hiliteColor',
        styleValue,
      )
    }

    handleInput()
  }

  const handleTextColor = (color: string): void => {
    setTextColor(color)
    applySpanStyleToSelection('color', color)
    setShowColorPicker(false)
  }

  const handleHighlightColor = (color: string): void => {
    setHighlightColor(color)

    applySpanStyleToSelection(
      'backgroundColor',
      color === 'transparent' ? 'inherit' : color,
    )

    setShowHighlightPicker(false)
  }

  const handleFontSizeChange = (size: number): void => {
    const validSize = Math.max(8, Math.min(72, size))

    setFontSize(validSize)
    applySpanStyleToSelection('fontSize', `${validSize}px`)
  }

  const handleFontFamilyChange = (font: string): void => {
    setFontFamily(font)
    applySpanStyleToSelection('fontFamily', font)
  }

  const handleStyleChange = (style: string): void => {
    setTextStyle(style)

    if (style === 'Title' || style === 'Heading 1') {
      executeCommand('formatBlock', '<h1>')
      return
    }

    if (style === 'Subtitle' || style === 'Heading 2') {
      executeCommand('formatBlock', '<h2>')
      return
    }

    if (style === 'Heading 3') {
      executeCommand('formatBlock', '<h3>')
      return
    }

    executeCommand('formatBlock', '<p>')
  }

  const handleAlign = (mode: Alignment): void => {
    setAlignment(mode)

    const commandByAlignment: Record<Alignment, string> = {
      left: 'justifyLeft',
      center: 'justifyCenter',
      right: 'justifyRight',
      justify: 'justifyFull',
    }

    executeCommand(commandByAlignment[mode])
  }

  const handleBold = (): void => {
    executeCommand('bold')
    setIsBold((currentValue) => !currentValue)
  }

  const handleItalic = (): void => {
    executeCommand('italic')
    setIsItalic((currentValue) => !currentValue)
  }

  const handleUnderline = (): void => {
    executeCommand('underline')
    setIsUnderline((currentValue) => !currentValue)
  }

  const handleKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
  ): void => {
    const isMac = navigator.platform.toUpperCase().includes('MAC')
    const modifierPressed = isMac ? event.metaKey : event.ctrlKey

    if (modifierPressed) {
      const key = event.key.toLowerCase()

      if (key === 'z') {
        event.preventDefault()

        if (event.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }

        return
      }

      if (key === 'y') {
        event.preventDefault()
        handleRedo()
        return
      }

      if (key === 'b') {
        event.preventDefault()
        handleBold()
        return
      }

      if (key === 'i') {
        event.preventDefault()
        handleItalic()
        return
      }

      if (key === 'u') {
        event.preventDefault()
        handleUnderline()
        return
      }

      if (key === 'p') {
        event.preventDefault()
        handlePrint()
        return
      }

      if (key === 'f') {
        event.preventDefault()
        setShowSearchBar(true)
        return
      }

      if (key === 'k') {
        event.preventDefault()
        handleOpenLinkModal()
        return
      }

      if (key === 'e') {
        event.preventDefault()
        handleAlign('center')
        return
      }

      if (key === 'l') {
        event.preventDefault()
        handleAlign('left')
        return
      }

      if (key === 'r') {
        event.preventDefault()
        handleAlign('right')
        return
      }

      if (key === 'j') {
        event.preventDefault()
        handleAlign('justify')
        return
      }
    }

    if (event.key === 'Tab') {
      event.preventDefault()
      executeCommand(event.shiftKey ? 'outdent' : 'indent')
    }
  }

  const getCurrentImageWrapping = (
    image: HTMLImageElement | null,
  ): ImageWrapType => {
    if (!image) {
      return 'inline'
    }

    const imageStyle = image.style

    if (imageStyle.position === 'absolute') {
      return imageStyle.zIndex === '-1' ? 'behind' : 'front'
    }

    if (imageStyle.float === 'left' || imageStyle.float === 'right') {
      return 'wrap'
    }

    if (imageStyle.display === 'block') {
      return 'break'
    }

    return 'inline'
  }

  const handleApplyWrapping = (type: ImageWrapType): void => {
    if (!selectedImage) {
      return
    }

    selectedImage.style.position = 'static'
    selectedImage.style.display = 'inline-block'
    selectedImage.style.float = 'none'
    selectedImage.style.clear = 'none'
    selectedImage.style.zIndex = 'auto'
    selectedImage.style.pointerEvents = 'auto'
    selectedImage.style.margin = '12px 0'
    selectedImage.style.opacity = '1'

    if (type === 'inline') {
      selectedImage.style.display = 'inline-block'
      selectedImage.style.verticalAlign = 'middle'
    }

    if (type === 'wrap') {
      selectedImage.style.float = 'left'
      selectedImage.style.margin = '12px 20px 12px 0'
    }

    if (type === 'break') {
      selectedImage.style.display = 'block'
      selectedImage.style.clear = 'both'
      selectedImage.style.margin = '20px auto'
    }

    if (type === 'behind') {
      selectedImage.style.position = 'absolute'
      selectedImage.style.zIndex = '-1'
      selectedImage.style.opacity = '0.8'
    }

    if (type === 'front') {
      selectedImage.style.position = 'absolute'
      selectedImage.style.zIndex = '50'
    }

    handleInput()
    setContextMenu(null)
    updateImageRect()
  }

  const handleContextMenu = (
    event: ReactMouseEvent<HTMLDivElement>,
  ): void => {
    const target = event.target as HTMLElement

    if (target.tagName !== 'IMG') {
      setContextMenu(null)
      return
    }

    event.preventDefault()

    const image = target as HTMLImageElement
    setSelectedImage(image)

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      currentType: getCurrentImageWrapping(image),
    })
  }

  const handleEditorClick = (
    event: ReactMouseEvent<HTMLDivElement>,
  ): void => {
    const target = event.target as HTMLElement

    if (
      target.tagName === 'MARK' &&
      target.classList.contains('doc-search-highlight')
    ) {
      const matchIndex = target.getAttribute('data-match-idx')

      if (matchIndex !== null) {
        const parsedIndex = Number.parseInt(matchIndex, 10)
        setCurrentMatchIndex(parsedIndex)
        focusMatchIndex(parsedIndex)
      }
    }
  }

  const rawText = editorRef.current
    ? editorRef.current.innerText || ''
    : value.replace(/<[^>]*>/g, '')

  const wordCount = rawText.trim()
    ? rawText.trim().split(/\s+/).length
    : 0

  const characterCount = rawText.length
  const readingTime = Math.max(1, Math.ceil(wordCount / 200))
  const zoomScale = getZoomScale(zoom)

  return (
    <section className="border border-slate-200 rounded-2xl overflow-hidden bg-[#F8F9FA] shadow-xs space-y-0 relative">
      {showSearchBar && (
        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between gap-3 text-xs border-b border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 flex-1 max-w-lg">
            <Search size={15} className="text-amber-400 shrink-0" />

            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  if (event.shiftKey) {
                    handlePreviousMatch()
                  } else {
                    handleNextMatch()
                  }
                }

                if (event.key === 'Escape') {
                  handleCloseSearch()
                }
              }}
              placeholder="Search word in document..."
              className="w-full bg-slate-800 text-white px-3 py-1.5 rounded-lg outline-none text-xs focus:ring-1 focus:ring-amber-400 placeholder:text-slate-400"
              autoFocus
            />

            {searchQuery.trim() && (
              <div className="flex items-center gap-2 shrink-0 text-[11px] font-medium text-slate-300">
                {matchCount > 0 ? (
                  <span className="text-amber-300 font-semibold">
                    {currentMatchIndex + 1} of {matchCount} matches
                  </span>
                ) : (
                  <span className="text-rose-400">0 matches found</span>
                )}

                {matchCount > 0 && (
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={handlePreviousMatch}
                      aria-label="Previous search match"
                      className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={handleNextMatch}
                      aria-label="Next search match"
                      className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleCloseSearch}
            aria-label="Close document search"
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {showLinkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="insert-link-title"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-slate-800 font-semibold text-sm">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <LinkIcon size={16} />
                </div>

                <div>
                  <h2
                    id="insert-link-title"
                    className="text-sm font-bold text-slate-900 leading-tight"
                  >
                    Insert Hyperlink
                  </h2>
                  <p className="text-[11px] font-normal text-slate-500">
                    Add or edit a link in your document
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                aria-label="Close link dialog"
                className="p-1.5 hover:bg-slate-200/80 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleApplyLink} className="p-5 space-y-4">
              <div>
                <label
                  htmlFor="link-display-text"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Text to display
                </label>

                <input
                  id="link-display-text"
                  type="text"
                  value={linkText}
                  onChange={(event) => setLinkText(event.target.value)}
                  placeholder="Visible link text"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 placeholder:text-slate-400"
                  autoFocus
                />

                <p className="text-[11px] text-slate-500 mt-1">
                  The visible text users will click in the document.
                </p>
              </div>

              <div>
                <label
                  htmlFor="link-url"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Link URL
                </label>

                <input
                  id="link-url"
                  type="text"
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  placeholder="e.g. https://www.example.com"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 placeholder:text-slate-400"
                />

                <p className="text-[11px] text-slate-500 mt-1">
                  Destination web address, such as https://example.com.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!linkUrl.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LinkIcon size={14} />
                  Apply Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="insert-image-title"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-slate-800 font-semibold text-sm">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <ImageIcon size={16} />
                </div>

                <div>
                  <h2
                    id="insert-image-title"
                    className="text-sm font-bold text-slate-900 leading-tight"
                  >
                    Insert Image
                  </h2>
                  <p className="text-[11px] font-normal text-slate-500">
                    Upload or provide an image URL
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                aria-label="Close image dialog"
                className="p-1.5 hover:bg-slate-200/80 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-6">
              <div className="space-y-3">
                <p className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Option 1: Upload Image
                </p>

                <label className="relative group block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      void handleImageUpload(event)
                    }}
                    disabled={isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                  />

                  <span className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-50 transition-all group-hover:border-blue-300 group-hover:bg-blue-50">
                    {isUploading ? (
                      <span className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-blue-500 animate-spin">
                        <RefreshCw size={20} />
                      </span>
                    ) : (
                      <span className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition-all">
                        <Plus size={20} />
                      </span>
                    )}

                    <span className="text-center">
                      <span className="block text-xs font-bold text-slate-700">
                        {isUploading
                          ? 'Uploading to server...'
                          : 'Click or drag an image to upload'}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-1">
                        PNG, JPG, or GIF up to 2 MB
                      </span>
                    </span>
                  </span>
                </label>
              </div>

              <div className="relative flex items-center justify-center py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <span className="relative px-3 bg-white text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Or
                </span>
              </div>

              <div className="space-y-3">
                <label
                  htmlFor="image-url"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Option 2: Image URL
                </label>

                <div className="flex gap-2">
                  <input
                    id="image-url"
                    type="url"
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800"
                  />

                  <button
                    type="button"
                    onClick={() => handleInsertImage(imageUrl)}
                    className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
                  >
                    Insert
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#EDF2FA] border-b border-slate-200/80 p-2 sm:px-3 sm:py-2 flex items-center justify-start gap-1 flex-wrap text-slate-700 text-xs shadow-xs select-none">
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            setShowSearchBar((isOpen) => !isOpen)
          }}
          aria-label="Search document"
          className={`p-1.5 rounded-lg text-slate-700 transition-colors cursor-pointer ${
            showSearchBar
              ? 'bg-[#D3E3FD] text-[#041E49] font-bold'
              : 'hover:bg-slate-200/80'
          }`}
          title="Search in document (Ctrl+F)"
        >
          <Search size={15} />
        </button>

        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            handleUndo()
          }}
          aria-label="Undo"
          className="p-1.5 hover:bg-slate-200/80 rounded-lg text-slate-700 transition-colors cursor-pointer"
          title="Undo (Ctrl+Z)"
        >
          <RotateCcw size={15} />
        </button>

        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            handleRedo()
          }}
          aria-label="Redo"
          className="p-1.5 hover:bg-slate-200/80 rounded-lg text-slate-700 transition-colors cursor-pointer"
          title="Redo (Ctrl+Y)"
        >
          <RotateCw size={15} />
        </button>

        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            handlePrint()
          }}
          aria-label="Print document"
          className="p-1.5 hover:bg-slate-200/80 rounded-lg text-slate-700 transition-colors cursor-pointer"
          title="Print document (Ctrl+P)"
        >
          <Printer size={15} />
        </button>

        <select
          value={zoom}
          onChange={(event) => setZoom(event.target.value)}
          aria-label="Document zoom"
          className="bg-transparent hover:bg-slate-200/80 px-2 py-1 rounded-lg font-medium text-xs text-slate-700 border-0 outline-none cursor-pointer"
        >
          <option value="50%">50%</option>
          <option value="75%">75%</option>
          <option value="100%">100%</option>
          <option value="125%">125%</option>
          <option value="150%">150%</option>
        </select>

        <div className="w-px h-4 bg-slate-300 mx-0.5 shrink-0" />

        <select
          value={textStyle}
          onChange={(event) => handleStyleChange(event.target.value)}
          aria-label="Text style"
          className="bg-transparent hover:bg-slate-200/80 px-2 py-1 rounded-lg font-medium text-xs text-slate-700 border-0 outline-none cursor-pointer"
        >
          <option value="Normal text">Normal text</option>
          <option value="Title">Title</option>
          <option value="Subtitle">Subtitle</option>
          <option value="Heading 1">Heading 1</option>
          <option value="Heading 2">Heading 2</option>
          <option value="Heading 3">Heading 3</option>
        </select>

        <div className="w-px h-4 bg-slate-300 mx-0.5 shrink-0" />

        <select
          value={fontFamily}
          onChange={(event) => handleFontFamilyChange(event.target.value)}
          aria-label="Font family"
          className="bg-transparent hover:bg-slate-200/80 px-2 py-1 rounded-lg font-medium text-xs text-slate-700 border-0 outline-none cursor-pointer"
        >
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Inter">Inter</option>
          <option value="Roboto">Roboto</option>
          <option value="Playfair Display">Playfair Display</option>
        </select>

        <div className="w-px h-4 bg-slate-300 mx-0.5 shrink-0" />

        <div className="flex items-center gap-0.5 bg-slate-200/50 rounded-lg px-1 shrink-0">
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault()
              handleFontSizeChange(fontSize - 1)
            }}
            aria-label="Decrease font size"
            className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
            title="Decrease font size"
          >
            <Minus size={13} />
          </button>

          <input
            type="number"
            value={fontSize}
            onChange={(event) =>
              handleFontSizeChange(Number(event.target.value) || 14)
            }
            aria-label="Font size"
            className="w-8 text-center bg-transparent text-xs font-bold text-slate-800 outline-none border-0 p-0"
          />

          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault()
              handleFontSizeChange(fontSize + 1)
            }}
            aria-label="Increase font size"
            className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
            title="Increase font size"
          >
            <Plus size={13} />
          </button>
        </div>

        <div className="w-px h-4 bg-slate-300 mx-0.5 shrink-0" />

        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            handleBold()
          }}
          aria-label="Bold"
          aria-pressed={isBold}
          className={`p-1.5 rounded-lg font-black text-xs transition-colors cursor-pointer flex items-center justify-center ${
            isBold
              ? 'bg-[#D3E3FD] text-[#041E49]'
              : 'hover:bg-slate-200/80 text-slate-700'
          }`}
          title="Bold selection (Ctrl+B)"
        >
          <Bold size={15} />
        </button>

        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            handleItalic()
          }}
          aria-label="Italic"
          aria-pressed={isItalic}
          className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center ${
            isItalic
              ? 'bg-[#D3E3FD] text-[#041E49]'
              : 'hover:bg-slate-200/80 text-slate-700'
          }`}
          title="Italic selection (Ctrl+I)"
        >
          <Italic size={15} />
        </button>

        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            handleUnderline()
          }}
          aria-label="Underline"
          aria-pressed={isUnderline}
          className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center ${
            isUnderline
              ? 'bg-[#D3E3FD] text-[#041E49]'
              : 'hover:bg-slate-200/80 text-slate-700'
          }`}
          title="Underline selection (Ctrl+U)"
        >
          <Underline size={15} />
        </button>

        <div className="relative shrink-0">
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault()
              setShowColorPicker((isOpen) => !isOpen)
            }}
            aria-label="Text color"
            className="p-1.5 hover:bg-slate-200/80 rounded-lg text-slate-700 transition-colors cursor-pointer flex flex-col items-center justify-center"
          >
            <span className="font-bold text-xs leading-none">A</span>
            <span
              className="w-3 h-0.5 rounded-full mt-0.5"
              style={{ backgroundColor: textColor }}
            />
          </button>

          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl p-2 shadow-xl z-20 grid grid-cols-5 gap-1.5 w-36">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    handleTextColor(color)
                  }}
                  aria-label={`Set text color to ${color}`}
                  className="w-5 h-5 rounded-full border border-slate-300 hover:scale-110 transition-transform cursor-pointer"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault()
              setShowHighlightPicker((isOpen) => !isOpen)
            }}
            aria-label="Highlight color"
            className="p-1.5 hover:bg-slate-200/80 rounded-lg text-slate-700 transition-colors cursor-pointer"
          >
            <Highlighter size={15} />
          </button>

          {showHighlightPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl p-2 shadow-xl z-20 grid grid-cols-5 gap-1.5 w-36">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    handleHighlightColor(color)
                  }}
                  aria-label={
                    color === 'transparent'
                      ? 'Remove highlight'
                      : `Set highlight color to ${color}`
                  }
                  className="w-5 h-5 rounded-full border border-slate-300 hover:scale-110 transition-transform cursor-pointer flex items-center justify-center"
                  style={{
                    backgroundColor:
                      color === 'transparent' ? '#ffffff' : color,
                  }}
                >
                  {color === 'transparent' && (
                    <span className="text-[10px] text-slate-400">X</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-slate-300 mx-0.5 shrink-0" />

        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            handleAlign('left')
          }}
          aria-label="Align left"
          aria-pressed={alignment === 'left'}
          className={`p-1.5 rounded-lg cursor-pointer ${
            alignment === 'left' ? 'bg-[#D3E3FD]' : 'hover:bg-slate-200/80'
          }`}
        >
          <AlignLeft size={15} />
        </button>

        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            handleAlign('center')
          }}
          aria-label="Align center"
          aria-pressed={alignment === 'center'}
          className={`p-1.5 rounded-lg cursor-pointer ${
            alignment === 'center' ? 'bg-[#D3E3FD]' : 'hover:bg-slate-200/80'
          }`}
        >
          <AlignCenter size={15} />
        </button>

        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            handleAlign('right')
          }}
          aria-label="Align right"
          aria-pressed={alignment === 'right'}
          className={`p-1.5 rounded-lg cursor-pointer ${
            alignment === 'right' ? 'bg-[#D3E3FD]' : 'hover:bg-slate-200/80'
          }`}
        >
          <AlignRight size={15} />
        </button>

        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            handleAlign('justify')
          }}
          aria-label="Justify text"
          aria-pressed={alignment === 'justify'}
          className={`p-1.5 rounded-lg cursor-pointer ${
            alignment === 'justify'
              ? 'bg-[#D3E3FD]'
              : 'hover:bg-slate-200/80'
          }`}
        >
          <AlignJustify size={15} />
        </button>

        <div className="w-px h-4 bg-slate-300 mx-0.5 shrink-0" />

        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            executeCommand('indent')
          }}
          aria-label="Increase indent"
          className="p-1.5 hover:bg-slate-200/80 rounded-lg text-slate-700 cursor-pointer"
        >
          <Indent size={15} />
        </button>

        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            executeCommand('outdent')
          }}
          aria-label="Decrease indent"
          className="p-1.5 hover:bg-slate-200/80 rounded-lg text-slate-700 cursor-pointer"
        >
          <Outdent size={15} />
        </button>

        <div className="w-px h-4 bg-slate-300 mx-0.5 shrink-0" />

        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            handleBulletedList()
          }}
          aria-label="Create bulleted list"
          className="p-1.5 hover:bg-slate-200/80 rounded-lg text-slate-700 cursor-pointer"
        >
          <List size={15} />
        </button>

        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            handleNumberedList()
          }}
          aria-label="Create numbered list"
          className="p-1.5 hover:bg-slate-200/80 rounded-lg text-slate-700 cursor-pointer"
        >
          <ListOrdered size={15} />
        </button>

        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            handleBlockquote()
          }}
          aria-label="Create block quote"
          className="p-1.5 hover:bg-slate-200/80 rounded-lg text-slate-700 cursor-pointer"
        >
          <Quote size={15} />
        </button>

        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            handleOpenLinkModal()
          }}
          aria-label="Insert link"
          className={`p-1.5 rounded-lg text-slate-700 transition-colors cursor-pointer ${
            showLinkModal
              ? 'bg-[#D3E3FD] text-[#041E49] font-bold'
              : 'hover:bg-slate-200/80'
          }`}
        >
          <LinkIcon size={15} />
        </button>

        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            executeCommand('removeFormat')
          }}
          aria-label="Clear formatting"
          className="p-1.5 hover:bg-slate-200/80 rounded-lg text-slate-700 cursor-pointer"
        >
          <Eraser size={15} />
        </button>

        <div className="w-px h-4 bg-slate-300 mx-1 shrink-0" />

        <div className="relative" ref={insertMenuRef}>
          <button
            type="button"
            onClick={() => {
              const selection = window.getSelection()

              if (selection && selection.rangeCount > 0) {
                savedRangeRef.current = selection.getRangeAt(0).cloneRange()
              }

              setShowInsertMenu((isOpen) => !isOpen)
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              showInsertMenu
                ? 'bg-white shadow-sm ring-1 ring-slate-200'
                : 'hover:bg-slate-200/80 text-slate-600'
            }`}
          >
            Insert
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${
                showInsertMenu ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showInsertMenu && (
            <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 min-w-[220px] z-30">
              <button
                type="button"
                onClick={() => {
                  setShowInsertMenu(false)
                  setShowImageModal(true)
                }}
                className="w-full flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-xl transition-all group"
              >
                <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-all">
                  <ImageIcon size={16} />
                </span>

                <span className="text-left">
                  <span className="block text-xs font-bold text-slate-800">
                    Image
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    Upload or URL
                  </span>
                </span>
              </button>

              <div className="h-px bg-slate-100 my-1" />

              <label className="relative overflow-hidden group block">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={(event) => {
                    void handleFileUpload(event)
                    setShowInsertMenu(false)
                  }}
                  disabled={isUploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                />

                <span className="w-full flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-xl transition-all">
                  <span className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-all">
                    <FileIcon size={16} />
                  </span>

                  <span className="text-left">
                    <span className="block text-xs font-bold text-slate-800">
                      File Attachment
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      PDF, DOC, XLS up to 10 MB
                    </span>
                  </span>
                </span>
              </label>

              <div className="h-px bg-slate-100 my-1" />

              <div className="p-2.5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <TableIcon size={16} />
                  </span>

                  <span>
                    <span className="block text-xs font-bold text-slate-800">
                      Table
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      Choose size
                    </span>
                  </span>
                </div>

                <div className="grid grid-cols-10 gap-1 p-1 bg-slate-50 rounded-lg border border-slate-100">
                  {Array.from({ length: 10 }, (_, rowIndex) =>
                    Array.from({ length: 10 }, (_, columnIndex) => {
                      const row = rowIndex + 1
                      const column = columnIndex + 1
                      const isSelected =
                        row <= tableGrid.rows && column <= tableGrid.cols

                      return (
                        <button
                          key={`${rowIndex}-${columnIndex}`}
                          type="button"
                          onMouseEnter={() =>
                            setTableGrid({
                              rows: row,
                              cols: column,
                            })
                          }
                          onClick={() => handleInsertTable(row, column)}
                          aria-label={`Insert ${row} by ${column} table`}
                          className={`w-3.5 h-3.5 rounded-xs border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-500 border-blue-600'
                              : 'bg-white border-slate-200 hover:border-blue-300'
                          }`}
                        />
                      )
                    }),
                  )}
                </div>

                <p className="mt-2 text-center text-[10px] font-black text-blue-600 bg-blue-50 py-1 rounded-md">
                  {tableGrid.rows} × {tableGrid.cols} Table
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#E9EEF6] border-b border-slate-200/80 py-1 px-4 overflow-x-auto select-none">
        <div className="max-w-[760px] mx-auto flex items-center justify-between text-[9px] font-mono font-medium text-slate-500 relative h-4">
          <span className="absolute left-0 top-0 text-blue-600 cursor-ew-resize font-bold">
            ▼
          </span>

          <div className="flex items-center justify-between w-full px-4">
            {Array.from({ length: 16 }, (_, index) => (
              <span key={index}>
                {index + 1}
                {index < 15 ? ' .' : ''}
              </span>
            ))}
          </div>

          <span className="absolute right-0 top-0 text-blue-600 cursor-ew-resize font-bold">
            ▼
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-8 bg-[#F8F9FA] overflow-x-auto min-h-[520px] flex justify-center">
        <div className="w-full max-w-[800px] bg-white border border-slate-200/80 rounded-sm shadow-md min-h-[580px] p-8 sm:p-12 relative flex flex-col transition-all">
          <div
            className="origin-top-left"
            style={{
              transform: `scale(${zoomScale})`,
              width: `${100 / zoomScale}%`,
              minHeight: `${480 / zoomScale}px`,
            }}
          >
            <div
              ref={editorRef}
              contentEditable
              spellCheck
              suppressContentEditableWarning
              data-placeholder={placeholder}
              onInput={handleInput}
              onClick={handleEditorClick}
              onContextMenu={handleContextMenu}
              onKeyDown={handleKeyDown}
              onKeyUp={updateSelectionState}
              onMouseUp={updateSelectionState}
              className="editor-content w-full min-h-[480px] outline-none leading-relaxed text-slate-900 font-sans text-sm focus:ring-0 empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-2 [&_li]:my-1 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-3 [&_blockquote]:text-slate-600 [&_a]:text-blue-600 [&_a]:underline relative"
            />
          </div>

          {selectedImage && imageRect && (
            <div
              className="image-selection-overlay"
              style={{
                top: imageRect.top,
                left: imageRect.left,
                width: imageRect.width,
                height: imageRect.height,
                transform: selectedImage.style.transform,
              }}
            >
              {IMAGE_HANDLES.map((handle) => (
                <div
                  key={handle.type}
                  className="image-handle"
                  data-type={handle.type}
                  style={{
                    cursor: handle.cursor,
                    top: handle.top,
                    left: handle.left,
                    right: handle.right,
                    bottom: handle.bottom,
                  }}
                />
              ))}

              <div className="rotation-line" />

              <div className="rotation-handle" data-type="rotate">
                <RefreshCw size={12} className="text-blue-600" />
              </div>

              <div className="absolute -bottom-11 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-xl shadow-2xl py-1.5 px-2 flex items-center gap-1.5 border border-slate-700/50 min-w-max">
                {[
                  { id: 'inline' as const, icon: AlignLeft, label: 'In line' },
                  { id: 'wrap' as const, icon: Layout, label: 'Wrap' },
                  { id: 'break' as const, icon: Square, label: 'Break' },
                  { id: 'behind' as const, icon: Move, label: 'Behind' },
                  { id: 'front' as const, icon: Type, label: 'Front' },
                ].map((option) => {
                  const Icon = option.icon
                  const isActive =
                    getCurrentImageWrapping(selectedImage) === option.id

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                      }}
                      onClick={(event) => {
                        event.stopPropagation()
                        handleApplyWrapping(option.id)
                      }}
                      aria-label={option.label}
                      className={`p-1.5 rounded-lg transition-all hover:bg-slate-800 flex flex-col items-center gap-1 group ${
                        isActive
                          ? 'text-blue-400 bg-slate-800 ring-1 ring-blue-500/50'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Icon
                        size={14}
                        className={
                          isActive ? 'text-blue-400' : 'group-hover:text-white'
                        }
                      />
                      <span
                        className={`text-[8px] font-black uppercase tracking-tighter ${
                          isActive ? 'text-blue-400' : 'text-slate-500'
                        }`}
                      >
                        {option.id}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-medium text-slate-400 select-none">
            <span>Page 1 of 1</span>
            <span className="italic">Google Docs Style Editor</span>
          </div>
        </div>
      </div>

      <footer className="bg-[#EDF2FA] border-t border-slate-200/80 px-4 py-2 flex flex-wrap items-center justify-between text-[11px] font-medium text-slate-600 gap-2 select-none">
        <div className="flex items-center gap-4">
          <span>
            <strong>{wordCount}</strong> words
          </span>
          <span>
            <strong>{characterCount}</strong> characters
          </span>
          <span>
            ~<strong>{readingTime}</strong> min read
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-500 text-[10px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Document saved</span>
        </div>
      </footer>

      {contextMenu && (
        <ImageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          currentType={contextMenu.currentType}
          onClose={() => setContextMenu(null)}
          onSelect={handleApplyWrapping}
        />
      )}
    </section>
  )
}

export default GoogleDocsEditor