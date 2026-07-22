import React, { createContext, useContext, useEffect, useRef } from 'react'
import { BlockNode, parseFrame } from './types'

// Fill flags flow to block Display components so their VISUAL element (button
// pill, hero panel, image, …) stretches to the grid container — making the
// container's resize handles resize the element itself.
export interface FrameFill {
  fillW: boolean
  fillH: boolean
  fillText: boolean
}

export const BlockFrameContext = createContext<FrameFill>({ fillW: false, fillH: false, fillText: false })

export const useBlockFrame = () => useContext(BlockFrameContext)

const JUSTIFY: Record<string, string> = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'flex-start' }
const ALIGN: Record<string, string> = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' }

// Positions a block's content inside its grid container per the block's
// `_frame` config: alignment (incl. fill), and inner padding. Used by both
// the public grid renderer and the editor canvas for exact parity.
export const FrameBox: React.FC<{ block: BlockNode; children: React.ReactNode }> = ({ block, children }) => {
  const frame = parseFrame(block)
  const fillW = frame.hAlign === 'stretch'
  const fillH = frame.vAlign === 'stretch'
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        justifyContent: JUSTIFY[frame.hAlign] || 'flex-start',
        alignItems: ALIGN[frame.vAlign] || 'flex-start',
        padding: frame.padding,
        boxSizing: 'border-box',
        minWidth: 0,
      }}
    >
      <BlockFrameContext.Provider value={{ fillW, fillH, fillText: !!frame.fillText }}>
        <div
          style={{
            width: fillW ? '100%' : undefined,
            height: fillH ? '100%' : undefined,
            maxWidth: '100%',
            minWidth: 0,
            minHeight: 0,
          }}
        >
          {children}
        </div>
      </BlockFrameContext.Provider>
    </div>
  )
}

// Scales its content (via CSS zoom, which reflows) so the text fills the
// container. Renders at natural size on the server; fits on the client and
// re-fits when the container resizes.
export const FitText: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    const fit = () => {
      const availH = outer.clientHeight
      if (!availH) return
      // Fit by HEIGHT and let the width take care of itself: text always
      // spans the container width, and zooming reflows the wrapping, so we
      // iterate zoom until the (visual) content height matches the box.
      let zoom = 1
      ;(inner.style as any).zoom = '1'
      for (let i = 0; i < 6; i++) {
        const rectH = inner.getBoundingClientRect().height
        if (!rectH) break
        const next = Math.max(0.2, Math.min(zoom * (availH / rectH), 10))
        if (Math.abs(next - zoom) < 0.02) break
        zoom = next
        ;(inner.style as any).zoom = String(zoom)
      }
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(outer)
    return () => ro.disconnect()
  })

  return (
    <div ref={outerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <div ref={innerRef}>{children}</div>
    </div>
  )
}
