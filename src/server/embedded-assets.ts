import index_js from "../../dist/web/index.js" with { type: "file" };
import poppins_400_woff2 from "../../dist/web/fonts/poppins-400.woff2" with { type: "file" };
import poppins_500_woff2 from "../../dist/web/fonts/poppins-500.woff2" with { type: "file" };
import poppins_600_woff2 from "../../dist/web/fonts/poppins-600.woff2" with { type: "file" };
import poppins_700_woff2 from "../../dist/web/fonts/poppins-700.woff2" with { type: "file" };
import ibm_plex_mono_400_woff2 from "../../dist/web/fonts/ibm-plex-mono-400.woff2" with { type: "file" };
import ibm_plex_mono_500_woff2 from "../../dist/web/fonts/ibm-plex-mono-500.woff2" with { type: "file" };
import ibm_plex_mono_700_woff2 from "../../dist/web/fonts/ibm-plex-mono-700.woff2" with { type: "file" };
import icon_svg from "../../icon.svg" with { type: "file" };

export const embeddedAssets: Record<string, string> = {
  "/index.js": index_js,
  "/fonts/poppins-400.woff2": poppins_400_woff2,
  "/fonts/poppins-500.woff2": poppins_500_woff2,
  "/fonts/poppins-600.woff2": poppins_600_woff2,
  "/fonts/poppins-700.woff2": poppins_700_woff2,
  "/fonts/ibm-plex-mono-400.woff2": ibm_plex_mono_400_woff2,
  "/fonts/ibm-plex-mono-500.woff2": ibm_plex_mono_500_woff2,
  "/fonts/ibm-plex-mono-700.woff2": ibm_plex_mono_700_woff2,
  "/icon.svg": icon_svg,
};
