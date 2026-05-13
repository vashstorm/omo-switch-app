declare module "*dist/web/index.js" {
  const assetPath: string;
  export default assetPath;
}

declare module "*dist/web/*.js" {
  const assetPath: string;
  export default assetPath;
}

declare module "*.svg" {
  const assetPath: string;
  export default assetPath;
}

declare module "*.woff2" {
  const assetPath: string;
  export default assetPath;
}
