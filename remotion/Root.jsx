import React from 'react'
import { Composition } from 'remotion'
import { PropertyVideo } from './VideoComposition'

const FPS = 30
const MIN_DURATION = FPS * 6

export const RemotionVideoRoot = () => (
  <Composition
    id="property-video"
    component={PropertyVideo}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={MIN_DURATION}
    defaultProps={{
      audioSrc: null,
      backgroundSrc: null,
      slides: [],
      captions: [],
      title: '',
      subtitle: '',
      durationInFrames: MIN_DURATION,
    }}
    calculateMetadata={({ props }) => {
      const requested = Number.isFinite(props?.durationInFrames) && props.durationInFrames > 0
        ? props.durationInFrames
        : MIN_DURATION
      const duration = Math.max(MIN_DURATION, Math.ceil(requested))
      return {
        durationInFrames: duration,
      }
    }}
  />
)
