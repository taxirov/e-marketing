import React from 'react'
import { AbsoluteFill, Audio, Img, Sequence, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'

const overlayStyle = { position: 'absolute', left: 0, right: 0, bottom: 120, padding: '0 64px', color: '#fff', textShadow: '0 4px 12px rgba(0,0,0,0.6)', fontFamily: 'Inter, Arial, sans-serif' }
const titleStyle = { position: 'absolute', top: 120, left: 0, right: 0, padding: '0 64px', color: '#fff', fontSize: 72, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center', textShadow: '0 6px 16px rgba(0,0,0,0.55)' }
const subtitleStyle = { marginTop: 18, fontSize: 36, fontWeight: 500, textAlign: 'center' }
const captionBoxStyle = { display: 'inline-block', padding: '18px 28px', borderRadius: 18, background: 'rgba(0,0,0,0.55)', fontSize: 38, fontWeight: 500, lineHeight: 1.4 }
const imageStyle = { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 32, boxShadow: '0 20px 45px rgba(0,0,0,0.35)' }
const slideContainerStyle = { position: 'absolute', inset: 160, borderRadius: 32, overflow: 'hidden' }

export function PropertyVideo({ audioSrc, backgroundSrc, slides = [], captions = [], title = '', subtitle = '' }) {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()

  const safeSlides = Array.isArray(slides) && slides.length ? slides : [{ src: backgroundSrc }]
  const slideDuration = Math.max(1, Math.floor(durationInFrames / safeSlides.length))
  const activeCaption = captions.find((c) => frame >= c.startFrame && frame <= c.endFrame)

  return (
    <AbsoluteFill style={{ backgroundColor: '#0f172a' }}>
      {backgroundSrc && <Img src={backgroundSrc} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35 }} />}
      <AbsoluteFill style={slideContainerStyle}>
        {safeSlides.map((s, i) => {
          const from = i * slideDuration
          const dur = i === safeSlides.length - 1 ? Math.max(1, durationInFrames - from) : slideDuration
          const local = frame - from
          const opacity = interpolate(local, [0, 20, dur - 20, dur], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
          return (
            <Sequence key={i} from={from} durationInFrames={dur}>
              <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
                {s?.src && <Img src={s.src} style={{ ...imageStyle, opacity }} />}
              </AbsoluteFill>
            </Sequence>
          )
        })}
      </AbsoluteFill>

      {(title || subtitle) && (
        <div style={titleStyle}>
          {title && <div>{title}</div>}
          {subtitle && <div style={subtitleStyle}>{subtitle}</div>}
        </div>
      )}

      {activeCaption && (
        <div style={overlayStyle}>
          <div style={captionBoxStyle}>{activeCaption.text}</div>
        </div>
      )}

      {audioSrc && <Audio src={audioSrc} />}
    </AbsoluteFill>
  )
}

