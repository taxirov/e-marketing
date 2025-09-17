import React from 'react'
import { Composition } from 'remotion'
import { PropertyVideo } from './VideoComposition'

const FPS = 30
const MIN = FPS * 6

export const RemotionVideoRoot = () => (
  <Composition
    id="property-video"
    component={PropertyVideo}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={MIN}
    defaultProps={{ audioSrc: null, backgroundSrc: null, slides: [], captions: [], title: '', subtitle: '', durationInFrames: MIN }}
    calculateMetadata={({ props }) => {
      const req = Number.isFinite(props?.durationInFrames) && props.durationInFrames > 0 ? props.durationInFrames : MIN
      return { durationInFrames: Math.max(MIN, Math.ceil(req)) }
    }}
  />
)

