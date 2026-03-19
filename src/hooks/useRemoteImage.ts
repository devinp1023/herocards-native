// useRemoteImage — kept for potential future use.
// HeroCard currently uses a React Native Image overlay instead of this hook
// because Skia's Image component can't render JSI host objects via the static
// PictureRecorder path in Expo Go (Skia 2.4.18).

import { useState, useEffect } from 'react';
import { Skia } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';

export function useRemoteImage(url: string | null | undefined): SkImage | null {
  const [image, setImage] = useState<SkImage | null>(null);

  useEffect(() => {
    if (!url) { setImage(null); return; }
    let active = true;
    fetch(url)
      .then(r => r.arrayBuffer())
      .then(buf => {
        if (!active) return;
        const bytes = new Uint8Array(buf);
        const skData = Skia.Data.fromBytes(bytes);
        const skImage = Skia.Image.MakeImageFromEncoded(skData);
        setImage(skImage);
      })
      .catch(() => { if (active) setImage(null); });
    return () => { active = false; };
  }, [url]);

  return image;
}
