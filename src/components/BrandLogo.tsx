import { useEffect, useState } from "react";
import lightPurpleLogo from "@/assets/mood-mirror-logo-light-purple.png.asset.json";
import darkPurpleLogo from "@/assets/mood-mirror-logo-dark-purple.png.asset.json";

/** Returns the logo URL matching the active theme (dark mode → light purple logo). */
export function useThemedLogo() {
  const isLight = () =>
    typeof document !== "undefined" && document.documentElement.classList.contains("light");
  const [light, setLight] = useState(isLight);

  useEffect(() => {
    const obs = new MutationObserver(() => setLight(isLight()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    setLight(isLight());
    return () => obs.disconnect();
  }, []);

  return light ? darkPurpleLogo.url : lightPurpleLogo.url;
}

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  alt?: string;
}

export const BrandLogo = ({ alt = "Mood Mirror", ...rest }: Props) => {
  const src = useThemedLogo();
  return <img src={src} alt={alt} {...rest} />;
};
