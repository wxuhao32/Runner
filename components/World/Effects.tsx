/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 900;
};

export const Effects: React.FC = () => {
  const mobile = useMemo(() => isMobileDevice(), []);

  return (
    <EffectComposer disableNormalPass multisampling={0}>
      <Bloom
        luminanceThreshold={mobile ? 0.78 : 0.75}
        mipmapBlur
        intensity={mobile ? 0.65 : 1.0}
        radius={mobile ? 0.45 : 0.6}
        levels={mobile ? 5 : 8}
      />
      <Noise opacity={mobile ? 0.03 : 0.05} blendFunction={BlendFunction.OVERLAY} />
      <Vignette eskil={false} offset={0.1} darkness={mobile ? 0.42 : 0.5} />
    </EffectComposer>
  );
};
